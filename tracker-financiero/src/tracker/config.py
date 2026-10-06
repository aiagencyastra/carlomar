"""Configuración del tracker leída de `.env` / variables de entorno."""

from __future__ import annotations

import os
from dataclasses import dataclass, replace
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FIXTURE = PROJECT_ROOT / "data" / "sample_holded_data.json"
DEFAULT_RULES = PROJECT_ROOT / "config" / "projects.json"


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "si", "sí", "on"}


@dataclass(frozen=True)
class Settings:
    api_key: str | None
    demo_mode: bool
    base_url: str = "https://api.holded.com/api"
    timeout: float = 20.0
    max_retries: int = 5
    lookback_months: int = 12
    strict: bool = False
    fixture_path: Path = DEFAULT_FIXTURE
    rules_path: Path = DEFAULT_RULES

    @property
    def use_mock(self) -> bool:
        """Modo demo explícito o falta de clave -> datos sintéticos."""
        return self.demo_mode or not self.api_key

    @property
    def mock_reason(self) -> str | None:
        if self.demo_mode:
            return "DEMO_MODE=true"
        if not self.api_key:
            return "HOLDED_API_KEY no configurada"
        return None

    def with_overrides(self, **kwargs) -> "Settings":
        return replace(self, **kwargs)


def load_settings(env_file: Path | None = None, *, force_mock: bool = False) -> Settings:
    load_dotenv(env_file or PROJECT_ROOT / ".env", override=False)
    api_key = (os.getenv("HOLDED_API_KEY") or "").strip() or None
    settings = Settings(
        api_key=api_key,
        # Sin clave el modo demo es el único posible; con clave, respeta DEMO_MODE.
        demo_mode=_as_bool(os.getenv("DEMO_MODE"), default=api_key is None),
        base_url=os.getenv("HOLDED_BASE_URL", "https://api.holded.com/api").rstrip("/"),
        timeout=float(os.getenv("HOLDED_TIMEOUT", "20")),
        max_retries=int(os.getenv("HOLDED_MAX_RETRIES", "5")),
        lookback_months=int(os.getenv("HOLDED_LOOKBACK_MONTHS", "12")),
        strict=_as_bool(os.getenv("HOLDED_STRICT"), default=False),
    )
    if force_mock:
        settings = settings.with_overrides(demo_mode=True)
    return settings
