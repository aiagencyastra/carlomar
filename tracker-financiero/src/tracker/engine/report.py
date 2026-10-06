"""Orquestador del motor: dataset normalizado -> informe financiero completo."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from tracker.engine import kpis
from tracker.engine.ledger import Ledgers, build_ledgers
from tracker.engine.reconciliation import Alert, Overrides, PaymentMatch, build_alerts, match_payments
from tracker.engine.rules import Rules
from tracker.pipeline.models import Dataset, DocKind, PayStatus


@dataclass
class FinanceReport:
    dataset: Dataset
    rules: Rules
    ledgers: Ledgers
    matches: dict[str, PaymentMatch]
    alerts: list[Alert]
    months: list[str] = field(default_factory=list)  # todos los meses con datos

    @property
    def accrual(self) -> pd.DataFrame:
        return self.ledgers.accrual

    @property
    def cash(self) -> pd.DataFrame:
        return self.ledgers.cash

    def open_items(self, kind: DocKind) -> tuple[float, float]:
        """(pendiente total, pendiente vencido) de cobro o de pago."""
        docs = [d for d in self.dataset.documents if d.kind is kind and not d.is_draft]
        pending = sum(d.pending for d in docs if d.status in (PayStatus.PENDING, PayStatus.PARTIAL, PayStatus.OVERDUE))
        overdue = sum(d.pending for d in docs if d.status is PayStatus.OVERDUE)
        return round(pending, 2), round(overdue, 2)

    def company(self, months: list[str] | None = None) -> kpis.CompanyKPIs:
        return kpis.company_kpis(
            self.accrual, self.cash, months or self.months, self.dataset.treasury_balance,
            self.dataset.as_of, self.open_items(DocKind.INCOME), self.open_items(DocKind.EXPENSE),
        )

    def project_pnl(self, months: list[str] | None = None, allocation: str | None = None) -> pd.DataFrame:
        return kpis.project_pnl(self.accrual, self.rules, months or self.months,
                                allocation or self.rules.overhead_allocation)

    def project_cash_pnl(self, months: list[str] | None = None, allocation: str | None = None) -> pd.DataFrame:
        return kpis.project_cash_pnl(self.cash, self.rules, months or self.months,
                                     allocation or self.rules.overhead_allocation)

    def monthly_project_cash(self, months: list[str] | None = None, project: str | None = None) -> pd.DataFrame:
        return kpis.monthly_project_cash(self.cash, months or self.months, project)

    def monthly_accrual(self, months: list[str] | None = None, project: str | None = None) -> pd.DataFrame:
        return kpis.monthly_accrual(self.accrual, months or self.months, project)

    def monthly_cash(self, months: list[str] | None = None) -> pd.DataFrame:
        return kpis.monthly_cash(self.cash, months or self.months, self.dataset.treasury_balance)

    def revenue_by_project(self, months: list[str] | None = None) -> pd.DataFrame:
        return kpis.revenue_by_project(self.accrual, months or self.months, self.rules)


def build_report(dataset: Dataset, rules: Rules, overrides: Overrides | None = None) -> FinanceReport:
    overrides = overrides or Overrides()
    matches = match_payments(dataset, rules, overrides)
    ledgers = build_ledgers(dataset, rules, matches, overrides)
    alerts = build_alerts(dataset, matches, ledgers.doc_projects, ledgers.unassigned_docs, overrides)
    dates = [d.issue_date for d in dataset.documents] + [p.date for p in dataset.payments]
    start = min(dates, default=dataset.as_of)
    months = kpis.months_between(start, dataset.as_of)
    return FinanceReport(dataset, rules, ledgers, matches, alerts, months)
