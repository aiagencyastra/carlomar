"""Modelo de dominio normalizado, independiente del formato de Holded."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum


class DocKind(StrEnum):
    INCOME = "income"  # factura de venta
    EXPENSE = "expense"  # factura de compra / gasto


class PayStatus(StrEnum):
    PAID = "paid"
    PARTIAL = "partial"
    PENDING = "pending"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class Line:
    index: int
    name: str
    desc: str
    tags: tuple[str, ...]
    base: float  # base imponible tras descuento
    vat: float  # cuota de IVA
    retention: float  # retención IRPF

    @property
    def text(self) -> str:
        return f"{self.name} {self.desc}".strip()


@dataclass(frozen=True)
class Document:
    id: str
    kind: DocKind
    number: str
    contact_id: str | None
    contact_name: str
    description: str
    issue_date: date
    due_date: date | None
    tags: tuple[str, ...]
    lines: tuple[Line, ...]
    subtotal: float
    vat: float
    retention: float
    total: float
    paid: float
    pending: float
    status: PayStatus
    is_draft: bool
    currency: str = "EUR"

    def overdue_days(self, as_of: date) -> int:
        if self.status in (PayStatus.PAID, PayStatus.CANCELLED) or not self.due_date:
            return 0
        return max((as_of - self.due_date).days, 0)


@dataclass(frozen=True)
class Payment:
    id: str
    date: date
    amount: float  # + cobro, - pago
    description: str
    contact_id: str | None
    contact_name: str
    account_id: str | None
    document_id: str | None


@dataclass(frozen=True)
class Contact:
    id: str
    name: str
    tax_id: str | None
    kind: str | None
    tags: tuple[str, ...]


@dataclass(frozen=True)
class TreasuryAccount:
    id: str
    name: str
    balance: float
    kind: str | None = None


@dataclass
class Dataset:
    documents: list[Document]
    payments: list[Payment]
    contacts: dict[str, Contact]
    accounts: list[TreasuryAccount]
    as_of: date
    source: str  # "demo" | "holded"
    company: str = "Mi empresa"
    warnings: list[str] = field(default_factory=list)

    @property
    def treasury_balance(self) -> float:
        return round(sum(a.balance for a in self.accounts), 2)

    @property
    def documents_by_id(self) -> dict[str, Document]:
        return {d.id: d for d in self.documents}
