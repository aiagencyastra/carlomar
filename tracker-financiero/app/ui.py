"""Estilos, formato numérico y gráficos del dashboard."""

from __future__ import annotations

import html
import math

import pandas as pd
import plotly.graph_objects as go

from tracker.engine.rules import OVERHEAD, UNASSIGNED

# Paleta categórica validada (CVD-safe) para superficie oscura, en orden fijo:
# el color sigue al proyecto, nunca a su posición en un ranking.
SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#008300", "#e66767"]
NEUTRAL = {OVERHEAD: "#7d8190", UNASSIGNED: "#4f5462"}
INK = {"primary": "#f2f3f5", "secondary": "#b9bcc6", "muted": "#7e828f", "grid": "#252a35", "axis": "#343a47"}
STATUS = {"critical": "#d03b3b", "serious": "#ec835a", "warning": "#fab219", "good": "#0ca30c"}
STATUS_ICON = {"critical": "⛔", "serious": "⚠️", "warning": "🔸"}
IN_COLOR, OUT_COLOR, LINE_COLOR = "#3987e5", "#d95926", "#f2f3f5"

MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def project_colors(project_ids: list[str]) -> dict[str, str]:
    colors = {pid: SERIES[i % len(SERIES)] for i, pid in enumerate(project_ids)}
    colors.update(NEUTRAL)
    return colors


# ----------------------------------------------------------------- formato
def eur(x: float, decimals: int = 0, sign: bool = False) -> str:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return "—"
    s = f"{abs(x):,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    prefix = "-" if x < 0 else ("+" if sign and x > 0 else "")
    return f"{prefix}{s} €"


def pct(x: float, decimals: int = 1, sign: bool = False) -> str:
    s = f"{abs(x):.{decimals}f}".replace(".", ",")
    prefix = "-" if x < 0 else ("+" if sign and x > 0 else "")
    return f"{prefix}{s} %"


def compact_eur(x: float) -> str:
    if abs(x) >= 1_000_000:
        return f"{x / 1_000_000:.1f} M€".replace(".", ",")
    if abs(x) >= 10_000:
        return f"{x / 1000:.0f}k €"
    if abs(x) >= 1000:
        return f"{x / 1000:.1f}k €".replace(".", ",")
    return eur(x)


def months_label(m: str, current: str | None = None, br: bool = False) -> str:
    y, mm = m.split("-")
    label = f"{MESES[int(mm) - 1]}{'<br>' if br else ' '}{y[2:]}"
    return f"{label}*" if current and m == current else label


def runway_label(months: float) -> str:
    if math.isinf(months):
        return "∞"
    return f"{months:.1f}".replace(".", ",") + " meses"


# --------------------------------------------------------------------- CSS
CSS = """
<style>
:root {
  --surface: #151821; --surface-2: #1b1f2a; --border: rgba(255,255,255,0.08);
  --ink: #f2f3f5; --ink-2: #b9bcc6; --muted: #7e828f;
  --good: #3fbf6a; --bad: #ef6b6b; --accent: #3987e5;
}
.block-container { padding-top: 1.6rem; padding-bottom: 3rem; max-width: 1400px; }
h1, h2, h3 { letter-spacing: -0.01em; }
[data-testid="stSidebar"] { border-right: 1px solid var(--border); }
.hero { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; flex-wrap:wrap;
        margin-bottom: 1.1rem; }
.hero h1 { font-size: 1.75rem; margin: 0; padding: 0; color: var(--ink); font-weight: 700; }
.hero .sub { color: var(--muted); font-size: .9rem; margin-top: .2rem; }
.badge { display:inline-flex; align-items:center; gap:.4rem; padding:.28rem .7rem; border-radius:999px;
         font-size:.78rem; font-weight:600; letter-spacing:.02em; border:1px solid var(--border); }
.badge.demo { background: rgba(250,178,25,.12); color:#fab219; }
.badge.live { background: rgba(12,163,12,.14); color:#3fbf6a; }
.badge .dot { width:7px; height:7px; border-radius:50%; background: currentColor; }
.kpi { background: var(--surface); border:1px solid var(--border); border-radius:14px;
       padding: 1rem 1.1rem .9rem; height: 100%; }
.kpi .label { color: var(--muted); font-size:.78rem; text-transform: uppercase; letter-spacing:.06em;
              font-weight:600; }
.kpi .value { color: var(--ink); font-size: 1.85rem; font-weight: 700; margin-top:.25rem; line-height:1.15; }
.kpi .value.small { font-size: 1.35rem; }
.kpi .foot { color: var(--ink-2); font-size:.82rem; margin-top:.35rem; }
.kpi .up { color: var(--good); font-weight:600; }
.kpi .down { color: var(--bad); font-weight:600; }
.section-title { color: var(--ink); font-weight:650; font-size:1.05rem; margin: 1.2rem 0 .1rem; }
.section-sub { color: var(--muted); font-size:.85rem; margin-bottom:.4rem; }
.alert-row { display:flex; gap:.8rem; align-items:flex-start; padding:.7rem .9rem; border-radius:10px;
             background: var(--surface); border:1px solid var(--border); margin-bottom:.45rem; }
.alert-row .bar { width:4px; align-self:stretch; border-radius:4px; }
.alert-row .t { color: var(--ink); font-weight:600; font-size:.92rem; }
.alert-row .d { color: var(--ink-2); font-size:.82rem; }
.alert-row .amt { margin-left:auto; color: var(--ink); font-weight:650; white-space:nowrap; }
.chip { display:inline-block; padding:.12rem .55rem; border-radius:999px; font-size:.72rem; font-weight:600;
        background: var(--surface-2); color: var(--ink-2); border:1px solid var(--border); margin-right:.3rem; }
.legend-dot { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:.35rem;
              vertical-align: middle; }
div[data-testid="stTabs"] button p { font-size: .95rem; font-weight: 600; }
</style>
"""


