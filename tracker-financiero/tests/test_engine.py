import math
from datetime import date

import pytest

from tracker.engine.assignment import Method, assign_line
from tracker.engine.reconciliation import JUSTIFIED, MatchMethod, Overrides
from tracker.engine.report import build_report
from tracker.engine.rules import OVERHEAD, UNASSIGNED
from tracker.pipeline.models import DocKind, Document, Line, PayStatus


def doc(kind=DocKind.EXPENSE, tags=(), desc="", contact="Proveedor X", lines=None):
    lines = lines or (Line(0, "Concepto", "", (), 100.0, 21.0, 0.0),)
    return Document("d", kind, "N1", "c1", contact, desc, date(2026, 1, 1), date(2026, 2, 1), tags, lines,
                    100.0, 21.0, 0.0, 121.0, 0.0, 121.0, PayStatus.PENDING, False)


def test_tag_wins_over_keyword_and_contact(rules):
    line = Line(0, "Desarrollo Orion", "", (), 100, 21, 0)
    d = doc(tags=("Skyla",), contact="Orion Retail Group SA", lines=(line,))
    a = assign_line(d, line, rules)
    assert (a.project, a.method) == ("skyla", Method.TAG)


def test_line_tag_beats_document_tag(rules):
    line = Line(0, "x", "", ("hornymoon",), 100, 21, 0)
    assert assign_line(doc(tags=("skyla",), lines=(line,)), line, rules).project == "hornymoon"


def test_bracket_tags_are_normalised(rules):
    line = Line(0, "x", "", ("[Polaris]",), 100, 21, 0)
    assert assign_line(doc(lines=(line,)), line, rules).project == "polaris"


def test_keyword_is_accent_and_case_insensitive(rules):
    line = Line(0, "Integración CARLO MAR", "", (), 100, 21, 0)
    a = assign_line(doc(lines=(line,)), line, rules)
    assert (a.project, a.method) == ("carlomar", Method.KEYWORD)


def test_contact_rule(rules):
    line = Line(0, "Sesiones", "", (), 100, 21, 0)
    a = assign_line(doc(contact="Dra. Elena Ruiz Abad", lines=(line,)), line, rules)
    assert (a.project, a.method) == ("ethos", Method.CONTACT)


def test_overhead_and_unassigned(rules):
    l1 = Line(0, "Asesoría fiscal", "", (), 100, 21, 0)
    assert assign_line(doc(lines=(l1,)), l1, rules).project == OVERHEAD
    l2 = Line(0, "Material vario", "", (), 100, 21, 0)
    assert assign_line(doc(lines=(l2,)), l2, rules).project == UNASSIGNED


def test_income_never_goes_to_overhead(rules):
    line = Line(0, "Asesoría", "", (), 100, 21, 0)
    assert assign_line(doc(kind=DocKind.INCOME, lines=(line,)), line, rules).project == UNASSIGNED


def test_manual_override_wins(rules):
    line = Line(0, "x", "", ("skyla",), 100, 21, 0)
    assert assign_line(doc(lines=(line,)), line, rules, override="orion").method is Method.MANUAL


def test_split_invoice_is_imputed_line_by_line(report):
    acc = report.accrual
    laura = acc[acc["contact"] == "Laura Martí Ferrer"]
    assert {"skyla", "orion", "polaris"} <= set(laura["project"])


def test_every_payment_matching_strategy_is_used(report):
    methods = {m.method for m in report.matches.values()}
    assert {MatchMethod.LINK, MatchMethod.CONTACT_AMOUNT, MatchMethod.AMOUNT_DATE,
            MatchMethod.BANK_RULE, MatchMethod.NONE} <= methods


def test_project_pnl_adds_up_to_company(report):
    k = report.company()
    for alloc in ("revenue", "equal", "none"):
        pnl = report.project_pnl(allocation=alloc)
        assert pnl["net"].sum() == pytest.approx(k.net, abs=0.05)
        assert pnl["revenue"].sum() == pytest.approx(k.revenue, abs=0.05)


def test_cash_series_ends_at_bank_balance(report):
    cash = report.monthly_cash()
    assert cash["balance"].iloc[-1] == pytest.approx(report.dataset.treasury_balance)


def test_runway_definition(report):
    k = report.company()
    assert k.net_burn > 0
    assert k.runway_months == pytest.approx(k.treasury / k.net_burn)
    assert k.runway_gross_months < k.runway_months


def test_expense_shares_sum_100(report):
    k = report.company()
    assert k.direct_share + k.overhead_share + k.unassigned_share == pytest.approx(100)


def test_alerts_cover_each_category(report):
    cats = {a.category for a in report.alerts}
    assert {"Cobro vencido", "Pago vencido", "Sin proyecto asignado", "Movimiento sin factura",
            "Partida sin validar"} <= cats


def test_reassign_moves_cost_and_clears_alert(dataset, rules, report):
    alert = next(a for a in report.alerts if a.category == "Sin proyecto asignado")
    before = report.project_pnl(allocation="none").set_index("project")
    ov = Overrides(projects={alert.doc_id: "skyla"})
    after_report = build_report(dataset, rules, ov)
    after = after_report.project_pnl(allocation="none").set_index("project")
    assert after.loc["skyla", "direct_costs"] == pytest.approx(before.loc["skyla", "direct_costs"] + alert.amount)
    assert alert.id not in {a.id for a in after_report.alerts}
    assert after_report.company().net == pytest.approx(report.company().net)


def test_reconcile_payment_manually(dataset, rules, report):
    alert = next(a for a in report.alerts if a.category == "Movimiento sin factura")
    r2 = build_report(dataset, rules, Overrides(payment_links={alert.payment_id: JUSTIFIED}))
    assert r2.matches[alert.payment_id].method is MatchMethod.JUSTIFIED
    assert len(r2.alerts) == len(report.alerts) - 1


def test_resolved_alerts_are_hidden(dataset, rules, report):
    first = report.alerts[0]
    r2 = build_report(dataset, rules, Overrides(resolved={first.id}))
    assert first.id not in {a.id for a in r2.alerts}


def test_runway_infinite_when_cash_positive(report):
    from tracker.engine.kpis import company_kpis

    cash = report.cash.copy()
    cash["amount"] = cash["amount"].abs()
    k = company_kpis(report.accrual, cash, report.months, 1000, report.dataset.as_of, (0, 0), (0, 0))
    assert math.isinf(k.runway_months)
