"""Normalización: JSON de Holded (ya validado) -> modelo de dominio."""

from __future__ import annotations

from datetime import date, datetime, timezone

from tracker.client.holded import RawBundle
from tracker.pipeline.models import (
    Contact,
    Dataset,
    DocKind,
    Document,
    Line,
    Payment,
    PayStatus,
    TreasuryAccount,
)
from tracker.pipeline.schemas import HoldedDocument, HoldedProduct

EPS = 0.01


def ts_to_date(ts: int | None) -> date | None:
    if ts is None or ts == 0:
        return None
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).date()


def normalize_tag(tag: str) -> str:
    """`[Skyla]`, `#skyla`, ` skyla ` -> `skyla`."""
    return tag.strip().strip("[]#").strip().lower()


def _line(index: int, p: HoldedProduct) -> Line:
    gross = p.price * p.units
    base = round(gross * (1 - (p.discount or 0) / 100), 2)
    return Line(
        index=index,
        name=p.name,
        desc=p.desc,
        tags=tuple(normalize_tag(t) for t in p.tags if t),
        base=base,
        vat=round(base * (p.tax or 0) / 100, 2),
        retention=round(base * (p.retention or 0) / 100, 2),
    )


def derive_status(raw: HoldedDocument, total: float, paid: float, due: date | None, as_of: date) -> PayStatus:
    if raw.status == 3:
        return PayStatus.CANCELLED
    pending = total - paid
    if raw.status == 1 or (total > 0 and pending <= EPS):
        return PayStatus.PAID
    if due and due < as_of:
        return PayStatus.OVERDUE
    if raw.status == 2 or paid > EPS:
        return PayStatus.PARTIAL
    return PayStatus.PENDING


def normalize_document(raw: HoldedDocument, kind: DocKind, as_of: date) -> Document:
    lines = tuple(_line(i, p) for i, p in enumerate(raw.products))
    subtotal = round(sum(l.base for l in lines), 2)
    vat = round(sum(l.vat for l in lines), 2)
    retention = round(sum(l.retention for l in lines), 2)
    total = raw.total if raw.total is not None else round(subtotal + vat - retention, 2)
    paid = raw.paymentsTotal or 0.0
    if raw.paymentsPending is not None and raw.paymentsTotal is None:
        paid = total - raw.paymentsPending
    issue = ts_to_date(raw.date) or as_of
    due = ts_to_date(raw.dueDate)
    status = derive_status(raw, total, paid, due, as_of)
    pending = 0.0 if status in (PayStatus.PAID, PayStatus.CANCELLED) else round(total - paid, 2)
    return Document(
        id=raw.id,
        kind=kind,
        number=raw.docNumber or raw.id[-6:],
        contact_id=raw.contact,
        contact_name=raw.contactName or "—",
        description=raw.desc or (lines[0].name if lines else ""),
        issue_date=issue,
        due_date=due,
        tags=tuple(normalize_tag(t) for t in raw.tags if t),
        lines=lines,
        subtotal=subtotal,
        vat=vat,
        retention=retention,
        total=round(total, 2),
        paid=round(paid, 2),
        pending=pending,
        status=status,
        is_draft=bool(raw.draft),
        currency=(raw.currency or "eur").upper(),
    )


def normalize(bundle: RawBundle, company: str | None = None) -> Dataset:
    as_of = bundle.as_of
    documents = [normalize_document(d, DocKind.INCOME, as_of) for d in bundle.invoices]
    documents += [normalize_document(d, DocKind.EXPENSE, as_of) for d in bundle.purchases]
    payments = [
        Payment(
            id=p.id,
            date=ts_to_date(p.date) or as_of,
            amount=round(p.signed_amount(), 2),
            description=p.desc or "",
            contact_id=p.contactId,
            contact_name=p.contactName or "",
            account_id=p.bankId,
            document_id=p.documentId,
        )
        for p in bundle.payments
    ]
    contacts = {
        c.id: Contact(
            id=c.id,
            name=c.name,
            tax_id=c.code,
            kind=c.type,
            tags=tuple(normalize_tag(t) for t in c.tags),
        )
        for c in bundle.contacts
    }
    accounts = [TreasuryAccount(id=a.id, name=a.name, balance=a.balance, kind=a.type) for a in bundle.treasury]
    return Dataset(
        documents=sorted(documents, key=lambda d: d.issue_date),
        payments=sorted(payments, key=lambda p: p.date),
        contacts=contacts,
        accounts=accounts,
        as_of=as_of,
        source=bundle.source,
        company=company or bundle.meta.get("company", "Mi empresa"),
        warnings=list(bundle.warnings),
    )
