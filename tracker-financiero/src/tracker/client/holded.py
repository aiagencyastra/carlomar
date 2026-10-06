"""Cliente HTTP tipado para la API de Holded.

- Autenticación con el header `key: {HOLDED_API_KEY}`.
- Reintentos con backoff exponencial ante 429 / 5xx / errores de red,
  respetando `Retry-After` cuando Holded lo envía.
- Limitador de ritmo en cliente (intervalo mínimo entre peticiones).
- Paginación por `?page=N` hasta recibir una página vacía o repetida.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import date, datetime, time as dtime, timezone
from typing import Any, Callable

import requests

from tracker.pipeline.schemas import (
    HoldedContact,
    HoldedDocument,
    HoldedPayment,
    HoldedTreasuryAccount,
)

log = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class HoldedError(Exception):
    """Error genérico de la integración con Holded."""


class HoldedAuthError(HoldedError):
    """Clave inválida o sin permisos (401/403). No se reintenta."""


class HoldedAPIError(HoldedError):
    def __init__(self, status: int, message: str):
        super().__init__(f"Holded respondió {status}: {message}")
        self.status = status


@dataclass(frozen=True)
class Endpoints:
    """Rutas relativas a la base `https://api.holded.com/api`.

    Holded expone pagos y cuentas de tesorería bajo el módulo de facturación
    (`/invoicing/v1/payments`, `/invoicing/v1/treasury`). Si tu cuenta usa otra
    ruta (p.ej. `/treasury/v1/payments`), basta con sobrescribirla aquí.
    """

    sales: str = "/invoicing/v1/documents/invoice"
    purchases: str = "/invoicing/v1/documents/purchase"
    payments: str = "/invoicing/v1/payments"
    treasury: str = "/invoicing/v1/treasury"
    contacts: str = "/invoicing/v1/contacts"


def _to_ts(d: date, end: bool = False) -> int:
    t = dtime(23, 59, 59) if end else dtime(0, 0, 0)
    return int(datetime.combine(d, t, tzinfo=timezone.utc).timestamp())


@dataclass
class RawBundle:
    """Respuesta cruda de Holded (o del fixture), ya validada con Pydantic."""

    invoices: list[HoldedDocument]
    purchases: list[HoldedDocument]
    payments: list[HoldedPayment]
    contacts: list[HoldedContact]
    treasury: list[HoldedTreasuryAccount]
    source: str  # "holded" | "demo"
    as_of: date
    meta: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


class HoldedClient:
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.holded.com/api",
        *,
        timeout: float = 20.0,
        max_retries: int = 5,
        backoff_base: float = 1.0,
        backoff_max: float = 30.0,
        min_interval: float = 0.25,
        max_pages: int = 200,
        endpoints: Endpoints | None = None,
        session: requests.Session | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        if not api_key:
            raise HoldedAuthError("HOLDED_API_KEY vacía")
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.backoff_max = backoff_max
        self.min_interval = min_interval
        self.max_pages = max_pages
        self.endpoints = endpoints or Endpoints()
        self._sleep = sleep
        self._last_request = 0.0
        self.session = session or requests.Session()
        self.session.headers.update({"key": api_key, "Accept": "application/json"})

    # ------------------------------------------------------------------ HTTP
    def _throttle(self) -> None:
        wait = self.min_interval - (time.monotonic() - self._last_request)
        if wait > 0:
            self._sleep(wait)
        self._last_request = time.monotonic()

    def _retry_delay(self, attempt: int, response: requests.Response | None) -> float:
        if response is not None:
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    return min(float(retry_after), self.backoff_max)
                except ValueError:
                    pass
        return min(self.backoff_base * (2**attempt), self.backoff_max)

    def request(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            self._throttle()
            response: requests.Response | None = None
            try:
                response = self.session.get(url, params=params, timeout=self.timeout)
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_error = exc
                log.warning("Holded %s: error de red (%s), intento %d", path, exc, attempt + 1)
            else:
                if response.status_code in (401, 403):
                    raise HoldedAuthError(f"Holded rechazó la clave ({response.status_code})")
                if response.status_code in RETRYABLE_STATUS:
                    last_error = HoldedAPIError(response.status_code, response.text[:200])
                    log.warning("Holded %s: %d, intento %d", path, response.status_code, attempt + 1)
                elif response.status_code >= 400:
                    raise HoldedAPIError(response.status_code, response.text[:200])
                else:
                    try:
                        return response.json()
                    except ValueError as exc:
                        raise HoldedAPIError(response.status_code, "respuesta no es JSON") from exc
            if attempt < self.max_retries:
                self._sleep(self._retry_delay(attempt, response))
        raise HoldedError(f"Holded {path}: agotados {self.max_retries} reintentos") from last_error

    def paginate(self, path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        seen_first: set[str] = set()
        for page in range(1, self.max_pages + 1):
            data = self.request(path, {**(params or {}), "page": page})
            if isinstance(data, dict):  # algunos endpoints devuelven un objeto suelto
                data = [data]
            if not data:
                break
            first = str(data[0].get("id", page))
            if first in seen_first:  # el endpoint ignora `page`: evitamos bucle infinito
                break
            seen_first.add(first)
            items.extend(data)
        return items

    # ------------------------------------------------------------ Endpoints
    def _range(self, start: date | None, end: date | None) -> dict[str, Any]:
        params: dict[str, Any] = {}
        if start:
            params["starttmp"] = _to_ts(start)
        if end:
            params["endtmp"] = _to_ts(end, end=True)
        return params

    def list_sales_invoices(self, start: date | None = None, end: date | None = None) -> list[HoldedDocument]:
        raw = self.paginate(self.endpoints.sales, self._range(start, end))
        return [HoldedDocument.model_validate(r) for r in raw]

    def list_purchases(self, start: date | None = None, end: date | None = None) -> list[HoldedDocument]:
        raw = self.paginate(self.endpoints.purchases, self._range(start, end))
        return [HoldedDocument.model_validate(r) for r in raw]

    def list_payments(self, start: date | None = None, end: date | None = None) -> list[HoldedPayment]:
        raw = self.paginate(self.endpoints.payments, self._range(start, end))
        return [HoldedPayment.model_validate(r) for r in raw]

    def list_contacts(self) -> list[HoldedContact]:
        return [HoldedContact.model_validate(r) for r in self.paginate(self.endpoints.contacts)]

    def list_treasury_accounts(self) -> list[HoldedTreasuryAccount]:
        return [HoldedTreasuryAccount.model_validate(r) for r in self.paginate(self.endpoints.treasury)]

    def fetch_all(self, start: date, end: date) -> RawBundle:
        return RawBundle(
            invoices=self.list_sales_invoices(start, end),
            purchases=self.list_purchases(start, end),
            payments=self.list_payments(start, end),
            contacts=self.list_contacts(),
            treasury=self.list_treasury_accounts(),
            source="holded",
            as_of=end,
        )
