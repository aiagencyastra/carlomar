from pathlib import Path

import pytest

AppTest = pytest.importorskip("streamlit.testing.v1").AppTest
APP = str(Path(__file__).resolve().parents[1] / "app" / "dashboard.py")


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    at = AppTest.from_file(APP, default_timeout=60)
    at.run()
    assert not at.exception
    return at


def test_dashboard_renders_all_tabs(app):
    assert len(app.tabs) == 4
    assert any("Conciliación" in t.label for t in app.tabs)


def test_resolving_an_alert_updates_counter(app):
    before = next(t.label for t in app.tabs if "Conciliación" in t.label)
    next(b for b in app.button if b.label.startswith("📨")).click().run()
    assert not app.exception
    after = next(t.label for t in app.tabs if "Conciliación" in t.label)
    assert before != after


def test_reassign_via_form(app):
    def imputed_card() -> str:
        return next(m.value for m in app.markdown if "Gasto imputado" in m.value)

    before = imputed_card()
    box = next(sb for sb in app.selectbox if sb.key and sb.key.startswith("assign_"))
    box.select("Gasto Común / Overhead")
    next(b for b in app.button if b.label == "Aplicar reasignación").click()
    app.run()
    assert not app.exception
    assert imputed_card() != before


def test_justify_payment_via_form(app):
    before = next(t.label for t in app.tabs if "Conciliación" in t.label)
    box = next(sb for sb in app.selectbox if sb.key and sb.key.startswith("link_"))
    box.select("✔ Justificar sin factura")
    next(b for b in app.button if b.label == "Conciliar movimientos").click()
    app.run()
    assert not app.exception
    assert next(t.label for t in app.tabs if "Conciliación" in t.label) != before


def test_reassignment_recomputes_kpis(app, report):
    from tracker.engine.reconciliation import Overrides

    def imputed_card() -> str:
        return next(m.value for m in app.markdown if "Gasto imputado" in m.value)

    before = imputed_card()
    unassigned = {a.doc_id for a in report.alerts if a.category == "Sin proyecto asignado"}
    app.session_state["overrides"] = Overrides(projects={d: "__overhead__" for d in unassigned})
    app.run()
    assert not app.exception
    assert before != imputed_card() and "100,0 %" in imputed_card()
