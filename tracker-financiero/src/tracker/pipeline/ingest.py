"""Ingesta: decide la fuente (Holded real o fixture demo) y normaliza.

Orden de decisión:
1. `DEMO_MODE=true`, flag `--mock` o sin `HOLDED_API_KEY` -> fixture local.
2. Modo real -> API de Holded. Si falla (red, 5xx, clave inválida) y
   `HOLDED_STRICT` no está activo, cae al fixture y deja un aviso visible.
"""

from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

from tracker.client.holded import HoldedClient, HoldedError, RawBundle
from tracker.config import Settings
from tracker.pipeline.models import Dataset
from tracker.pipeline.normalize import normalize
from tracker.pipeline.schemas import (
    HoldedContact,
    HoldedDocument,
    HoldedPayment,
    HoldedTreasuryAccount,
)

log = logging.getLogger(__name__)


def _months_back(d: date, months: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 - months, 12)
    return date(y, m + 1, 1)


def load_fixture(path: Path) -> RawBundle:
    if not path.exists():
        from tracker.mock.generator import write_fixture

        log.info("Fixture %s no existe: generándolo", path)
        write_fixture(path)
    data = json.loads(path.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    return RawBundle(
        invoices=[HoldedDocument.model_validate(d) for d in data.get("invoice", [])],
        purchases=[HoldedDocument.model_validate(d) for d in data.get("purchase", [])],
        payments=[HoldedPayment.model_validate(p) for p in data.get("payments", [])],
        contacts=[HoldedContact.model_validate(c) for c in data.get("contacts", [])],
        treasury=[HoldedTreasuryAccount.model_validate(t) for t in data.get("treasury", [])],
        source="demo",
        # En demo la "fecha de hoy" es la del fixture: la demo es reproducible.
        as_of=date.fromisoformat(meta.get("as_of", date.today().isoformat())),
        meta=meta,
    )


def load_raw(settings: Settings, today: date | None = None) -> RawBundle:
    if settings.use_mock:
        bundle = load_fixture(settings.fixture_path)
        bundle.warnings.append(f"Modo demo activo ({settings.mock_reason}): datos sintéticos.")
        return bundle

    today = today or date.today()
    client = HoldedClient(
        settings.api_key or "",
        settings.base_url,
        timeout=settings.timeout,
        max_retries=settings.max_retries,
    )
    try:
        return client.fetch_all(_months_back(today, settings.lookback_months), today)
    except (HoldedError, OSError) as exc:
        if settings.strict:
            raise
        log.exception("Holded no disponible, usando fixture")
        bundle = load_fixture(settings.fixture_path)
        bundle.warnings.append(f"Holded no disponible ({exc}). Mostrando datos demo.")
        return bundle


def load_dataset(settings: Settings, today: date | None = None) -> Dataset:
    return normalize(load_raw(settings, today))
