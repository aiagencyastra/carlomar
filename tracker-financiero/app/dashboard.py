"""Tracker Financiero · dashboard Streamlit.

Arranque:  python main.py           (o)   streamlit run app/dashboard.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for p in (ROOT / "src", ROOT / "app"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

import json  # noqa: E402

import pandas as pd  # noqa: E402
import streamlit as st  # noqa: E402

import ui  # noqa: E402
from tracker.config import load_settings  # noqa: E402
from tracker.engine.reconciliation import JUSTIFIED, Overrides  # noqa: E402
from tracker.engine.report import FinanceReport, build_report  # noqa: E402
from tracker.engine.rules import OVERHEAD, UNASSIGNED, Rules, load_rules  # noqa: E402
from tracker.exporter import (  # noqa: E402
    alerts_frame, csv_bytes, pnl_frame, sheets_payload, summary_frame, transactions_frame, zip_bundle,
)
from tracker.pipeline.ingest import load_dataset  # noqa: E402
from tracker.pipeline.models import Dataset, DocKind, PayStatus  # noqa: E402

st.set_page_config(page_title="Tracker Financiero", page_icon="📈", layout="wide",
                   initial_sidebar_state="expanded")
st.markdown(ui.CSS, unsafe_allow_html=True)

ALLOCATIONS = {"Prorrata de ingresos": "revenue", "A partes iguales": "equal", "No repercutir": "none"}
STATUS_ES = {"paid": "Cobrada/pagada", "partial": "Parcial", "pending": "Pendiente",
             "overdue": "Vencida", "cancelled": "Anulada"}


# ------------------------------------------------------------------ datos
@st.cache_data(ttl=600, show_spinner="Sincronizando con Holded…")
def get_dataset(force_mock: bool) -> Dataset:
    return load_dataset(load_settings(force_mock=force_mock))


@st.cache_resource
def get_rules() -> Rules:
    return load_rules(load_settings().rules_path)


def overrides() -> Overrides:
    if "overrides" not in st.session_state:
        st.session_state.overrides = Overrides()
    return st.session_state.overrides


def flash(msg: str) -> None:
    st.session_state.flash = msg


settings = load_settings()
dataset = get_dataset(settings.use_mock)
rules = get_rules()
report: FinanceReport = build_report(dataset, rules, overrides())
colors = ui.project_colors(rules.project_ids)
current_month = f"{dataset.as_of:%Y-%m}"

if msg := st.session_state.pop("flash", None):
    st.toast(msg, icon="✅")

# --------------------------------------------------------------- sidebar
with st.sidebar:
    st.markdown("### ⚙️ Controles")
    period = st.select_slider(
        "Periodo", options=report.months, value=(report.months[0], report.months[-1]),
        format_func=lambda m: ui.months_label(m),
    )
    months = report.months[report.months.index(period[0]): report.months.index(period[1]) + 1]
    basis = st.segmented_control("Criterio contable", ["Devengo", "Caja"], default="Devengo",
                                 help="Devengo: por fecha de factura, sin IVA. Caja: cobros y pagos reales.")
    basis = basis or "Devengo"
    alloc_label = st.selectbox("Reparto del overhead", list(ALLOCATIONS), index=0,
                               help="Cómo se repercuten los gastos comunes a cada proyecto.")
    allocation = ALLOCATIONS[alloc_label]

    st.divider()
    ov = overrides()
    n_changes = len(ov.projects) + len(ov.payment_links) + len(ov.resolved)
    st.caption(f"Cambios de conciliación en esta sesión: **{n_changes}**")
    c1, c2 = st.columns(2)
    if c1.button("↺ Reiniciar", width="stretch", disabled=n_changes == 0):
        st.session_state.overrides = Overrides()
        flash("Demo reiniciada")
        st.rerun()
    if c2.button("⟳ Sincronizar", width="stretch"):
        get_dataset.clear()
        flash("Datos recargados desde la fuente")
        st.rerun()
    st.divider()
    src = "Fixture local (demo)" if dataset.source == "demo" else "API Holded"
    st.caption(f"**Fuente:** {src}  \n**Documentos:** {len(dataset.documents)} · "
               f"**Movimientos:** {len(dataset.payments)}  \n**Reglas:** `config/projects.json`")

# ---------------------------------------------------------------- header
badge = ('<span class="badge demo"><span class="dot"></span>MODO DEMO · datos sintéticos</span>'
         if dataset.source == "demo" else
         '<span class="badge live"><span class="dot"></span>CONECTADO A HOLDED</span>')
st.markdown(
    f'<div class="hero"><div><h1>Tracker Financiero · {dataset.company}</h1>'
    f'<div class="sub">{len(rules.projects)} proyectos · datos a {dataset.as_of:%d/%m/%Y} · '
    f'periodo {ui.months_label(months[0])} – {ui.months_label(months[-1])} · criterio {basis.lower()}'
    f'</div></div>{badge}</div>', unsafe_allow_html=True)
for w in dataset.warnings:
    if "no disponible" in w:
        st.warning(w, icon="⚠️")

k = report.company(months)
pnl = report.project_pnl(months, allocation) if basis == "Devengo" else report.project_cash_pnl(months, allocation)
n_alerts = len(report.alerts)

tab_global, tab_project, tab_recon, tab_export = st.tabs(
    ["📊  Visión global", "🔎  Por proyecto", f"🚨  Conciliación ({n_alerts})", "⬇️  Exportar"])

# ================================================================ GLOBAL
with tab_global:
    c = st.columns(4)
    c[0].markdown(ui.kpi_card(
        "Tesorería actual", ui.eur(k.treasury),
        f"{len(dataset.accounts)} cuentas · {ui.eur(k.receivables)} pendiente de cobro"), unsafe_allow_html=True)
    c[1].markdown(ui.kpi_card(
        f"Facturación {ui.months_label(k.last_month)}", ui.eur(k.last_month_revenue),
        ui.delta_html(k.last_month_delta_pct)), unsafe_allow_html=True)
    runway_cls = "down" if k.runway_months < 6 else "up"
    c[2].markdown(ui.kpi_card(
        "Runway estimado", ui.runway_label(k.runway_months),
        f'Burn neto <span class="{runway_cls}">{ui.eur(k.net_burn)}/mes</span> · '
        f'bruto {ui.eur(k.gross_burn)}/mes'), unsafe_allow_html=True)
    if basis == "Devengo":
        margin_value, margin_pct = k.net, k.net_pct
        margin_foot = f"Ingresos {ui.compact_eur(k.revenue)} · gastos {ui.compact_eur(k.expenses)}"
    else:
        margin_value = k.cash_in - k.cash_out
        margin_pct = (margin_value / k.cash_in * 100) if k.cash_in else 0
        margin_foot = f"Cobros {ui.compact_eur(k.cash_in)} · pagos {ui.compact_eur(k.cash_out)}"
    cls = "up" if margin_value >= 0 else "down"
    c[3].markdown(ui.kpi_card(
        "Margen global" if basis == "Devengo" else "Flujo de caja neto",
        f'{ui.pct(margin_pct)}', f'<span class="{cls}">{ui.eur(margin_value, sign=True)}</span> · {margin_foot}'),
        unsafe_allow_html=True)

    st.write("")
    c = st.columns(4)
    c[0].markdown(ui.kpi_card("Ingresos del periodo", ui.eur(k.revenue if basis == "Devengo" else k.cash_in),
                              "Base imponible facturada" if basis == "Devengo" else "Cobros recibidos", small=True),
                  unsafe_allow_html=True)
    c[1].markdown(ui.kpi_card("Gastos del periodo", ui.eur(k.expenses if basis == "Devengo" else k.cash_out),
                              "Incluye nóminas y SS" if basis == "Devengo" else "Incluye impuestos liquidados",
                              small=True), unsafe_allow_html=True)
    c[2].markdown(ui.kpi_card("Cobros vencidos", ui.eur(k.receivables_overdue),
                              f'<span class="down">{sum(1 for a in report.alerts if a.category == "Cobro vencido")}'
                              f' facturas</span> por reclamar', small=True), unsafe_allow_html=True)
    c[3].markdown(ui.kpi_card("Gasto imputado a proyecto", ui.pct(100 - k.unassigned_share),
                              f"{ui.eur(k.unassigned_costs)} sin asignar", small=True), unsafe_allow_html=True)

    st.markdown('<div class="section-title">Cash flow mensual y saldo de tesorería</div>'
                '<div class="section-sub">Cobros y pagos reales por mes; la línea es el saldo a fin de mes '
                'reconstruido desde el saldo bancario actual. * = mes en curso.</div>', unsafe_allow_html=True)
    st.plotly_chart(ui.cashflow_chart(report.monthly_cash(months), current_month), width="stretch",
                    config={"displayModeBar": False})

    left, right = st.columns([1.15, 1])
    with left:
        st.markdown('<div class="section-title">Ingresos por proyecto</div>'
                    '<div class="section-sub">Facturación mensual (base imponible) apilada por proyecto.</div>',
                    unsafe_allow_html=True)
        st.plotly_chart(ui.stacked_revenue_chart(report.revenue_by_project(months), rules.names, colors,
                                                 current_month), width="stretch",
                        config={"displayModeBar": False})
    with right:
        st.markdown(f'<div class="section-title">Rentabilidad por proyecto</div>'
                    f'<div class="section-sub">{"Ingresos" if basis == "Devengo" else "Cobros"} vs costes '
                    f'(directos + overhead · {alloc_label.lower()}). Etiqueta = resultado neto.</div>',
                    unsafe_allow_html=True)
        proj_only = pnl[pnl["project"].isin(rules.project_ids)]
        st.plotly_chart(ui.project_bars_chart(proj_only, colors), width="stretch",
                        config={"displayModeBar": False})

    st.markdown('<div class="section-title">Estructura del gasto</div>'
                '<div class="section-sub">Peso de los gastos directos de proyecto frente a los comunes (devengo).</div>',
                unsafe_allow_html=True)
    st.markdown(ui.split_bar([
        ("Directo de proyecto", k.direct_costs, "#3987e5"),
        ("Común / overhead", k.overhead, ui.NEUTRAL[OVERHEAD]),
        ("Sin asignar", k.unassigned_costs, ui.STATUS["warning"]),
    ]), unsafe_allow_html=True)

    st.markdown(f'<div class="section-title">Cuenta de resultados por proyecto · {basis.lower()}</div>',
                unsafe_allow_html=True)
    table = pnl.copy()
    total = table[["revenue", "direct_costs", "contribution", "overhead", "net"]].sum()
    table.loc[len(table)] = {"project": "total", "name": "TOTAL", **total.to_dict(),
                             "contribution_pct": total["contribution"] / total["revenue"] * 100 if total["revenue"] else 0,
                             "net_pct": total["net"] / total["revenue"] * 100 if total["revenue"] else 0}
    view = pd.DataFrame({
        "Proyecto": table["name"],
        "Ingresos" if basis == "Devengo" else "Cobros": table["revenue"].map(ui.eur),
        "Costes directos": table["direct_costs"].map(ui.eur),
        "Margen contribución": table["contribution"].map(ui.eur),
        "Contrib. %": table["contribution_pct"].map(ui.pct),
        "Overhead repercutido": table["overhead"].map(ui.eur),
        "Resultado neto": table["net"].map(lambda v: ("🟢 " if v >= 0 else "🔴 ") + ui.eur(v)),
        "Margen neto %": table["net_pct"].map(ui.pct),
    })
    st.dataframe(view, hide_index=True, width="stretch")

# =============================================================== PROJECT
with tab_project:
    options = rules.project_ids + [OVERHEAD, UNASSIGNED]
    pid = st.pills("Proyecto", options, default=rules.project_ids[0], format_func=rules.label,
                   key="project_pick") or rules.project_ids[0]
    row = pnl[pnl["project"] == pid]
    r = row.iloc[0] if len(row) else None
    acc = report.accrual[(report.accrual["project"] == pid) & report.accrual["month"].isin(months)]
    docs_by_id = dataset.documents_by_id
    proj_docs = {d for d in acc["doc_id"].dropna()}
    receivable = sum(docs_by_id[d].pending for d in proj_docs
                     if docs_by_id[d].kind is DocKind.INCOME and docs_by_id[d].status is not PayStatus.PAID)

    st.markdown(f'<span class="legend-dot" style="background:{colors.get(pid, "#888")};width:14px;height:14px">'
                f'</span> <b style="font-size:1.35rem">{rules.label(pid)}</b>', unsafe_allow_html=True)
    if pid in rules.project_ids and r is not None:
        c = st.columns(5)
        share = r["revenue"] / pnl["revenue"].sum() * 100 if pnl["revenue"].sum() else 0
        c[0].markdown(ui.kpi_card("Ingresos" if basis == "Devengo" else "Cobros", ui.eur(r["revenue"]),
                                  f"{ui.pct(share)} del total", small=True), unsafe_allow_html=True)
        c[1].markdown(ui.kpi_card("Costes directos", ui.eur(r["direct_costs"]),
                                  f'Contribución {ui.pct(r["contribution_pct"])}', small=True), unsafe_allow_html=True)
        c[2].markdown(ui.kpi_card("Overhead", ui.eur(r["overhead"]), alloc_label, small=True),
                      unsafe_allow_html=True)
        cls = "up" if r["net"] >= 0 else "down"
        c[3].markdown(ui.kpi_card("Resultado neto", f'<span class="{cls}">{ui.eur(r["net"])}</span>',
                                  f'Margen neto {ui.pct(r["net_pct"])}', small=True), unsafe_allow_html=True)
        c[4].markdown(ui.kpi_card("Pendiente de cobro", ui.eur(receivable),
                                  f"{sum(1 for a in report.alerts if a.project == pid and a.category == 'Cobro vencido')}"
                                  " facturas vencidas", small=True), unsafe_allow_html=True)
    else:
        spent = acc.loc[acc["kind"] == "expense", "amount"].sum()
        st.markdown(ui.kpi_card("Gasto del periodo", ui.eur(spent),
                                "Se reparte entre proyectos según el criterio elegido" if pid == OVERHEAD
                                else "Requiere revisión: ve a la pestaña Conciliación"), unsafe_allow_html=True)

    series = (report.monthly_accrual(months, pid) if basis == "Devengo"
              else report.monthly_project_cash(months, pid))
    st.markdown('<div class="section-title">Evolución mensual</div>'
                '<div class="section-sub">Costes directos del proyecto (sin overhead) y resultado de cada mes.</div>',
                unsafe_allow_html=True)
    labels = ("Ingresos", "Costes directos") if basis == "Devengo" else ("Cobros", "Pagos")
    st.plotly_chart(ui.pnl_monthly_chart(series, current_month, labels, "Resultado del mes"), width="stretch",
                    config={"displayModeBar": False})

    left, right = st.columns([1, 1.6])
    with left:
        st.markdown('<div class="section-title">Principales proveedores</div>', unsafe_allow_html=True)
        sup = (acc[acc["kind"] == "expense"].groupby("contact", as_index=False)["amount"].sum()
               .nlargest(8, "amount"))
        if len(sup):
            st.plotly_chart(ui.supplier_chart(sup, colors.get(pid, "#3987e5")), width="stretch",
                            config={"displayModeBar": False})
        else:
            st.caption("Sin gastos imputados en el periodo.")
    with right:
        st.markdown('<div class="section-title">Transacciones imputadas</div>'
                    '<div class="section-sub">Cada línea indica la regla que la asignó a este proyecto.</div>',
                    unsafe_allow_html=True)
        tx = acc.sort_values("date", ascending=False).assign(
            Fecha=lambda d: d["date"].dt.date,
            Tipo=lambda d: d["kind"].map({"income": "↗ Ingreso", "expense": "↘ Gasto"}),
            Estado=lambda d: d["status"].map(STATUS_ES),
        )[["Fecha", "Tipo", "doc_number", "contact", "concept", "amount", "method", "evidence", "Estado"]]
        st.dataframe(tx, hide_index=True, width="stretch", height=360, column_config={
            "doc_number": "Documento", "contact": "Contacto", "concept": "Concepto",
            "amount": st.column_config.NumberColumn("Base", format="%.2f €"),
            "method": "Regla", "evidence": "Evidencia",
        })

# ========================================================== RECONCILIATION
with tab_recon:
    by_cat: dict[str, list] = {}
    for a in report.alerts:
        by_cat.setdefault(a.category, []).append(a)
    cats = ["Cobro vencido", "Pago vencido", "Sin proyecto asignado", "Movimiento sin factura",
            "Partida sin validar", "Pagada sin movimiento bancario"]
    c = st.columns(5)
    for col, cat in zip(c, cats[:5]):
        items = by_cat.get(cat, [])
        short = {"Sin proyecto asignado": "Sin proyecto", "Movimiento sin factura": "Sin factura",
                 "Partida sin validar": "Sin validar"}.get(cat, cat)
        col.markdown(ui.kpi_card(short, str(len(items)), ui.eur(sum(abs(a.amount) for a in items)), small=True),
                     unsafe_allow_html=True)

    labels_all = {pid: rules.label(pid) for pid in rules.project_ids + [OVERHEAD]}
    inv_labels = {v: k for k, v in labels_all.items()}

    # ---- Gastos sin proyecto: reasignar
    st.markdown('<div class="section-title">🧭 Gastos sin proyecto asignado</div>'
                '<div class="section-sub">Elige el destino de cada gasto y pulsa «Aplicar»: el P&L y los KPIs '
                'se recalculan al instante.</div>', unsafe_allow_html=True)
    un = by_cat.get("Sin proyecto asignado", [])
    if un:
        pending = "— elegir —"
        with st.form("form_unassigned", border=True):
            choices: dict[str, str] = {}
            for a in un:
                c1, c2, c3 = st.columns([4.2, 1.1, 2.2], vertical_alignment="center")
                c1.markdown(f"**{a.title}**  \n<span style='color:#7e828f;font-size:.85rem'>"
                            f"{a.date:%d/%m/%Y} · {a.detail}</span>", unsafe_allow_html=True)
                c2.markdown(f"**{ui.eur(a.amount, 2)}**")
                choices[a.doc_id] = c3.selectbox("Asignar a", [pending] + list(labels_all.values()),
                                                 key=f"assign_{a.doc_id}", label_visibility="collapsed")
            if st.form_submit_button("Aplicar reasignación", type="primary"):
                chosen = {d: inv_labels[v] for d, v in choices.items() if v != pending}
                overrides().projects.update(chosen)
                if chosen:
                    flash(f"{len(chosen)} gasto(s) reasignado(s) · KPIs recalculados")
                    st.rerun()
                st.info("Elige al menos un destino en los desplegables.")
    else:
        st.success("Todo el gasto está imputado a un proyecto u overhead. 🎯")

    # ---- Movimientos sin factura: conciliar
    st.markdown('<div class="section-title">🏦 Movimientos bancarios sin factura</div>'
                '<div class="section-sub">Empareja el movimiento con un documento o márcalo como justificado.</div>',
                unsafe_allow_html=True)
    nodoc = by_cat.get("Movimiento sin factura", [])
    if nodoc:
        open_docs = [d for d in dataset.documents if not d.is_draft and d.status is not PayStatus.CANCELLED]
        pending = "— elegir —"
        just = "✔ Justificar sin factura"
        with st.form("form_nodoc", border=True):
            links: dict[str, str] = {}
            doc_opts_by_payment: dict[str, dict[str, str]] = {}
            for a in nodoc:
                # Solo documentos del mismo signo (cobro <-> venta, pago <-> compra), los más parecidos primero
                kind = DocKind.INCOME if a.amount > 0 else DocKind.EXPENSE
                cands = sorted((d for d in open_docs if d.kind is kind),
                               key=lambda d: (abs(d.total - abs(a.amount)), abs((d.issue_date - a.date).days)))[:25]
                opts = {f"{d.number} · {d.contact_name} · {ui.eur(d.total, 2)}": d.id for d in cands}
                doc_opts_by_payment[a.payment_id] = opts
                c1, c2, c3 = st.columns([4.2, 1.1, 2.2], vertical_alignment="center")
                c1.markdown(f"**{a.title}**  \n<span style='color:#7e828f;font-size:.85rem'>"
                            f"{a.date:%d/%m/%Y} · {a.detail}</span>", unsafe_allow_html=True)
                c2.markdown(f"**{ui.eur(a.amount, 2, sign=True)}**")
                links[a.payment_id] = c3.selectbox("Conciliar con", [pending, just] + list(opts),
                                                   key=f"link_{a.payment_id}", label_visibility="collapsed")
            if st.form_submit_button("Conciliar movimientos", type="primary"):
                chosen = {pid: (JUSTIFIED if v == just else doc_opts_by_payment[pid][v])
                          for pid, v in links.items() if v != pending}
                overrides().payment_links.update(chosen)
                if chosen:
                    flash(f"{len(chosen)} movimiento(s) conciliado(s)")
                    st.rerun()
                st.info("Elige un documento o «Justificar» en los desplegables.")
    else:
        st.success("Todos los movimientos bancarios tienen soporte. 🎯")

    # ---- Vencidos y borradores
    st.markdown('<div class="section-title">⏰ Cobros y pagos vencidos · partidas sin validar</div>'
                '<div class="section-sub">Ordenado por gravedad e importe. Marca como gestionado para archivar.'
                '</div>', unsafe_allow_html=True)
    rest = [a for a in report.alerts if a.category in ("Cobro vencido", "Pago vencido", "Partida sin validar",
                                                        "Pagada sin movimiento bancario")]
    if not rest:
        st.success("Sin vencidos ni borradores pendientes. 🎯")
    for a in rest:
        col_a, col_b = st.columns([6, 1.1])
        col_a.markdown(ui.alert_html(
            a.severity.value, f"{a.category} · {a.title}", a.detail, ui.eur(abs(a.amount)),
            [rules.label(a.project) if a.project else "", f"{a.date:%d/%m/%Y}"]), unsafe_allow_html=True)
        label = {"reclamar": "📨 Reclamado", "pagar": "💸 Pagado", "validar": "✔ Validar"}.get(a.action, "✔ Hecho")
        if col_b.button(label, key=f"resolve_{a.id}", width="stretch"):
            overrides().resolved.add(a.id)
            flash(f"{a.title}: marcado como gestionado")
            st.rerun()

# ================================================================ EXPORT
with tab_export:
    st.markdown('<div class="section-title">Exportar resumen consolidado</div>'
                f'<div class="section-sub">Periodo {ui.months_label(months[0])} – {ui.months_label(months[-1])}, '
                f'reparto de overhead «{alloc_label.lower()}». Incluye los cambios de conciliación de esta sesión.'
                '</div>', unsafe_allow_html=True)
    summary = summary_frame(report, months)
    left, right = st.columns([1, 1.3])
    with left:
        shown = summary.assign(Valor=summary["Valor"].map(
            lambda v: f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            if isinstance(v, float) else str(v)))
        st.dataframe(shown, hide_index=True, width="stretch", height=420)
    with right:
        stamp = f"{dataset.as_of:%Y%m%d}"
        st.download_button("📦 Descargar todo (ZIP: CSVs + JSON Sheets)", zip_bundle(report, months, allocation),
                           f"tracker_financiero_{stamp}.zip", "application/zip", type="primary",
                           width="stretch")
        c1, c2 = st.columns(2)
        c1.download_button("Resumen KPIs · CSV", csv_bytes(summary), f"resumen_{stamp}.csv", "text/csv",
                           width="stretch")
        c2.download_button("PyG por proyecto · CSV", csv_bytes(pnl_frame(report, months, allocation)),
                           f"pyg_proyectos_{stamp}.csv", "text/csv", width="stretch")
        c1.download_button("Transacciones · CSV", csv_bytes(transactions_frame(report, months)),
                           f"transacciones_{stamp}.csv", "text/csv", width="stretch")
        c2.download_button("Alertas · CSV", csv_bytes(alerts_frame(report)), f"alertas_{stamp}.csv", "text/csv",
                           width="stretch")
        payload = sheets_payload(report, months, allocation)
        st.download_button("Google Sheets · JSON (values.batchUpdate)",
                           json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
                           f"google_sheets_{stamp}.json", "application/json", width="stretch")
        st.caption("El JSON sigue el cuerpo de `spreadsheets.values.batchUpdate` de la API de Google Sheets: "
                   "4 pestañas (Resumen, PyG Proyectos, Transacciones, Alertas) listas para volcar con un POST.")
        with st.expander("Vista previa del payload de Sheets"):
            preview = {**payload, "data": [{**d, "values": d["values"][:4]} for d in payload["data"]]}
            st.json(preview, expanded=False)
