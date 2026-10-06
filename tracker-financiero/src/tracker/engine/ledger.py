"""Construcción de los dos libros que alimentan los KPIs.

- Libro de devengo (`accrual`): una fila por línea de factura imputada a un
  proyecto, por fecha de emisión y a base imponible (sin IVA). Incluye los
  movimientos bancarios con regla `in_pnl` (nóminas, SS, comisiones) como
  gasto de estructura, porque no llegan como factura a Holded.
- Libro de caja (`cash`): una fila por movimiento de tesorería, repartida entre
  proyectos en la misma proporción que las líneas del documento conciliado.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

import pandas as pd

from tracker.engine.assignment import Assignment, Method, assign_line
from tracker.engine.reconciliation import MatchMethod, Overrides, PaymentMatch
from tracker.engine.rules import OVERHEAD, UNASSIGNED, Rules
from tracker.pipeline.models import Dataset, DocKind, PayStatus

ACCRUAL_COLUMNS = [
    "date", "month", "kind", "project", "method", "evidence", "amount", "vat",
    "doc_id", "doc_number", "contact", "concept", "status", "source", "category",
]
CASH_COLUMNS = ["date", "month", "project", "amount", "payment_id", "doc_id", "match", "concept", "account", "category"]


@dataclass
class Ledgers:
    accrual: pd.DataFrame
    cash: pd.DataFrame
    doc_projects: dict[str, str]  # proyecto principal de cada documento
    unassigned_docs: set[str]
    line_assignments: dict[tuple[str, int], Assignment]


def build_ledgers(
    dataset: Dataset,
    rules: Rules,
    matches: dict[str, PaymentMatch],
    overrides: Overrides | None = None,
) -> Ledgers:
    overrides = overrides or Overrides()
    rows: list[dict] = []
    doc_split: dict[str, dict[str, float]] = {}
    doc_projects: dict[str, str] = {}
    unassigned: set[str] = set()
    line_assignments: dict[tuple[str, int], Assignment] = {}

    for doc in dataset.documents:
        if doc.status is PayStatus.CANCELLED:
            continue
        contact = dataset.contacts.get(doc.contact_id or "")
        split: dict[str, float] = defaultdict(float)
        for line in doc.lines:
            a = assign_line(doc, line, rules, contact, overrides.projects.get(doc.id))
            line_assignments[(doc.id, line.index)] = a
            split[a.project] += line.base
            if doc.is_draft:  # los borradores no computan hasta validarse
                continue
            rows.append({
                "date": doc.issue_date, "kind": doc.kind.value, "project": a.project,
                "method": a.method.value, "evidence": a.evidence, "amount": line.base, "vat": line.vat,
                "doc_id": doc.id, "doc_number": doc.number, "contact": doc.contact_name,
                "concept": line.name or doc.description, "status": doc.status.value,
                "source": "factura", "category": "Ingreso" if doc.kind is DocKind.INCOME else "Compra / gasto",
            })
        total = sum(split.values())
        doc_split[doc.id] = {k: v / total for k, v in split.items()} if total else {UNASSIGNED: 1.0}
        main = max(split, key=split.get) if split else UNASSIGNED
        doc_projects[doc.id] = main
        if UNASSIGNED in split:
            unassigned.add(doc.id)

    cash_rows: list[dict] = []
    for m in matches.values():
        p = m.payment
        base = {"date": p.date, "payment_id": p.id, "doc_id": m.document_id, "match": m.method.value,
                "concept": p.description, "account": p.account_id}
        if m.document_id and m.document_id in doc_split:
            for project, share in doc_split[m.document_id].items():
                cash_rows.append({**base, "project": project, "amount": round(p.amount * share, 2),
                                  "category": "Cobro factura" if p.amount > 0 else "Pago factura"})
        elif m.method is MatchMethod.BANK_RULE and m.bank_rule:
            cash_rows.append({**base, "project": OVERHEAD, "amount": p.amount, "category": m.bank_rule.label})
            if m.bank_rule.in_pnl:
                rows.append({
                    "date": p.date, "kind": "income" if p.amount > 0 else "expense", "project": OVERHEAD,
                    "method": Method.OVERHEAD_RULE.value, "evidence": m.bank_rule.label,
                    "amount": abs(p.amount), "vat": 0.0, "doc_id": None, "doc_number": "—",
                    "contact": "Banco", "concept": p.description, "status": PayStatus.PAID.value,
                    "source": "banco", "category": m.bank_rule.label,
                })
        elif m.method is MatchMethod.JUSTIFIED:
            cash_rows.append({**base, "project": OVERHEAD, "amount": p.amount, "category": "Justificado a mano"})
        else:
            cash_rows.append({**base, "project": UNASSIGNED, "amount": p.amount, "category": "Sin conciliar"})

    accrual = pd.DataFrame(rows, columns=ACCRUAL_COLUMNS)
    cash = pd.DataFrame(cash_rows, columns=CASH_COLUMNS)
    for df in (accrual, cash):
        df["date"] = pd.to_datetime(df["date"])
        df["month"] = df["date"].dt.strftime("%Y-%m")
    return Ledgers(accrual, cash, doc_projects, unassigned, line_assignments)
