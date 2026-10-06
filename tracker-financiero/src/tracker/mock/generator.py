"""Generador determinista de datos sintéticos con el schema JSON de Holded.

Empresa ficticia: una agencia de IA con seis proyectos en paralelo
(Skyla, Polaris, Ethos, Hornymoon, Carlo Mar, Orion) más gastos de estructura.
El set está diseñado para que la demo cuente una historia:

- Margen sano en devengo, pero caja tensionada por cobros vencidos (Ethos, Orion).
- Hornymoon pierde dinero (la inversión en Meta Ads supera la cuota).
- Cada regla de imputación tiene casos: tags, keywords en líneas, contacto.
- Hay gastos sin proyecto, borradores sin validar y movimientos bancarios sin factura.

Misma semilla + misma fecha => mismo JSON, byte a byte.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_AS_OF = date(2026, 10, 6)
DEFAULT_SEED = 20261006
COMPANY = "Polaris AI Studio SL"

BBVA = "bank_bbva"
REVOLUT = "bank_revolut"
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def ts(d: date) -> int:
    return int(datetime.combine(d, time(9, 0), tzinfo=timezone.utc).timestamp())


def from_ts(t: int) -> date:
    return datetime.fromtimestamp(t, tz=timezone.utc).date()


def add_months(d: date, k: int) -> date:
    y, m = divmod(d.year * 12 + d.month - 1 + k, 12)
    return date(y, m + 1, 1)


def month_end(d: date) -> date:
    return add_months(d, 1) - timedelta(days=1)


def business_day(d: date) -> date:
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


@dataclass
class _Contact:
    key: str
    name: str
    type: str
    code: str
    tags: tuple[str, ...] = ()
    email: str | None = None


CONTACTS: list[_Contact] = [
    # Clientes
    _Contact("skyla", "Skyla Travel Tech SL", "client", "B57123456", email="finance@skyla.travel"),
    _Contact("ethos", "Grupo Ethos Consulting SL", "client", "B07654321", email="admin@grupoethos.es"),
    _Contact("hornymoon", "Hornymoon Experiences SL", "client", "B16987001", email="hola@hornymoon.co"),
    _Contact("carlomar", "Carlo Mar Charter SL", "client", "B57998877", email="info@carlomarcharter.com"),
    _Contact("orion", "Orion Retail Group SA", "client", "A28456789", email="ap@orionretail.com"),
    # Proveedores directos
    _Contact("laura", "Laura Martí Ferrer", "supplier", "43123456K", email="laura@martidev.es"),
    _Contact("pau", "Pau Serra Estudio", "supplier", "43987654T", email="pau@serra.studio"),
    _Contact("elena", "Dra. Elena Ruiz Abad", "supplier", "50111222M", email="elena@ruiz-ethics.eu"),
    _Contact("aws", "Amazon Web Services EMEA SARL", "supplier", "LU26888617"),
    _Contact("anthropic", "Anthropic Ireland Ltd", "supplier", "IE3990474VH"),
    _Contact("meta", "Meta Platforms Ireland Ltd", "supplier", "IE9692928F"),
    _Contact("ugc", "Marta Creative Studio", "supplier", "43555666P"),
    _Contact("snowflake", "Snowflake Computing Ltd", "supplier", "IE3497845KH"),
    _Contact("twilio", "Twilio Ireland Ltd", "supplier", "IE3426265OH"),
    # Estructura
    _Contact("cowork", "Palma Hub Coworking SL", "supplier", "B57333444"),
    _Contact("gestoria", "Gestoría Rullán & Asociados", "supplier", "B07222111"),
    _Contact("holded", "Holded Technologies SL", "supplier", "B66412372"),
    _Contact("google", "Google Ireland Ltd", "supplier", "IE6388047V"),
    _Contact("mapfre", "Mapfre España SA", "supplier", "A28141935"),
    _Contact("vodafone", "Vodafone España SAU", "supplier", "A80907397"),
    _Contact("notion", "Notion Labs Inc", "supplier", "US812345678"),
    # Sin proyecto claro
    _Contact("amazon", "Amazon Business EU SARL", "supplier", "LU20260743"),
    _Contact("fiverr", "Fiverr International Ltd", "supplier", "IL514440874"),
    _Contact("softlab", "Software Lab Distribución SL", "supplier", "B12555888"),
    _Contact("iberia", "Viajes Iberia Express SL", "supplier", "B85250652"),
]

SAAS_CUSTOMERS = [
    # (nombre, plan €/mes, meses desde inicio en que se da de alta)
    ("Hotel Can Bordoy", 790, 0), ("Clínica Dental Sóller", 490, 0),
    ("Inmobiliaria Portixol", 490, 1), ("Bodega Son Vives", 249, 2),
    ("Academia Lingua Palma", 249, 3), ("Talleres Mallorca Motor", 490, 4),
    ("Fit Palma Gym", 249, 5), ("Restaurante Es Mollet", 249, 6),
    ("Óptica Llevant", 490, 7), ("Agroturismo Sa Torre", 790, 8),
    ("Despacho Vidal Abogados", 790, 9), ("Escola Surf Alcúdia", 249, 10),
    ("Náutica Port Adriano", 790, 11),
]


class MockHoldedGenerator:
    def __init__(self, seed: int = DEFAULT_SEED, as_of: date = DEFAULT_AS_OF, months: int = 12):
        self.rng = random.Random(seed)
        self.seed = seed
        self.as_of = as_of
        self.start = add_months(date(as_of.year, as_of.month, 1), -months)
        # Meses completos + el mes en curso (parcial)
        self.months = [add_months(self.start, i) for i in range(months + 1)]
        self.contacts: dict[str, dict[str, Any]] = {}
        self.invoices: list[dict[str, Any]] = []
        self.purchases: list[dict[str, Any]] = []
        self.payments: list[dict[str, Any]] = []
        self._sale_seq: dict[int, int] = {}
        self._sale_ids: set[str] = set()
        self._pay_seq = 0

    # --------------------------------------------------------------- helpers
    def _id(self) -> str:
        return "".join(self.rng.choices("0123456789abcdef", k=24))

    def _amount(self, lo: float, hi: float) -> float:
        return round(self.rng.uniform(lo, hi), 2)

    def _contact(self, key: str) -> dict[str, Any]:
        return self.contacts[key]

    def _register_contacts(self) -> None:
        for c in CONTACTS:
            self.contacts[c.key] = {
                "id": self._id(), "customId": c.key.upper(), "name": c.name,
                "code": c.code, "email": c.email, "type": c.type,
                "tags": list(c.tags), "isperson": c.code[0].isdigit(),
            }
        for name, _, _ in SAAS_CUSTOMERS:
            key = "saas:" + name
            self.contacts[key] = {
                "id": self._id(), "customId": None, "name": name, "code": None,
                "email": None, "type": "client", "tags": ["saas"], "isperson": False,
            }

    @staticmethod
    def line(name: str, price: float, units: float = 1, tax: float = 21,
             retention: float = 0, desc: str = "", tags: tuple[str, ...] = ()) -> dict[str, Any]:
        return {"name": name, "desc": desc, "price": round(price, 2), "units": units,
                "tax": tax, "retention": retention, "discount": 0, "tags": list(tags),
                "account": None, "sku": "", "costPrice": 0}

    def _doc(self, kind: str, contact_key: str, issue: date, lines: list[dict[str, Any]],
             due_days: int = 30, tags: tuple[str, ...] = (), desc: str = "",
             number: str | None = None, draft: bool = False) -> dict[str, Any] | None:
        if issue > self.as_of:
            return None
        c = self._contact(contact_key)
        subtotal = vat = ret = 0.0
        for ln in lines:
            base = round(ln["price"] * ln["units"], 2)
            subtotal += base
            vat += round(base * ln["tax"] / 100, 2)
            ret += round(base * ln["retention"] / 100, 2)
        total = round(subtotal + vat - ret, 2)
        if number is None:
            if kind == "invoice":
                seq = self._sale_seq.get(issue.year, 0) + 1
                self._sale_seq[issue.year] = seq
                number = f"F{issue.year % 100}{seq:04d}"
            else:
                number = f"{c['customId'] or 'PR'}-{issue:%y%m}-{self.rng.randint(100, 999)}"
        doc = {
            "id": self._id(), "contact": c["id"], "contactName": c["name"],
            "desc": desc, "date": ts(issue), "dueDate": ts(issue + timedelta(days=due_days)),
            "notes": "", "tags": list(tags), "products": lines,
            "subtotal": round(subtotal, 2), "tax": round(vat, 2), "total": total,
            "language": "es", "status": 0, "docNumber": number, "currency": "eur",
            "currencyChange": 1, "paymentsTotal": 0.0, "paymentsPending": total,
            "paymentsRefunds": 0, "draft": True if draft else None,
        }
        if kind == "invoice":
            self.invoices.append(doc)
            self._sale_ids.add(doc["id"])
        else:
            self.purchases.append(doc)
        return doc

    def _pay(self, when: date, amount: float, desc: str, bank: str = BBVA,
             contact_key: str | None = None, document: dict[str, Any] | None = None,
             link: bool = True) -> None:
        if when > self.as_of:
            return
        self._pay_seq += 1
        c = self._contact(contact_key) if contact_key else None
        self.payments.append({
            "id": self._id(), "bankId": bank, "date": ts(when), "amount": round(amount, 2),
            "desc": desc, "contactId": c["id"] if c else None,
            "contactName": c["name"] if c else None,
            # Holded no siempre enlaza el pago con el documento: el motor
            # de conciliación lo empareja por contacto + importe.
            "documentId": document["id"] if (document and link) else None,
        })

    def settle(self, doc: dict[str, Any] | None, lag_days: int | None, *, fraction: float = 1.0,
               bank: str = BBVA, link_prob: float = 0.6, anonymous: bool = False) -> None:
        """Cobra/paga el documento `lag_days` después de su emisión (None = impagado)."""
        if doc is None or lag_days is None:
            return
        when = from_ts(doc["date"]) + timedelta(days=lag_days)
        if when > self.as_of:
            return
        amount = round(doc["total"] * fraction, 2)
        is_sale = doc["id"] in self._sale_ids
        contact_key = next(k for k, c in self.contacts.items() if c["id"] == doc["contact"])
        verb = "Cobro" if is_sale else "Pago"
        if anonymous:  # transferencia sin contacto ni referencia: se concilia por importe + fecha
            self._pay(when, amount if is_sale else -amount, "Transferencia recibida", bank, None, doc, link=False)
        else:
            self._pay(when, amount if is_sale else -amount, f"{verb} {doc['docNumber']}", bank,
                      contact_key, doc, link=self.rng.random() < link_prob)
        doc["paymentsTotal"] = round(doc["paymentsTotal"] + amount, 2)
        doc["paymentsPending"] = round(doc["total"] - doc["paymentsTotal"], 2)
        doc["status"] = 1 if doc["paymentsPending"] <= 0.01 else 2

    # ----------------------------------------------------------------- ventas
    def _sales(self) -> None:
        for i, m in enumerate(self.months):
            # SKYLA · retainer con tags nativos
            d = self._doc("invoice", "skyla", m, [self.line(
                "Retainer mensual Skyla", 7500,
                desc=f"Equipo de producto IA · {MESES[m.month - 1]} {m.year}")],
                tags=("skyla",), desc="Retainer Skyla")
            self.settle(d, self.rng.randint(7, 12))
            if i % 3 == 1:
                d = self._doc("invoice", "skyla", m + timedelta(days=14), [self.line(
                    "Sprint adicional Skyla", self._amount(2800, 4200),
                    desc="Módulo de recomendaciones de destinos")], tags=("skyla",))
                self.settle(d, self.rng.randint(8, 14))

            # POLARIS · SaaS propio, cobro por domiciliación
            for name, plan, since in SAAS_CUSTOMERS:
                if i < since:
                    continue
                d = self._doc("invoice", "saas:" + name, m + timedelta(days=1), [self.line(
                    "Suscripción Polaris Agents", plan,
                    desc="Agente IA de atención al cliente · plan mensual")],
                    due_days=5, tags=("polaris",))
                failed = i >= len(self.months) - 2 and name in ("Bodega Son Vives", "Fit Palma Gym")
                self.settle(d, None if failed else self.rng.randint(1, 3), link_prob=0.2)

            # HORNYMOON · fee fijo, cliente que paga tarde
            if m >= add_months(self.start, 3):
                d = self._doc("invoice", "hornymoon", m, [self.line(
                    "Growth & performance marketing", 3200,
                    desc="Fee mensual gestión de campañas")], tags=("hornymoon",))
                if i == len(self.months) - 3:
                    self.settle(d, 38, fraction=0.5)  # pago parcial
                elif i < len(self.months) - 3:
                    self.settle(d, self.rng.randint(25, 34))

            # ORION · BI + forecasting, keyword en la línea, paga a 45-55 días
            if m >= add_months(self.start, 2):
                d = self._doc("invoice", "orion", m + timedelta(days=4), [self.line(
                    "Plataforma BI y forecasting de demanda", 5400,
                    desc="Proyecto Orion · licencia + soporte mensual")], due_days=45)
                overdue = i == len(self.months) - 3
                self.settle(d, None if overdue else self.rng.randint(45, 55))

            # CARLO MAR · sin tags ni keywords: se imputa por contacto
            if m == add_months(self.start, 6):
                d = self._doc("invoice", "carlomar", m + timedelta(days=9), [self.line(
                    "Implantación agente IA", 3500, desc="WhatsApp + correo · puesta en marcha")])
                self.settle(d, 12, anonymous=True)
            elif m > add_months(self.start, 6):
                lines = [self.line("Cuota mantenimiento agente IA", 450, desc="Soporte y mejoras")]
                if m.month in (7, 8):
                    lines.append(self.line("Pack temporada alta", 600, desc="Ampliación de conversaciones"))
                d = self._doc("invoice", "carlomar", m + timedelta(days=2), lines, due_days=15)
                self.settle(d, self.rng.randint(5, 12))

        # ETHOS · hitos, keyword "Ethos" en la línea, sin tags
        milestones = [
            (1, 14000, "Hito 1 · Auditoría de sesgos en modelos"),
            (4, 16500, "Hito 2 · Marco de gobernanza IA"),
            (7, 12000, "Hito 3 · Formación de equipos"),
            (9, 18000, "Hito 4 · Certificación y AI Act readiness"),
            (11, 6000, "Workshop de dirección"),
        ]
        for k, (offset, amount, concept) in enumerate(milestones):
            d = self._doc("invoice", "ethos", add_months(self.start, offset) + timedelta(days=19),
                          [self.line(concept, amount, desc="Programa de IA responsable Ethos")])
            self.settle(d, None if k >= 3 else self.rng.randint(28, 40))

    # ---------------------------------------------------------------- compras
    def _purchases(self) -> None:
        n = len(self.months)
        for i, m in enumerate(self.months):
            last_month = i == n - 1
            eom = month_end(m)

            # Freelance dev: una factura repartida en varios proyectos (keywords por línea)
            if not last_month:
                lines = [self.line("Desarrollo backend Skyla", 45, units=self.rng.randint(38, 52), retention=15,
                                   desc="Horas de desarrollo")]
                if i >= 2:
                    lines.append(self.line("Pipelines de datos Orion", 45, units=self.rng.randint(18, 30),
                                           retention=15, desc="Horas de desarrollo"))
                lines.append(self.line("Polaris Agents: integraciones", 45, units=self.rng.randint(15, 30),
                                       retention=15, desc="Horas de desarrollo"))
                d = self._doc("purchase", "laura", eom, lines, due_days=10)
                self.settle(d, self.rng.randint(5, 10))

                # Diseño UX: líneas con tags por línea
                lines = [self.line("Diseño UI app", 40, units=self.rng.randint(10, 20), retention=15, tags=("skyla",))]
                if i >= 3:
                    lines.append(self.line("Creatividades de campaña", 40, units=self.rng.randint(12, 22),
                                           retention=15, tags=("hornymoon",)))
                if i >= 6:
                    lines.append(self.line("Diseño de flujos conversacionales", 40, units=self.rng.randint(4, 8),
                                           retention=15, tags=("carlomar",)))
                d = self._doc("purchase", "pau", eom, lines, due_days=15)
                self.settle(d, None if i == n - 3 else self.rng.randint(10, 15))

            # Infraestructura (inversión del sujeto pasivo: IVA 0)
            aws = [self.line("AWS · cuenta skyla-prod", self._amount(380, 520), tax=0),
                   self.line("AWS · cuenta polaris-prod", 250 + 30 * i + self._amount(0, 40), tax=0)]
            if i >= 2:
                aws.append(self.line("AWS · cuenta orion-analytics", self._amount(300, 450), tax=0))
            d = self._doc("purchase", "aws", m + timedelta(days=2), aws, due_days=0)
            self.settle(d, 0, bank=REVOLUT, link_prob=0.3)

            llm = [self.line("Claude API · workspace polaris-agents", 280 + 55 * i + self._amount(0, 60), tax=0)]
            if i >= 6:
                llm.append(self.line("Claude API · workspace carlomar-bot", self._amount(40, 95), tax=0))
            d = self._doc("purchase", "anthropic", m + timedelta(days=2), llm, due_days=0)
            self.settle(d, 0, bank=REVOLUT, link_prob=0.3)

            if i >= 3:
                d = self._doc("purchase", "meta", m + timedelta(days=3), [self.line(
                    "Meta Ads · inversión mensual", self._amount(2300, 3300), tax=0)],
                    tags=("hornymoon",), due_days=0)
                self.settle(d, 0, bank=REVOLUT, link_prob=0.3)
            if i >= 4 and not last_month:
                d = self._doc("purchase", "ugc", m + timedelta(days=20), [self.line(
                    "Contenido UGC · 6 piezas", 900, retention=15)])  # imputación por contacto
                self.settle(d, 15)
            if i >= 2:
                d = self._doc("purchase", "snowflake", m + timedelta(days=1), [self.line(
                    "Créditos de cómputo", self._amount(380, 620), tax=0)], due_days=30)
                self.settle(d, None if i == n - 2 else 28, bank=REVOLUT)
            if i >= 7:
                d = self._doc("purchase", "twilio", m + timedelta(days=4), [self.line(
                    "WhatsApp Business API · Carlo Mar", self._amount(60, 140), tax=0)], due_days=0)
                self.settle(d, 0, bank=REVOLUT, link_prob=0.3)

            # Ethos: consultora externa en los meses de hito (imputación por contacto)
            if i in (1, 4, 7, 9):
                d = self._doc("purchase", "elena", m + timedelta(days=24), [self.line(
                    "Sesiones de consultoría y redacción de informes", self._amount(2800, 3800),
                    retention=15)], due_days=15)
                self.settle(d, 14)

            # Estructura / overhead
            d = self._doc("purchase", "cowork", m, [self.line("Alquiler puestos coworking", 1450)],
                          tags=("overhead",), due_days=5)
            self.settle(d, 3)
            if not last_month:
                d = self._doc("purchase", "gestoria", eom, [self.line("Asesoría fiscal, contable y laboral", 380)],
                              due_days=5)
                self.settle(d, 5)
            d = self._doc("purchase", "holded", m + timedelta(days=1), [self.line("Holded plan Premium", 99)], due_days=0)
            self.settle(d, 0, bank=REVOLUT)
            d = self._doc("purchase", "google", m + timedelta(days=1), [self.line("Google Workspace Business", 94.5, tax=0)],
                          due_days=0)
            self.settle(d, 0, bank=REVOLUT)
            d = self._doc("purchase", "notion", m + timedelta(days=1), [self.line("Notion Plus · 6 usuarios", 64, tax=0)],
                          due_days=0)
            self.settle(d, 0, bank=REVOLUT)
            d = self._doc("purchase", "vodafone", m + timedelta(days=6), [self.line("Fibra + líneas móviles", 135)],
                          tags=("overhead",), due_days=10)
            self.settle(d, 10)
            if m.month in (1, 4, 7, 10):
                d = self._doc("purchase", "mapfre", m + timedelta(days=4), [self.line(
                    "Seguro de responsabilidad civil profesional", 420, tax=0)], due_days=5)
                self.settle(d, 5)

            # Gastos sin proyecto: deben acabar en "Sin Asignar"
            if i % 2 == 0 and not last_month:
                d = self._doc("purchase", "amazon", m + timedelta(days=self.rng.randint(5, 22)), [self.line(
                    "Material vario", self._amount(80, 260))], due_days=0)
                self.settle(d, 0, bank=REVOLUT)
            if i in (3, 8, 11):
                d = self._doc("purchase", "fiverr", m + timedelta(days=12), [self.line(
                    "Encargo freelance", self._amount(150, 480), tax=0, desc=f"Pedido #FO{self.rng.randint(10000, 99999)}")],
                    due_days=0)
                self.settle(d, 0, bank=REVOLUT)

        # Gastos singulares
        d = self._doc("purchase", "softlab", add_months(self.start, 4) + timedelta(days=9),
                      [self.line("Licencias anuales de software", 2400)], due_days=30)
        self.settle(d, 30)
        d = self._doc("purchase", "iberia", add_months(self.start, n - 2) + timedelta(days=16),
                      [self.line("Viaje a Madrid · tren y hotel", 642.80, tax=10)], due_days=0)
        self.settle(d, 0, bank=REVOLUT)
        # Borradores pendientes de validar (sin pagar)
        recent = add_months(self.start, n - 1)
        self._doc("purchase", "amazon", recent + timedelta(days=2), [self.line(
            "Monitores y periféricos", 1186.0)], due_days=15, draft=True)
        self._doc("purchase", "pau", recent + timedelta(days=3), [self.line(
            "Diseño identidad · propuesta", 1200, retention=15, tags=("skyla",))], due_days=15, draft=True)

    # ---------------------------------------------- movimientos sin factura
    def _bank_only(self) -> None:
        for i, m in enumerate(self.months):
            if m >= date(self.as_of.year, self.as_of.month, 1):
                break
            eom = business_day(month_end(m))
            extra = 1.85 if m.month in (6, 12) else 1.0  # pagas extra
            self._pay(eom, -round(6900 * extra, 2), f"Nómina {MESES[m.month - 1]} {m.year} · equipo")
            self._pay(eom, -2250.0, f"TGSS · Seguridad Social {MESES[m.month - 1]}")
            self._pay(m + timedelta(days=self.rng.randint(1, 4)), -18.0, "Comisión mantenimiento cuenta")

        # Liquidaciones trimestrales de IVA (303) e IRPF (111)
        for q_start in self.months:
            if q_start.month not in (1, 4, 7, 10):
                continue
            prev = [add_months(q_start, -k) for k in (3, 2, 1)]
            if prev[0] < self.start:
                continue
            in_q = lambda doc: from_ts(doc["date"]).replace(day=1) in prev  # noqa: E731
            iva = sum(d["tax"] for d in self.invoices if in_q(d)) - sum(d["tax"] for d in self.purchases if in_q(d))
            irpf = sum(p["price"] * p["units"] * p["retention"] / 100
                       for d in self.purchases if in_q(d) for p in d["products"])
            pay_day = q_start + timedelta(days=19)
            q = (prev[0].month - 1) // 3 + 1
            if iva > 0:
                self._pay(pay_day, -round(iva, 2), f"AEAT · Modelo 303 {q}T {prev[0].year}")
            self._pay(pay_day, -round(irpf + 3 * 1650, 2), f"AEAT · Modelo 111 {q}T {prev[0].year}")

        # Movimientos sin soporte documental (para el panel de conciliación)
        last = add_months(self.start, len(self.months) - 2)
        self._pay(last + timedelta(days=11), 1250.0, "Transferencia recibida · REF 88231")
        self._pay(last - timedelta(days=9), -186.40, "Pago tarjeta · Amazon Marketplace", REVOLUT)
        self._pay(last + timedelta(days=17), -42.30, "Pago tarjeta · Uber BV", REVOLUT)
        self._pay(last + timedelta(days=22), -128.60, "Pago tarjeta · Restaurante Es Rebost", REVOLUT)

    # ---------------------------------------------------------------- build
    def build(self) -> dict[str, Any]:
        self._register_contacts()
        self._sales()
        self._purchases()
        self._bank_only()
        self.invoices.sort(key=lambda d: d["date"])
        self.purchases.sort(key=lambda d: d["date"])
        self.payments.sort(key=lambda p: (p["date"], p["amount"]))

        opening = {BBVA: 112000.0, REVOLUT: 14000.0}
        balances = dict(opening)
        for p in self.payments:
            balances[p["bankId"]] += p["amount"]
        treasury = [
            {"id": BBVA, "name": "BBVA · Cuenta operativa", "type": "bank",
             "iban": "ES76 0182 **** **** **** 4821", "balance": round(balances[BBVA], 2)},
            {"id": REVOLUT, "name": "Revolut Business · Tarjetas", "type": "bank",
             "iban": "LT12 3250 **** **** 7710", "balance": round(balances[REVOLUT], 2)},
        ]
        return {
            "meta": {
                "generator": "tracker.mock.generator", "seed": self.seed,
                "as_of": self.as_of.isoformat(), "period_start": self.start.isoformat(),
                "company": COMPANY, "currency": "EUR",
                "note": "Datos sintéticos con el schema de la API de Holded. Ningún dato es real.",
            },
            "contacts": list(self.contacts.values()),
            "invoice": self.invoices,
            "purchase": self.purchases,
            "payments": self.payments,
            "treasury": treasury,
        }


def generate(seed: int = DEFAULT_SEED, as_of: date = DEFAULT_AS_OF, months: int = 12) -> dict[str, Any]:
    return MockHoldedGenerator(seed, as_of, months).build()


def write_fixture(path: Path, seed: int = DEFAULT_SEED, as_of: date = DEFAULT_AS_OF, months: int = 12) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = generate(seed, as_of, months)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
