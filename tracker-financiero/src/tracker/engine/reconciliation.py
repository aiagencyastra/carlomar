"""Conciliación banco <-> facturas y generación de alertas de auditoría.

Emparejado de cada movimiento de tesorería, por orden de confianza:
  1. Enlace explícito de Holded (`documentId`).
  2. Regla bancaria (nóminas, Seguridad Social, impuestos, comisiones): no
     requieren factura.
  3. Mismo contacto + importe igual al total (o al cobrado parcial) del documento.
  4. Sin contacto: importe exacto + fecha dentro de la ventana, si el candidato es único.
  5. Nada -> "Movimiento sin factura / soporte".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum

from tracker.engine.rules import BankRule, Rules, fold
from tracker.pipeline.models import Dataset, DocKind, Document, Payment, PayStatus

JUSTIFIED = "__justified__"


class MatchMethod(StrEnum):
    LINK = "enlace Holded"
    MANUAL = "conciliado a mano"
    BANK_RULE = "regla bancaria"
    CONTACT_AMOUNT = "contacto + importe"
    AMOUNT_DATE = "importe + fecha"
    JUSTIFIED = "justificado a mano"
    NONE = "sin conciliar"


@dataclass(frozen=True)
class PaymentMatch:
    payment: Payment
    document_id: str | None
    method: MatchMethod
    bank_rule: BankRule | None = None

    @property
    def is_matched(self) -> bool:
        return self.method is not MatchMethod.NONE


@dataclass
class Overrides:
    """Decisiones manuales tomadas desde el panel de conciliación."""

    projects: dict[str, str] = field(default_factory=dict)  # doc_id -> project_id
    payment_links: dict[str, str] = field(default_factory=dict)  # payment_id -> doc_id | JUSTIFIED
    resolved: set[str] = field(default_factory=set)  # ids de alertas cerradas


def _sign_ok(doc: Document, amount: float) -> bool:
    return (doc.kind is DocKind.INCOME) == (amount > 0)


def match_payments(dataset: Dataset, rules: Rules, overrides: Overrides | None = None) -> dict[str, PaymentMatch]:
    overrides = overrides or Overrides()
    docs = {d.id: d for d in dataset.documents if not d.is_draft and d.status is not PayStatus.CANCELLED}
    capacity = {d.id: d.paid for d in docs.values()}  # lo que Holded dice que se ha cobrado/pagado
    tol = rules.amount_tolerance
    result: dict[str, PaymentMatch] = {}

    def consume(p: Payment, doc_id: str, method: MatchMethod) -> None:
        capacity[doc_id] = capacity.get(doc_id, 0.0) - abs(p.amount)
        result[p.id] = PaymentMatch(p, doc_id, method)

    # Pasada 1: manuales y enlaces explícitos (consumen capacidad primero)
    for p in dataset.payments:
        manual = overrides.payment_links.get(p.id)
        if manual == JUSTIFIED:
            result[p.id] = PaymentMatch(p, None, MatchMethod.JUSTIFIED)
        elif manual and manual in docs:
            consume(p, manual, MatchMethod.MANUAL)
        elif p.document_id and p.document_id in docs:
            consume(p, p.document_id, MatchMethod.LINK)

    # Pasada 2: reglas bancarias y heurísticas
    for p in dataset.payments:
        if p.id in result:
            continue
        rule = next((b for b in rules.bank_rules if b.pattern.search(fold(p.description))), None)
        if rule:
            result[p.id] = PaymentMatch(p, None, MatchMethod.BANK_RULE, rule)
            continue

        amount = abs(p.amount)
        candidates = [
            d for d in docs.values()
            if _sign_ok(d, p.amount)
            and capacity[d.id] + tol >= amount
            and d.issue_date <= p.date
            and (abs(d.total - amount) <= tol or abs(d.paid - amount) <= tol)
        ]
        by_contact = [d for d in candidates if p.contact_id and d.contact_id == p.contact_id]
        if by_contact:
            best = min(by_contact, key=lambda d: (p.date - d.issue_date).days)
            consume(p, best.id, MatchMethod.CONTACT_AMOUNT)
            continue
        if not p.contact_id:
            near = [d for d in candidates if (p.date - d.issue_date).days <= rules.date_window_days]
            if len(near) == 1:
                consume(p, near[0].id, MatchMethod.AMOUNT_DATE)
                continue
        result[p.id] = PaymentMatch(p, None, MatchMethod.NONE)
    return result


# ------------------------------------------------------------------ alertas
def _eur(x: float) -> str:
    return f"{x:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"


class Severity(StrEnum):
    CRITICAL = "critical"
    SERIOUS = "serious"
    WARNING = "warning"


SEVERITY_ORDER = {Severity.CRITICAL: 0, Severity.SERIOUS: 1, Severity.WARNING: 2}


@dataclass(frozen=True)
class Alert:
    id: str
    severity: Severity
    category: str
    title: str
    detail: str
    amount: float
    date: date
    project: str | None = None
    doc_id: str | None = None
    payment_id: str | None = None
    action: str = ""  # reclamar | pagar | reasignar | conciliar | validar


def build_alerts(
    dataset: Dataset,
    matches: dict[str, PaymentMatch],
    doc_projects: dict[str, str],
    unassigned_docs: set[str],
    overrides: Overrides | None = None,
) -> list[Alert]:
    overrides = overrides or Overrides()
    as_of = dataset.as_of
    alerts: list[Alert] = []
    matched_docs = {m.document_id for m in matches.values() if m.document_id}

    for d in dataset.documents:
        days = d.overdue_days(as_of)
        if d.status is PayStatus.OVERDUE and d.kind is DocKind.INCOME:
            alerts.append(Alert(
                f"overdue-in:{d.id}", Severity.CRITICAL if days > 30 else Severity.SERIOUS,
                "Cobro vencido", f"{d.number} · {d.contact_name}",
                f"Vencida hace {days} días · pendiente {_eur(d.pending)}",
                d.pending, d.due_date or d.issue_date, doc_projects.get(d.id), d.id, action="reclamar",
            ))
        elif d.status is PayStatus.OVERDUE and d.kind is DocKind.EXPENSE:
            alerts.append(Alert(
                f"overdue-out:{d.id}", Severity.SERIOUS, "Pago vencido", f"{d.number} · {d.contact_name}",
                f"Vencido hace {days} días · pendiente {_eur(d.pending)}",
                d.pending, d.due_date or d.issue_date, doc_projects.get(d.id), d.id, action="pagar",
            ))
        if d.is_draft:
            alerts.append(Alert(
                f"draft:{d.id}", Severity.WARNING, "Partida sin validar", f"{d.number} · {d.contact_name}",
                f"Borrador en Holded: {d.description or 'sin concepto'}",
                d.total, d.issue_date, doc_projects.get(d.id), d.id, action="validar",
            ))
        elif d.id in unassigned_docs:
            alerts.append(Alert(
                f"unassigned:{d.id}", Severity.WARNING, "Sin proyecto asignado", f"{d.number} · {d.contact_name}",
                f"«{d.description or (d.lines[0].name if d.lines else '')}» no encaja en ninguna regla",
                d.subtotal, d.issue_date, None, d.id, action="reasignar",
            ))
        if d.status is PayStatus.PAID and not d.is_draft and d.id not in matched_docs and d.issue_date >= _period_start(dataset):
            alerts.append(Alert(
                f"nosupport:{d.id}", Severity.WARNING, "Pagada sin movimiento bancario",
                f"{d.number} · {d.contact_name}", "Holded la marca como pagada pero no hay movimiento que lo respalde",
                d.total, d.issue_date, doc_projects.get(d.id), d.id, action="conciliar",
            ))

    for m in matches.values():
        if m.method is MatchMethod.NONE:
            p = m.payment
            alerts.append(Alert(
                f"nodoc:{p.id}", Severity.SERIOUS if abs(p.amount) >= 1000 else Severity.WARNING,
                "Movimiento sin factura", p.description or "Movimiento bancario",
                f"{'Entrada' if p.amount > 0 else 'Salida'} de {_eur(abs(p.amount))} sin documento que lo soporte",
                p.amount, p.date, None, payment_id=p.id, action="conciliar",
            ))

    alerts = [a for a in alerts if a.id not in overrides.resolved]
    return sorted(alerts, key=lambda a: (SEVERITY_ORDER[a.severity], -abs(a.amount)))


def _period_start(dataset: Dataset) -> date:
    return min((p.date for p in dataset.payments), default=dataset.as_of)