def kpi_card(label: str, value: str, foot: str = "", small: bool = False) -> str:
    cls = "value small" if small else "value"
    return (f'<div class="kpi"><div class="label">{html.escape(label)}</div>'
            f'<div class="{cls}">{value}</div><div class="foot">{foot}</div></div>')


def delta_html(delta_pct: float, good_when_up: bool = True, suffix: str = "vs mes anterior") -> str:
    if delta_pct == 0:
        return f'<span>= {suffix}</span>'
    up = delta_pct > 0
    cls = "up" if up == good_when_up else "down"
    arrow = "▲" if up else "▼"
    return f'<span class="{cls}">{arrow} {pct(abs(delta_pct))}</span> {suffix}'


def alert_html(severity: str, title: str, detail: str, amount: str, chips: list[str]) -> str:
    chip_html = "".join(f'<span class="chip">{html.escape(c)}</span>' for c in chips if c)
    return (f'<div class="alert-row"><div class="bar" style="background:{STATUS[severity]}"></div>'
            f'<div><div class="t">{STATUS_ICON[severity]} {html.escape(title)}</div>'
            f'<div class="d">{html.escape(detail)}</div><div style="margin-top:.3rem">{chip_html}</div></div>'
            f'<div class="amt">{amount}</div></div>')


# ------------------------------------------------------------------ charts
def _base_layout(fig: go.Figure, height: int = 360, legend: bool = True) -> go.Figure:
    fig.update_layout(
        height=height, margin=dict(l=8, r=8, t=12, b=8),
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="system-ui, -apple-system, Segoe UI, sans-serif", color=INK["secondary"], size=12),
        separators=",.", hovermode="x unified",
        hoverlabel=dict(bgcolor="#1b1f2a", bordercolor="#343a47", font=dict(color=INK["primary"])),
        showlegend=legend,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0, font=dict(size=12),
                    bgcolor="rgba(0,0,0,0)", traceorder="normal"),
        barcornerradius=4, bargap=0.28,
    )
    fig.update_xaxes(showgrid=False, linecolor=INK["axis"], tickfont=dict(color=INK["muted"]), ticks="",
                     tickangle=0)
    fig.update_yaxes(gridcolor=INK["grid"], zerolinecolor=INK["axis"], zerolinewidth=1,
                     tickfont=dict(color=INK["muted"]), ticksuffix=" €", separatethousands=True)
    return fig


def cashflow_chart(cash: pd.DataFrame, current: str) -> go.Figure:
    x = [months_label(m, current, br=True) for m in cash["month"]]
    fig = go.Figure()
    fig.add_bar(x=x, y=cash["inflow"], name="Cobros", marker_color=IN_COLOR,
                hovertemplate="%{y:,.0f} €<extra>Cobros</extra>")
    fig.add_bar(x=x, y=-cash["outflow"], name="Pagos", marker_color=OUT_COLOR,
                hovertemplate="%{y:,.0f} €<extra>Pagos</extra>")
    fig.add_scatter(x=x, y=cash["balance"], name="Saldo de tesorería", mode="lines+markers",
                    line=dict(color=LINE_COLOR, width=2), marker=dict(size=8, line=dict(color="#0e1117", width=2)),
                    hovertemplate="%{y:,.0f} €<extra>Saldo</extra>")
    last = cash.iloc[-1]
    fig.add_annotation(x=x[-1], y=last["balance"], text=f"<b>{compact_eur(last['balance'])}</b>",
                       showarrow=False, yshift=16, font=dict(color=INK["primary"], size=12))
    fig.update_layout(barmode="relative")
    return _base_layout(fig, 380)


