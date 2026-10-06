"""Carga y compilación de las reglas de imputación (`config/projects.json`)."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

OVERHEAD = "__overhead__"
UNASSIGNED = "__unassigned__"
OVERHEAD_LABEL = "Gasto Común / Overhead"
UNASSIGNED_LABEL = "Sin Asignar (Requiere Revisión)"


def fold(text: str | None) -> str:
    """Minúsculas y sin acentos, para comparar de forma robusta."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _compile(patterns: list[str]) -> list[re.Pattern[str]]:
    return [re.compile(fold(p), re.IGNORECASE) for p in patterns]


@dataclass(frozen=True)
class ProjectRule:
    id: str
    name: str
    tags: frozenset[str]
    keywords: tuple[re.Pattern[str], ...]
    contacts: frozenset[str]  # nombres o ids, ya "folded"

    def matches_tags(self, tags: tuple[str, ...]) -> bool:
        return any(fold(t).strip("[]#").strip() in self.tags for t in tags)

    def matches_text(self, text: str) -> bool:
        folded = fold(text)
        return any(k.search(folded) for k in self.keywords)

    def matches_contact(self, contact_id: str | None, contact_name: str | None, contact_tags: tuple[str, ...] = ()) -> bool:
        return (
            fold(contact_id) in self.contacts
            or fold(contact_name) in self.contacts
            or self.matches_tags(contact_tags)
        )


@dataclass(frozen=True)
class BankRule:
    pattern: re.Pattern[str]
    label: str
    in_pnl: bool


@dataclass
class Rules:
    projects: list[ProjectRule]
    overhead: ProjectRule
    bank_rules: list[BankRule]
    amount_tolerance: float = 0.01
    date_window_days: int = 75
    overhead_allocation: str = "revenue"
    names: dict[str, str] = field(default_factory=dict)

    def label(self, project_id: str) -> str:
        return self.names.get(project_id, project_id)

    @property
    def project_ids(self) -> list[str]:
        return [p.id for p in self.projects]


def _rule(pid: str, name: str, spec: dict) -> ProjectRule:
    return ProjectRule(
        id=pid,
        name=name,
        tags=frozenset(fold(t).strip("[]#") for t in spec.get("tags", [])),
        keywords=tuple(_compile(spec.get("keywords", []))),
        contacts=frozenset(fold(c) for c in spec.get("contacts", [])),
    )


def rules_from_dict(data: dict) -> Rules:
    projects = [_rule(p["id"], p.get("name", p["id"]), p) for p in data.get("projects", [])]
    names = {p.id: p.name for p in projects}
    names[OVERHEAD] = OVERHEAD_LABEL
    names[UNASSIGNED] = UNASSIGNED_LABEL
    matching = data.get("matching", {})
    return Rules(
        projects=projects,
        overhead=_rule(OVERHEAD, OVERHEAD_LABEL, data.get("overhead", {})),
        bank_rules=[
            BankRule(re.compile(fold(b["pattern"]), re.IGNORECASE), b["label"], bool(b.get("in_pnl", True)))
            for b in data.get("bank_rules", [])
        ],
        amount_tolerance=float(matching.get("amount_tolerance", 0.01)),
        date_window_days=int(matching.get("date_window_days", 75)),
        overhead_allocation=data.get("overhead_allocation", "revenue"),
        names=names,
    )


def load_rules(path: Path) -> Rules:
    return rules_from_dict(json.loads(path.read_text(encoding="utf-8")))
