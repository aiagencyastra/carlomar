#!/usr/bin/env python3
"""Punto de entrada único del Tracker Financiero.

    python main.py                 # levanta el dashboard (modo según .env)
    python main.py --mock          # fuerza modo demo con datos sintéticos
    python main.py report          # KPIs y alertas en la terminal
    python main.py export          # CSVs + JSON para Google Sheets en ./exports
    python main.py generate-mock   # regenera data/sample_holded_data.json
    python main.py check           # prueba la conexión con Holded
"""

from __future__ import annotations

import argparse
import math
import os
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from tracker.config import load_settings  # noqa: E402


def _report(force_mock: bool):
    from tracker.engine.report import build_report
    from tracker.engine.rules import load_rules
    from tracker.pipeline.ingest import load_dataset

    settings = load_settings(force_mock=force_mock)
    dataset = load_dataset(settings)
    return build_report(dataset, load_rules(settings.rules_path))


def cmd_dashboard(args: argparse.Namespace) -> int:
    env = os.environ.copy()
    if args.mock:
        env["DEMO_MODE"] = "true"
    cmd = [sys.executable, "-m", "streamlit", "run", str(ROOT / "app" / "dashboard.py"),
           "--server.port", str(args.port), "--server.headless", "true" if args.headless else "false"]
    print(f"▶ Tracker Financiero en http://localhost:{args.port}  (Ctrl+C para salir)")
    try:
        return subprocess.call(cmd, cwd=ROOT, env=env)
    except KeyboardInterrupt:
        return 0


def cmd_report(args: argparse.Namespace) -> int:
    report = _report(args.mock)
    k = report.company()
    ds = report.dataset

    def eur(x: float) -> str:
        return f"{x:>14,.0f} €".replace(",", ".")

    print(f"\n  TRACKER FINANCIERO · {ds.company} · fuente: {ds.source} · corte {ds.as_of:%d/%m/%Y}\n")
    print(f"  Ingresos (devengo)   {eur(k.revenue)}")
    print(f"  Gastos (devengo)     {eur(k.expenses)}")
    print(f"  Margen neto          {eur(k.net)}   ({k.net_pct:.1f} %)")
    print(f"  Tesorería actual     {eur(k.treasury)}")
    print(f"  Burn neto / mes      {eur(k.net_burn)}")
    runway = "∞" if math.isinf(k.runway_months) else f"{k.runway_months:.1f} meses"
    print(f"  Runway               {runway:>16}")
    print(f"  Cobros vencidos      {eur(k.receivables_overdue)}")
    print(f"  % gasto directo / común / sin asignar: "
          f"{k.direct_share:.0f} % / {k.overhead_share:.0f} % / {k.unassigned_share:.0f} %\n")
    pnl = report.project_pnl()
    print(f"  {'Proyecto':<34}{'Ingresos':>16}{'Directos':>16}{'Overhead':>16}{'Neto':>16}{'%':>8}")
    for _, r in pnl.iterrows():
        print(f"  {r['name']:<34}{eur(r['revenue'])}{eur(r['direct_costs'])}{eur(r['overhead'])}"
              f"{eur(r['net'])}{r['net_pct']:>7.1f}%")
    print(f"\n  Alertas abiertas: {len(report.alerts)}")
    for a in report.alerts[:10]:
        print(f"   [{a.severity.value:<8}] {a.category:<24} {a.title[:48]:<48} {a.amount:>12,.2f} €")
    print()
    return 0


def cmd_export(args: argparse.Namespace) -> int:
    from tracker.exporter import write_bundle

    paths = write_bundle(_report(args.mock), Path(args.out))
    for p in paths:
        print(f"✔ {p.relative_to(ROOT) if p.is_relative_to(ROOT) else p}")
    return 0


def cmd_generate(args: argparse.Namespace) -> int:
    from tracker.mock.generator import DEFAULT_AS_OF, write_fixture

    as_of = date.today() if args.today else (date.fromisoformat(args.as_of) if args.as_of else DEFAULT_AS_OF)
    path = write_fixture(load_settings().fixture_path, seed=args.seed, as_of=as_of)
    print(f"✔ Fixture generado en {path} (semilla {args.seed}, corte {as_of})")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    from tracker.client.holded import HoldedClient, HoldedError

    s = load_settings()
    if not s.api_key:
        print("✖ HOLDED_API_KEY no configurada en .env")
        return 1
    try:
        client = HoldedClient(s.api_key, s.base_url, timeout=s.timeout, max_retries=1)
        contacts = client.list_contacts()
        print(f"✔ Conexión con Holded correcta · {len(contacts)} contactos")
        return 0
    except HoldedError as exc:
        print(f"✖ {exc}")
        return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Tracker Financiero · Holded + imputación por proyecto")
    parser.add_argument("--mock", action="store_true", help="fuerza el modo demo (datos sintéticos)")
    parser.add_argument("--port", type=int, default=8501)
    parser.add_argument("--headless", action="store_true", help="no abrir el navegador")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("dashboard", help="levanta el dashboard (por defecto)")
    sub.add_parser("report", help="imprime KPIs y alertas")
    p = sub.add_parser("export", help="exporta CSV + JSON Google Sheets")
    p.add_argument("--out", default=str(ROOT / "exports"))
    p = sub.add_parser("generate-mock", help="regenera el fixture de demo")
    p.add_argument("--seed", type=int, default=20261006)
    p.add_argument("--as-of", help="fecha de corte YYYY-MM-DD")
    p.add_argument("--today", action="store_true", help="usa la fecha de hoy como corte")
    sub.add_parser("check", help="prueba la conexión con Holded")

    args = parser.parse_args(argv)
    handlers = {None: cmd_dashboard, "dashboard": cmd_dashboard, "report": cmd_report, "export": cmd_export,
                "generate-mock": cmd_generate, "check": cmd_check}
    return handlers[args.command](args)


if __name__ == "__main__":
    sys.exit(main())