def pnl_monthly_chart(series: pd.DataFrame, current: str, labels: tuple[str, str] = ("Ingresos", "Gastos"),
                      line_label: str = "Resultado del mes", line_col: str = "net", height: int = 340) -> go.Figure:
    x = [months_label(m, current, br=True) for m in series["month"]]
    fig = go.Figure()
    fig.add_bar(x=x, y=series["revenue"], name=labels[0], marker_color=IN_COLOR,
                hovertemplate=f"%{{y:,.0f}} €<extra>{labels[0]}</extra>")
    fig.add_bar(x=x, y=series["expenses"], name=labels[1], marker_color=OUT_COLOR,
                hovertemplate=f"%{{y:,.0f}} €<extra>{labels[1]}</extra>")
    fig.add_scatter(x=x, y=series[line_col], name=line_label, mode="lines+markers",
                    line=dict(color=LINE_COLOR, width=2), marker=dict(size=8, line=dict(color="#0e1117", width=2)),
                    hovertemplate=f"%{{y:,.0f}} €<extra>{line_label}</extra>")
    fig.update_layout(barmode="group", bargroupgap=0.08)
    return _base_layout(fig, height)


def stacked_revenue_chart(piv: pd.DataFrame, names: dict[str, str], colors: dict[str, str], current: str) -> go.Figure:
    x = [months_label(m, current, br=True) for m in piv.index]
    fig = go.Figure()
    for pid in piv.columns:
        fig.add_bar(x=x, y=piv[pid], name=names.get(pid, pid), marker_color=colors.get(pid, "#888"),
                    marker_line=dict(color="#0e1117", width=2),
                    hovertemplate=f"%{{y:,.0f}} €<extra>{names.get(pid, pid)}</extra>")
    fig.update_layout(barmode="stack")
    return _base_layout(fig, 380)


def project_bars_chart(pnl: pd.DataFrame, colors: dict[str, str]) -> go.Figure:
    """Ingresos vs coste total (directo + overhead) por proyecto, con resultado neto."""
    df = pnl.sort_values("revenue")
    cost = df["direct_costs"] + df["overhead"]
    fig = go.Figure()
    # En barras horizontales agrupadas la primera traza queda abajo: costes primero, ingresos encima.
    fig.add_bar(y=df["name"], x=cost, name="Costes (directos + overhead)", orientation="h",
                marker_color=OUT_COLOR, legendrank=2, hovertemplate="%{x:,.0f} €<extra>Costes</extra>")
    fig.add_bar(y=df["name"], x=df["revenue"], name="Ingresos", orientation="h", marker_color=IN_COLOR,
                legendrank=1, hovertemplate="%{x:,.0f} €<extra>Ingresos</extra>")
    for name, rev, c, net in zip(df["name"], df["revenue"], cost, df["net"]):
        color = "#3fbf6a" if net >= 0 else "#ef6b6b"
        fig.add_annotation(y=name, x=max(rev, c), text=f"<b>{compact_eur(net)}</b>", showarrow=False,
                           xanchor="left", xshift=8, font=dict(color=color, size=12))
    fig.update_layout(barmode="group", hovermode="y unified", bargroupgap=0.1)
    _base_layout(fig, 380)
    fig.update_xaxes(gridcolor=INK["grid"], ticksuffix=" €", tickfont=dict(color=INK["muted"]))
    fig.update_yaxes(showgrid=False, ticksuffix="", tickfont=dict(color=INK["secondary"], size=13))
    fig.update_layout(margin=dict(l=8, r=70, t=12, b=8))
    return fig


def supplier_chart(df: pd.DataFrame, color: str) -> go.Figure:
    df = df.sort_values("amount")
    fig = go.Figure(go.Bar(y=df["contact"], x=df["amount"], orientation="h", marker_color=color,
                           hovertemplate="%{x:,.0f} €<extra></extra>"))
    _base_layout(fig, max(220, 44 * len(df)), legend=False)
    fig.update_layout(hovermode="closest", bargap=0.45)
    fig.update_xaxes(gridcolor=INK["grid"], ticksuffix=" €")
    fig.update_yaxes(showgrid=False, ticksuffix="", tickfont=dict(color=INK["secondary"]))
    return fig


def split_bar(parts: list[tuple[str, float, str]]) -> str:
    """Barra apilada 100 % en HTML (directo / overhead / sin asignar)."""
    total = sum(v for _, v, _ in parts) or 1
    segs = "".join(
        f'<div title="{html.escape(n)}: {pct(v / total * 100)}" style="width:{v / total * 100:.2f}%;'
        f'background:{c};height:12px"></div>' for n, v, c in parts if v > 0)
    legend = " ".join(
        f'<span style="margin-right:1rem;color:{INK["secondary"]};font-size:.82rem">'
        f'<span class="legend-dot" style="background:{c}"></span>{html.escape(n)} · <b style="color:{INK["primary"]}">'
        f'{pct(v / total * 100)}</b></span>' for n, v, c in parts)
    return (f'<div style="display:flex;gap:2px;border-radius:6px;overflow:hidden;margin:.4rem 0 .5rem">{segs}</div>'
            f'<div>{legend}</div>')
