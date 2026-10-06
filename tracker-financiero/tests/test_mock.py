import json

from tracker.mock.generator import generate
from tracker.pipeline.models import PayStatus


def test_generator_is_deterministic():
    assert json.dumps(generate()) == json.dumps(generate())


def test_different_seed_changes_data():
    assert json.dumps(generate(seed=1)) != json.dumps(generate(seed=2))


def test_fixture_has_holded_shape(dataset):
    data = generate()
    assert {"invoice", "purchase", "payments", "contacts", "treasury", "meta"} <= set(data)
    inv = data["invoice"][0]
    assert {"id", "contact", "contactName", "date", "dueDate", "docNumber", "products", "tags",
            "subtotal", "tax", "total", "status", "paymentsTotal", "paymentsPending"} <= set(inv)
    assert len(inv["id"]) == 24
    # IRPF en facturas de freelance
    assert any(p["retention"] == 15 for d in data["purchase"] for p in d["products"])


def test_fixture_covers_all_states(dataset):
    states = {d.status for d in dataset.documents}
    assert {PayStatus.PAID, PayStatus.PENDING, PayStatus.OVERDUE} <= states
    assert any(d.is_draft for d in dataset.documents)


def test_treasury_balance_matches_payments():
    data = generate()
    for acc in data["treasury"]:
        moves = sum(p["amount"] for p in data["payments"] if p["bankId"] == acc["id"])
        assert round(acc["balance"] - moves, 2) > 0  # saldo inicial positivo y coherente


def test_totals_are_consistent(dataset):
    for d in dataset.documents:
        assert abs(d.total - (d.subtotal + d.vat - d.retention)) < 0.02
