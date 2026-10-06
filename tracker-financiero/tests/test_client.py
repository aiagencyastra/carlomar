from datetime import date

import pytest
import requests

from tracker.client.holded import HoldedAuthError, HoldedClient, HoldedError
from tracker.config import Settings
from tracker.pipeline.ingest import load_raw


class FakeResponse:
    def __init__(self, status=200, payload=None, headers=None):
        self.status_code = status
        self._payload = payload
        self.headers = headers or {}
        self.text = str(payload)

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.headers = {}

    def get(self, url, params=None, timeout=None):
        self.calls.append((url, dict(params or {})))
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


def client(responses, **kw):
    sleeps = []
    c = HoldedClient("k", session=FakeSession(responses), sleep=sleeps.append, min_interval=0, **kw)
    return c, sleeps


def test_sends_key_header():
    c, _ = client([FakeResponse(200, [])])
    assert c.session.headers["key"] == "k"


def test_retries_429_honouring_retry_after():
    c, sleeps = client([FakeResponse(429, headers={"Retry-After": "3"}), FakeResponse(200, [{"id": "a"}])])
    assert c.request("/x") == [{"id": "a"}]
    assert sleeps == [3.0]


def test_retries_network_errors_with_exponential_backoff():
    c, sleeps = client([requests.ConnectionError("down"), FakeResponse(502), FakeResponse(200, [])],
                       backoff_base=1.0)
    assert c.request("/x") == []
    assert sleeps == [1.0, 2.0]


def test_gives_up_after_max_retries():
    c, _ = client([FakeResponse(503)] * 3, max_retries=2)
    with pytest.raises(HoldedError):
        c.request("/x")


def test_auth_error_is_not_retried():
    c, sleeps = client([FakeResponse(401)])
    with pytest.raises(HoldedAuthError):
        c.request("/x")
    assert sleeps == []


def test_pagination_stops_on_empty_page():
    c, _ = client([FakeResponse(200, [{"id": "1"}, {"id": "2"}]), FakeResponse(200, [{"id": "3"}]),
                   FakeResponse(200, [])])
    assert [r["id"] for r in c.paginate("/x")] == ["1", "2", "3"]
    assert [call[1]["page"] for call in c.session.calls] == [1, 2, 3]


def test_pagination_stops_if_endpoint_ignores_page():
    page = [{"id": "1"}]
    c, _ = client([FakeResponse(200, page), FakeResponse(200, page)])
    assert len(c.paginate("/x")) == 1


def test_typed_documents_and_date_range():
    doc = {"id": "d1", "date": 1767225600, "products": [{"name": "x", "price": 10, "units": 2, "tax": 21}],
           "tags": None}
    c, _ = client([FakeResponse(200, [doc]), FakeResponse(200, [])])
    docs = c.list_sales_invoices(date(2026, 1, 1), date(2026, 1, 31))
    assert docs[0].products[0].price == 10 and docs[0].tags == []
    assert {"starttmp", "endtmp", "page"} <= set(c.session.calls[0][1])


def test_live_mode_falls_back_to_fixture(monkeypatch, fixture_path):
    def boom(self, start, end):
        raise HoldedError("timeout")

    monkeypatch.setattr(HoldedClient, "fetch_all", boom)
    s = Settings(api_key="real", demo_mode=False, fixture_path=fixture_path)
    bundle = load_raw(s)
    assert bundle.source == "demo" and any("no disponible" in w for w in bundle.warnings)


def test_strict_mode_raises(monkeypatch, fixture_path):
    monkeypatch.setattr(HoldedClient, "fetch_all", lambda *a: (_ for _ in ()).throw(HoldedError("x")))
    with pytest.raises(HoldedError):
        load_raw(Settings(api_key="real", demo_mode=False, strict=True, fixture_path=fixture_path))


def test_missing_key_means_demo():
    s = Settings(api_key=None, demo_mode=False)
    assert s.use_mock and "HOLDED_API_KEY" in s.mock_reason
