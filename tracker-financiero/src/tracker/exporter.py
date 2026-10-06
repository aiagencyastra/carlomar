"""Exportación del resumen consolidado a CSV y a un payload listo para Google Sheets.

El JSON de Sheets sigue el cuerpo de `spreadsheets.values.batchUpdate`
(https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/batchUpdate):
basta con hacer POST de este objeto con un token de servicio para volcarlo.
"""

from __future__ import annotations

import io
import json
import math
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd

from tracker.engine.report import FinanceReport

PNL_HEADERS = {
    "name": "Proyecto", "revenue": "Ingresos (€)", "direct_costs": "Costes directos (€)",
    "contribution": "Margen contribución (€)", "contribution_pct": "Margen contribución (%)",
    "overhead": "Overhead repercutido (€)", "net": "Resultado neto (€)", "net_pct": "Margen neto (%)",
}


def _r(x: float) -> float | str:
    return "∞" if isinstance(x, float) and math.isinf(x) else round(float(x), 2)


def summary_frame(report: FinanceReport, months: list[str] | None = None) -> pd.DataFrame:
    months = months or report.months
    k = report.company(months)
    rows = [
        ("Periodo", "Desde", months[0]), ("Periodo", "Hasta", months[-1]),
        ("Periodo", "Fecha de corte", report.dataset.as_of.isoformat()),
        ("Periodo", "Fuente de datos", report.dataset.source),
        ("Devengo", "Ingresos totales (€)", _r(k.revenue)),
        ("Devengo", "Gastos totales (€)", _r(k.expenses)),
        ("Devengo", "Costes directos (€)", _r(k.direct_costs)),
        ("Devengo", "Gasto común / overhead (€)", _r(k.overhead)),
        ("Devengo", "Gasto sin asignar (€)", _r(k.unassigned_costs)),
        ("Devengo", "Margen neto (€)", _r(k.net)),
        ("Devengo", "Margen neto (%)", _r(k.net_pct)),
        ("Devengo", "% gastos directos", _r(k.direct_share)),
        ("Devengo", "% gastos comunes", _r(k.overhead_share)),
        ("Caja", "Cobros (€)", _r(k.cash_in)),
        ("Caja", "Pagos (€)", _r(k.cash_out)),
        ("Caja", "Tesorería actual (€)", _r(k.treasury)),
        ("Caja", "Burn rate bruto mensual (€)", _r(k.gross_burn)),
        ("Caja", "Burn rate neto mensual (€)", _r(k.net_burn)),
        ("Caja", "Runway neto (meses)", _r(k.runway_months)),
        ("Caja", "Runway sin ingresos (meses)", _r(k.runway_gross_months)),
        ("Circulante", "Pendiente de cobro (€)", _r(k.receivables)),
        ("Circulante", "Cobros vencidos (€)", _r(k.receivables_overdue)),
        ("Circulante", "Pendiente de pago (€)", _r(k.payables)),
        ("Circulante", "Pagos vencidos (€)", _r(k.payables_overdue)),
        ("Auditoría", "Alertas abiertas", len(report.alerts)),
    ]
    return pd.DataFrame(rows, columns=["Sección", "Métrica", "Valor"])


def pnl_frame(report: FinanceReport, months: list[str] | None = None, allocation: str | None = None) -> pd.DataFrame:
    df = report.project_pnl(months, allocation)[list(PNL_HEADERS)].rename(columns=PNL_HEADERS)
    return df.round(2)


def transactions_frame(report: FinanceReport, months: list[str] | None = None) -> pd.DataFrame:
    df = report.accrual
    if months:
        df = df[df["month"].isin(months)]
    out = df.assign(
        Fecha=df["date"].dt.strftime("%Y-%m-%d"),
        Tipo=df["kind"].map({"income": "Ingreso", "expense": "Gasto"}),
        Proyecto=df["project"].map(report.rules.label),
    )[["Fecha", "Tipo", "Proyecto", "doc_number", "contact", "concept", "amount", "method", "status"]]
    return out.rename(columns={"doc_number": "Documento", "contact": "Contacto", "concept": "Concepto",
                               "amount": "Base imponible (€)", "method": "Regla de imputación",
                               "status": "Estado"}).round(2)


def alerts_frame(report: FinanceReport) -> pd.DataFrame:
    return pd.DataFrame([{
        "Severidad": a.severity.value, "Tipo": a.category, "Referencia": a.title, "Detalle": a.detail,
        "Importe (€)": round(a.amount, 2), "Fecha": a.date.isoformat(),
        "Proyecto": report.rules.label(a.project) if a.project else "", "Acción": a.action,
    } for a in report.alerts])


def _sheet_values(df: pd.DataFrame) -> list[list[Any]]:
    clean = df.astype(object).where(pd.notna(df), "")
    return [list(df.columns)] + clean.values.tolist()


def sheets_payload(report: FinanceReport, months: list[str] | None = None, allocation: str | None = None) -> dict:
    sheets = {
        "Resumen": summary_frame(report, months),
        "PyG Proyectos": pnl_frame(report, months, allocation),
        "Transacciones": transactions_frame(report, months),
        "Alertas": alerts_frame(report),
    }
    return {
        "valueInputOption": "USER_ENTERED",
        "data": [{"range": f"'{name}'!A1", "majorDimension": "ROWS", "values": _sheet_values(df)}
                 for name, df in sheets.items()],
    }


def csv_bytes(df: pd.DataFrame) -> bytes:
    # BOM + ; para que Excel en español lo abra bien a la primera
    return df.to_csv(index=False, sep=";", decimal=",").encode("utf-8-sig")


def zip_bundle(report: FinanceReport, months: list[str] | None = None, allocation: str | None = None) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("resumen.csv", csv_bytes(summary_frame(report, months)))
        z.writestr("pyg_proyectos.csv", csv_bytes(pnl_frame(report, months, allocation)))
        z.writestr("transacciones.csv", csv_bytes(transactions_frame(report, months)))
        z.writestr("alertas.csv", csv_bytes(alerts_frame(report)))
        z.writestr("google_sheets_batchUpdate.json",
                   json.dumps(sheets_payload(report, months, allocation), ensure_ascii=False, indent=2))
    return buf.getvalue()


def write_bundle(report: FinanceReport, out_dir: Path, months: list[str] | None = None) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = {
        "resumen.csv": csv_bytes(summary_frame(report, months)),
        "pyg_proyectos.csv": csv_bytes(pnl_frame(report, months)),
        "transacciones.csv": csv_bytes(transactions_frame(report, months)),
        "alertas.csv": csv_bytes(alerts_frame(report)),
        "google_sheets_batchUpdate.json": json.dumps(
            sheets_payload(report, months), ensure_ascii=False, indent=2).encode("utf-8"),
    }
    paths = []
    for name, data in files.items():
        path = out_dir / name
        path.write_bytes(data)
        paths.append(path)
    return paths
