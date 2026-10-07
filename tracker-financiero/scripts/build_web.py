#!/usr/bin/env python3
"""Genera `web/`: versión estática del dashboard para Netlify (o cualquier hosting estático).

Usa stlite (Streamlit compilado a WebAssembly con Pyodide): el mismo `app/dashboard.py`
y el mismo motor de `src/` se ejecutan en el navegador del visitante, sin servidor.
Siempre arranca en modo demo con el fixture sintético; nunca incluye `.env` ni claves.

    python scripts/build_web.py        # -> web/index.html + copia de los .py y datos
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "web"
STLITE = "1.9.2"  # trae Streamlit 1.62
REQUIREMENTS = ["plotly", "pydantic", "python-dotenv", "requests"]

SOURCES = (
    sorted((ROOT / "src" / "tracker").rglob("*.py"))
    + [ROOT / "app" / "dashboard.py", ROOT / "app" / "ui.py",
       ROOT / "config" / "projects.json", ROOT / "data" / "sample_holded_data.json"]
)

STREAMLIT_CONFIG = {
    "theme.base": "dark",
    "theme.primaryColor": "#3987e5",
    "theme.backgroundColor": "#0e1117",
    "theme.secondaryBackgroundColor": "#151821",
    "theme.textColor": "#e8e9ed",
    "client.toolbarMode": "viewer",
}

HTML = """<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tracker Financiero · Astra</title>
  <meta name="description" content="Demo del Tracker Financiero de Astra: Holded, imputación por proyecto, conciliación y KPIs. Datos sintéticos." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📈</text></svg>" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@stlite/browser@__STLITE__/build/stlite.css" />
  <style>
    html, body { background: #0e1117; margin: 0; }
    .splash { min-height: 100vh; display: flex; flex-direction: column; align-items: center;
              justify-content: center; gap: 14px; color: #b9bcc6;
              font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; padding: 16px; }
    .splash h1 { color: #f2f3f5; font-size: 1.6rem; margin: 0; }
    .splash p { margin: 0; font-size: .95rem; max-width: 460px; line-height: 1.5; }
    .spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #252a35;
               border-top-color: #3987e5; animation: spin 0.9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="root">
    <div class="splash">
      <div class="spinner"></div>
      <h1>Tracker Financiero · Astra</h1>
      <p>Cargando el motor financiero en tu navegador… la primera vez tarda unos segundos.
         Datos 100&nbsp;% sintéticos.</p>
    </div>
  </div>
  <script type="module">
    import { mount } from "https://cdn.jsdelivr.net/npm/@stlite/browser@__STLITE__/build/stlite.js";
    const files = __FILES__;
    mount(
      {
        requirements: __REQUIREMENTS__,
        entrypoint: "app/dashboard.py",
        files: Object.fromEntries(files.map((f) => [f, { url: "./" + f }])),
        streamlitConfig: __CONFIG__,
      },
      document.getElementById("root"),
    );
  </script>
</body>
</html>
"""

HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/*.py
  Content-Type: text/plain; charset=utf-8
/*.json
  Content-Type: application/json; charset=utf-8
"""


def build() -> Path:
    if OUT.exists():
        shutil.rmtree(OUT)
    rel_files = []
    for src in SOURCES:
        rel = src.relative_to(ROOT).as_posix()
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        rel_files.append(rel)
    html = (HTML.replace("__STLITE__", STLITE)
            .replace("__FILES__", json.dumps(rel_files, indent=2))
            .replace("__REQUIREMENTS__", json.dumps(REQUIREMENTS))
            .replace("__CONFIG__", json.dumps(STREAMLIT_CONFIG, indent=2)))
    (OUT / "index.html").write_text(html, encoding="utf-8")
    (OUT / "_headers").write_text(HEADERS, encoding="utf-8")
    return OUT


if __name__ == "__main__":
    out = build()
    n = sum(1 for p in out.rglob("*") if p.is_file())
    print(f"✔ Sitio estático en {out} ({n} archivos)")
