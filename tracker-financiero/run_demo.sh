#!/usr/bin/env bash
# Levanta la demo del Tracker Financiero en un paso.
#   ./run_demo.sh            -> modo demo (datos sintéticos), puerto 8501
#   ./run_demo.sh --live     -> usa HOLDED_API_KEY de .env
set -euo pipefail
cd "$(dirname "$0")"

PY=${PYTHON:-python3}
if ! "$PY" -c "import streamlit, plotly, pydantic, pandas, dotenv, requests" 2>/dev/null; then
  echo "▶ Instalando dependencias…"
  "$PY" -m pip install -q -r requirements.txt
fi

[ -f .env ] || cp .env.example .env

if [ "${1:-}" = "--live" ]; then
  shift
  exec "$PY" main.py "$@"
else
  exec "$PY" main.py --mock "$@"
fi
