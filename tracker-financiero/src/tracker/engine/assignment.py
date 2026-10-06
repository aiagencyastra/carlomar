"""Imputación inteligente por proyecto, línea a línea.

Cascada (se queda con la primera regla que acierta):
  1. Tags nativos de Holded (primero los de la línea, luego los del documento).
  2. Keywords / regex en el concepto de la línea y en la descripción del documento.
  3. Contacto / proveedor asignado a un proyecto (por nombre, id o tags del contacto).
  4. Reglas de estructura -> "Gasto Común / Overhead" (solo gastos).
  5. Nada encaja -> "Sin Asignar (Requiere Revisión)".

Las reasignaciones manuales (`overrides`) ganan siempre.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from tracker.engine.rules import OVERHEAD, UNASSIGNED, Rules
from tracker.pipeline.models import Contact, DocKind, Document, Line


class Method(StrEnum):
    MANUAL = "manual"
    TAG = "tag"
    KEYWORD = "keyword"
    CONTACT = "contacto"
    OVERHEAD_RULE = "regla overhead"
    UNASSIGNED = "sin regla"


@dataclass(frozen=True)
class Assignment:
    project: str
    method: Method
    evidence: str = ""


def assign_line(
    doc: Document,
    line: Line,
    rules: Rules,
    contact: Contact | None = None,
    override: str | None = None,
) -> Assignment:
    if override:
        return Assignment(override, Method.MANUAL, "Reasignado a mano")

    is_expense = doc.kind is DocKind.EXPENSE

    # 1) Tags: los de la línea mandan sobre los del documento
    for tags, where in ((line.tags, "línea"), (doc.tags, "documento")):
        if not tags:
            continue
        for rule in rules.projects:
            if rule.matches_tags(tags):
                return Assignment(rule.id, Method.TAG, f"tag de {where}: {', '.join(tags)}")
        if is_expense and rules.overhead.matches_tags(tags):
            return Assignment(OVERHEAD, Method.TAG, f"tag de {where}: {', '.join(tags)}")

    # 2) Keywords en el concepto de la línea y en la descripción
    for text in (line.text, doc.description):
        for rule in rules.projects:
            if text and rule.matches_text(text):
                return Assignment(rule.id, Method.KEYWORD, f"«{text[:60]}»")

    # 3) Contacto / proveedor
    contact_tags = contact.tags if contact else ()
    for rule in rules.projects:
        if rule.matches_contact(doc.contact_id, doc.contact_name, contact_tags):
            return Assignment(rule.id, Method.CONTACT, doc.contact_name)

    # 4) Estructura
    if is_expense and (
        rules.overhead.matches_text(line.text)
        or rules.overhead.matches_text(doc.description)
        or rules.overhead.matches_contact(doc.contact_id, doc.contact_name, contact_tags)
    ):
        return Assignment(OVERHEAD, Method.OVERHEAD_RULE, line.text[:60] or doc.contact_name)

    return Assignment(UNASSIGNED, Method.UNASSIGNED, "Ninguna regla aplica")
