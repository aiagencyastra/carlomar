"""KPIs consolidados y por proyecto, en devengo y en caja."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date

import pandas as pd

from tracker.engine.rules import OVERHEAD, UNASSIGNED, Rules


def months_between(start: date, end: date) -> list[str]:
    out, y, m = [], start.year, start.month
    while (y, m) <= (end.year, end.month):
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


def _in(df: pd.DataFrame, months: list[str] | None) -> pd.DataFrame:
    return df if months is None else df[df["month"].isin(months)]


def _pct(num: float, den: float) -> float:
    return num / den * 100 if den else 0.0


# ------------------------------------------------------------- P&L proyecto
def project_pnl(
    accrual: pd.DataFrame,
    rules: Rules,
    months: list[str] | None = None,
    allocation: str = "revenue",
) -> pd.DataFrame:
    """Cuenta de resultados por proyecto (devengo).

    `allocation`: cómo se repercute el overhead a los proyectos:
    `revenue` (prorrata de ingresos), `equal` (a partes iguales) o `none`.
    """
    df = _in(accrual, months)
    inc = df[df["kind"] == "income"].groupby("project")["amount"].sum()
    exp = df[df["kind"] == "expense"].groupby("project")["amount"].sum()
    return _pnl(inc, exp, rules, allocation)


def project_cash_pnl(
    cash: pd.DataFrame,
    rules: Rules,
    months: list[str] | None = None,
    allocation: str = "revenue",
) -> pd.DataFrame:
    """Misma estructura que `project_pnl`, pero con cobros y pagos reales."""
    df = _in(cash, months)
    inc = df[df["amount"] > 0].groupby("project")["amount"].sum()
    exp = (-df.loc[df["amount"] < 0, "amount"]).groupby(df["project"]).sum()
    return _pnl(inc, exp, rules, allocation)


def _pnl(inc: pd.Series, exp: pd.Series, rules: Rules, allocation: str) -> pd.DataFrame:
    overhead_pool = float(exp.get(OVERHEAD, 0.0))

    pids = rules.project_ids
    revenue = pd.Series({p: float(inc.get(p, 0.0)) for p in pids})
    if allocation == "revenue" and revenue.sum() > 0:
        weights = revenue / revenue.sum()
    elif allocation == "equal":
        weights = pd.Series({p: 1 / len(pids) for p in pids})
    else:
        weights = pd.Series({p: 0.0 for p in pids})

    rows = []
    for p in pids:
        rev = revenue[p]
        direct = float(exp.get(p, 0.0))
        oh = overhead_pool * float(weights[p])
        rows.append({
            "project": p, "name": rules.label(p), "revenue": rev, "direct_costs": direct,
            "contribution": rev - direct, "contribution_pct": _pct(rev - direct, rev),
            "overhead": oh, "net": rev - direct - oh, "net_pct": _pct(rev - direct - oh, rev),
        })
    if allocation not in ("revenue", "equal") or not revenue.sum():
        rows.append({"project": OVERHEAD, "name": rules.label(OVERHEAD), "revenue": 0.0, "direct_costs": 0.0,
                     "contribution": 0.0, "contribution_pct": 0.0, "overhead": overhead_pool,
                     "net": -overhead_pool, "net_pct": 0.0})
    un_rev, un_exp = float(inc.get(UNASSIGNED, 0.0)), float(exp.get(UNASSIGNED, 0.0))
    if un_rev or un_exp:
        rows.append({"project": UNASSIGNED, "name": rules.label(UNASSIGNED), "revenue": un_rev,
                     "direct_costs": un_exp, "contribution": un_rev - un_exp, "contribution_pct": 0.0,
                     "overhead": 0.0, "net": un_rev - un_exp, "net_pct": 0.0})
    return pd.DataFrame(rows)


# ----------------------------------------------------------- series mensuales
def monthly_accrual(accrual: pd.DataFrame, months: list[str], project: str | None = None) -> pd.DataFrame:
    df = accrual if project is None else accrual[accrual["project"] == project]
    piv = df.pivot_table(index="month", columns="kind", values="amount", aggfunc="sum", fill_value=0.0)
    piv = piv.reindex(months, fill_value=0.0)
    out = pd.DataFrame({
        "month": months,
        "revenue": piv.get("income", pd.Series(0.0, index=months)).values,
        "expenses": piv.get("expense", pd.Series(0.0, index=months)).values,
    })
    out["net"] = out["revenue"] - out["expenses"]
    out["net_cum"] = out["net"].cumsum()
    return out


def monthly_cash(cash: pd.DataFrame, months: list[str], current_balance: float) -> pd.DataFrame:
    """Cobros, pagos y saldo de tesorería a fin de cada mes.

    El saldo histórico se reconstruye hacia atrás desde el saldo actual de las
    cuentas, así cuadra siempre con lo que dice el banco hoy.
    """
    by_month = cash.groupby("month")["amount"]
    inflow = by_month.apply(lambda s: s[s > 0].sum()).reindex(months, fill_value=0.0)
    outflow = by_month.apply(lambda s: -s[s < 0].sum()).reindex(months, fill_value=0.0)
    net_all = cash.groupby("month")["amount"].sum()
    balances = []
    for m in months:
        after = net_all[net_all.index > m].sum()
        balances.append(current_balance - after)
    out = pd.DataFrame({"month": months, "inflow": inflow.values, "outflow": outflow.values})
    out["net"] = out["inflow"] - out["outflow"]
    out["balance"] = balances
    return out


def monthly_project_cash(cash: pd.DataFrame, months: list[str], project: str | None = None) -> pd.DataFrame:
    """Serie mensual de caja con las mismas columnas que `monthly_accrual`."""
    df = cash if project is None else cash[cash["project"] == project]
    g = df.groupby("month")["amount"]
    out = pd.DataFrame({
        "month": months,
        "revenue": g.apply(lambda s: s[s > 0].sum()).reindex(months, fill_value=0.0).values,
        "expenses": g.apply(lambda s: -s[s < 0].sum()).reindex(months, fill_value=0.0).values,
    })
    out["net"] = out["revenue"] - out["expenses"]
    out["net_cum"] = out["net"].cumsum()
    return out


def revenue_by_project(accrual: pd.DataFrame, months: list[str], rules: Rules) -> pd.DataFrame:
    df = accrual[(accrual["kind"] == "income") & accrual["month"].isin(months)]
    piv = df.pivot_table(index="month", columns="project", values="amount", aggfunc="sum", fill_value=0.0)
    piv = piv.reindex(index=months, fill_value=0.0)
    cols = [p for p in rules.project_ids + [UNASSIGNED] if p in piv.columns]
    return piv[cols]


# ---------------------------------------------------------- KPIs compañía
@dataclass(frozen=True)
class CompanyKPIs:
    revenue: float
    expenses: float
    direct_costs: float
    overhead: float
    unassigned_costs: float
    net: float
    net_pct: float
    direct_share: float
    overhead_share: float
    unassigned_share: float
    cash_in: float
    cash_out: float
    treasury: float
    gross_burn: float  # salidas medias/mes (últimos 3 meses cerrados)
    net_burn: float  # salidas - entradas medias/mes
    runway_months: float  # tesorería / net burn (inf si genera caja)
    runway_gross_months: float  # tesorería / gross burn (escenario sin ingresos)
    last_month: str
    last_month_revenue: float
    prev_month_revenue: float
    receivables: float
    receivables_overdue: float
    payables: float
    payables_overdue: float

    @property
    def last_month_delta_pct(self) -> float:
        return _pct(self.last_month_revenue - self.prev_month_revenue, self.prev_month_revenue)


def company_kpis(
    accrual: pd.DataFrame,
    cash: pd.DataFrame,
    months: list[str],
    treasury: float,
    as_of: date,
    receivables: tuple[float, float],
    payables: tuple[float, float],
) -> CompanyKPIs:
    df = _in(accrual, months)
    revenue = float(df.loc[df["kind"] == "income", "amount"].sum())
    exp = df[df["kind"] == "expense"]
    expenses = float(exp["amount"].sum())
    overhead = float(exp.loc[exp["project"] == OVERHEAD, "amount"].sum())
    unassigned = float(exp.loc[exp["project"] == UNASSIGNED, "amount"].sum())
    direct = expenses - overhead - unassigned

    c = _in(cash, months)
    cash_in = float(c.loc[c["amount"] > 0, "amount"].sum())
    cash_out = float(-c.loc[c["amount"] < 0, "amount"].sum())

    # Burn: últimos 3 meses cerrados antes de la fecha de corte
    current = f"{as_of.year:04d}-{as_of.month:02d}"
    closed = sorted(m for m in cash["month"].unique() if m < current)[-3:]
    window = cash[cash["month"].isin(closed)]
    n = max(len(closed), 1)
    gross_burn = float(-window.loc[window["amount"] < 0, "amount"].sum()) / n
    net_burn = float(-window["amount"].sum()) / n
    runway = treasury / net_burn if net_burn > 0 else math.inf
    runway_gross = treasury / gross_burn if gross_burn > 0 else math.inf

    closed_in_range = [m for m in months if m < current] or months
    last = closed_in_range[-1]
    prev = closed_in_range[-2] if len(closed_in_range) > 1 else None
    inc = accrual[accrual["kind"] == "income"].groupby("month")["amount"].sum()

    return CompanyKPIs(
        revenue=revenue, expenses=expenses, direct_costs=direct, overhead=overhead,
        unassigned_costs=unassigned, net=revenue - expenses, net_pct=_pct(revenue - expenses, revenue),
        direct_share=_pct(direct, expenses), overhead_share=_pct(overhead, expenses),
        unassigned_share=_pct(unassigned, expenses), cash_in=cash_in, cash_out=cash_out,
        treasury=treasury, gross_burn=gross_burn, net_burn=net_burn, runway_months=runway,
        runway_gross_months=runway_gross, last_month=last,
        last_month_revenue=float(inc.get(last, 0.0)), prev_month_revenue=float(inc.get(prev, 0.0)) if prev else 0.0,
        receivables=receivables[0], receivables_overdue=receivables[1],
        payables=payables[0], payables_overdue=payables[1],
    )
