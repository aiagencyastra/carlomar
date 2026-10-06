"""Schemas Pydantic de las respuestas JSON de Holded.

Se aceptan campos extra (`extra="allow"`) porque Holded devuelve muchos más
de los que el tracker necesita, y se toleran nulos donde la API los manda.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _HoldedModel(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)


def _list_or_empty(value: Any) -> list:
    if value is None or value == "":
        return []
    if isinstance(value, str):
        return [t.strip() for t in value.split(",") if t.strip()]
    return list(value)


class HoldedProduct(_HoldedModel):
    """Línea de documento (`products[]`)."""

    name: str = ""
    desc: str = ""
    price: float = 0.0
    units: float = 1.0
    tax: float = 0.0  # % IVA
    retention: float = 0.0  # % IRPF
    discount: float = 0.0  # % descuento
    tags: list[str] = Field(default_factory=list)
    account: str | None = None

    _norm_tags = field_validator("tags", mode="before")(_list_or_empty)

    @field_validator("name", "desc", mode="before")
    @classmethod
    def _none_to_empty(cls, v: Any) -> str:
        return v or ""


class HoldedDocument(_HoldedModel):
    """Factura de venta (`invoice`) o de compra (`purchase`)."""

    id: str
    contact: str | None = None
    contactName: str | None = None
    desc: str | None = None
    date: int
    dueDate: int | None = None
    docNumber: str | None = None
    tags: list[str] = Field(default_factory=list)
    products: list[HoldedProduct] = Field(default_factory=list)
    subtotal: float | None = None
    tax: float | None = None
    total: float | None = None
    # Holded: 0 = pendiente, 1 = pagado, 2 = pago parcial, 3 = anulado
    status: int = 0
    paymentsTotal: float | None = None
    paymentsPending: float | None = None
    currency: str = "eur"
    draft: bool | int | None = None

    _norm_tags = field_validator("tags", mode="before")(_list_or_empty)

    @field_validator("products", mode="before")
    @classmethod
    def _products(cls, v: Any) -> list:
        return v or []


class HoldedPayment(_HoldedModel):
    """Movimiento de tesorería (cobro/pago). Importe con signo: + entra, - sale."""

    id: str
    date: int
    amount: float
    desc: str | None = None
    contactId: str | None = None
    contactName: str | None = None
    bankId: str | None = None
    documentId: str | None = None
    type: str | None = None

    def signed_amount(self) -> float:
        """Normaliza el signo si Holded lo indica con `type` en vez de con el importe."""
        if self.type and self.type.lower() in {"out", "outgoing", "expense", "payment"}:
            return -abs(self.amount)
        if self.type and self.type.lower() in {"in", "incoming", "income", "collection"}:
            return abs(self.amount)
        return self.amount


class HoldedContact(_HoldedModel):
    id: str
    name: str
    code: str | None = None  # NIF/CIF
    email: str | None = None
    type: str | None = None  # client | supplier | creditor | debtor | lead
    tags: list[str] = Field(default_factory=list)

    _norm_tags = field_validator("tags", mode="before")(_list_or_empty)


class HoldedTreasuryAccount(_HoldedModel):
    id: str
    name: str
    type: str | None = None
    balance: float = 0.0
    iban: str | None = None
