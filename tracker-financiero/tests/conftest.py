import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tracker.config import Settings  # noqa: E402
from tracker.engine.report import build_report  # noqa: E402
from tracker.engine.rules import load_rules  # noqa: E402
from tracker.mock.generator import write_fixture  # noqa: E402
from tracker.pipeline.ingest import load_dataset  # noqa: E402


@pytest.fixture(scope="session")
def fixture_path(tmp_path_factory):
    return write_fixture(tmp_path_factory.mktemp("data") / "sample_holded_data.json")


@pytest.fixture(scope="session")
def settings(fixture_path):
    return Settings(api_key=None, demo_mode=True, fixture_path=fixture_path,
                    rules_path=ROOT / "config" / "projects.json")


@pytest.fixture(scope="session")
def rules(settings):
    return load_rules(settings.rules_path)


@pytest.fixture(scope="session")
def dataset(settings):
    return load_dataset(settings)


@pytest.fixture()
def report(dataset, rules):
    return build_report(dataset, rules)
