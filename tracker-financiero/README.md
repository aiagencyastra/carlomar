# Tracker Financiero · Holded + imputación por proyecto

Automatiza el control financiero de una empresa con varios proyectos en paralelo:
descarga facturas, compras, pagos y contactos de **Holded**, **imputa cada línea a su
proyecto**, **concilia banco ↔ facturas**, calcula **P&L por proyecto en devengo y en
caja**, **runway y burn rate**, y lo enseña en un **dashboard Streamlit** listo para presentar.

Sin `HOLDED_API_KEY` (o con `DEMO_MODE=true`) funciona con un fixture sintético que
replica el JSON de Holded, así que la demo se puede hacer sin conexión y sin datos reales.

---

## Arranque en un paso

```bash
cd tracker-financiero
./run_demo.sh                 # instala dependencias si faltan y abre la demo (datos sintéticos)
```

o bien:

```bash
pip install -r requirements.txt
python main.py --mock         # demo
python main.py                # usa .env (Holded real si hay clave y DEMO_MODE=false)
```

Se abre en `http://localhost:8501`.

### Otros comandos

| Comando | Qué hace |
|---|---|
| `python main.py report` | KPIs, P&L por proyecto y alertas en la terminal |
| `python main.py export` | CSVs + JSON para Google Sheets en `./exports` |
| `python main.py generate-mock [--today]` | Regenera `data/sample_holded_data.json` (determinista) |
| `python main.py check` | Prueba la clave de Holded |
| `python -m pytest` | 42 tests (cliente, motor, conciliación, KPIs, exportador, dashboard) |

### Versión web estática (Netlify)

```bash
python scripts/build_web.py      # genera web/ (index.html + motor en Python)
```

`web/` es un sitio 100 % estático: con [stlite](https://github.com/whitphx/stlite) el mismo
dashboard corre en el navegador del visitante (Python en WebAssembly), sin servidor. Siempre en
modo demo con el fixture sintético; nunca incluye `.env` ni claves. Se publica arrastrando `web/`
a Netlify (o `netlify deploy --prod --dir web`). La primera carga tarda unos 20 s.

### Conectar con Holded real

```bash
cp .env.example .env
# HOLDED_API_KEY=tu_clave      (Holded > Configuración > Desarrolladores > API)
# DEMO_MODE=false
python main.py check
python main.py
```

Si Holded falla (red, 5xx, clave inválida), el dashboard **cae al fixture** y lo avisa con
un banner, para que una demo en directo no se rompa nunca. Con `HOLDED_STRICT=true` se
desactiva el fallback.

---

## Arquitectura

```
tracker-financiero/
├── main.py                  CLI único: dashboard | report | export | generate-mock | check
├── run_demo.sh              arranque en un paso
├── config/projects.json     reglas de imputación (tags, keywords, contactos, overhead, banco)
├── data/sample_holded_data.json   fixture demo con el schema de Holded
├── app/
│   ├── dashboard.py         Streamlit: visión global, proyecto, conciliación, exportar
│   └── ui.py                estilos, formato es-ES y gráficos Plotly
├── src/tracker/
│   ├── config.py            .env → Settings (toggle DEMO_MODE)
│   ├── client/holded.py     cliente HTTP tipado: retries, Retry-After, rate limit, paginación
│   ├── pipeline/
│   │   ├── schemas.py       Pydantic: respuestas JSON de Holded
│   │   ├── models.py        modelo de dominio (Document, Line, Payment…)
│   │   ├── normalize.py     JSON → dominio (estados paid/partial/pending/overdue)
│   │   └── ingest.py        elige fuente (Holded / fixture) con fallback
│   ├── engine/
│   │   ├── rules.py         carga y compila config/projects.json
│   │   ├── assignment.py    imputación en cascada, línea a línea
│   │   ├── reconciliation.py  emparejado pagos ↔ facturas + alertas
│   │   ├── ledger.py        libros de devengo y de caja
│   │   ├── kpis.py          P&L, series mensuales, runway, burn
│   │   └── report.py        orquestador → FinanceReport
│   ├── mock/generator.py    generador determinista de datos sintéticos
│   └── exporter.py          CSV (Excel es-ES) + payload Google Sheets
└── tests/
```

**Flujo:** `Holded API / fixture → schemas (Pydantic) → normalize → engine (imputación →
conciliación → libros → KPIs) → dashboard / CLI / export`.

### Endpoints de Holded

| Dato | Endpoint (base `https://api.holded.com/api`, header `key`) |
|---|---|
| Facturas de venta | `/invoicing/v1/documents/invoice` |
| Compras y gastos | `/invoicing/v1/documents/purchase` |
| Pagos / cobros | `/invoicing/v1/payments` |
| Cuentas de tesorería | `/invoicing/v1/treasury` |
| Contactos | `/invoicing/v1/contacts` |

Las rutas están centralizadas en `Endpoints` (`client/holded.py`): si vuestra cuenta usa
otra ruta de tesorería (p. ej. `/treasury/v1/payments`) se cambia en una línea.
Antes de conectar la cuenta real conviene comprobar con `python main.py check` y un
`report` que los campos (`documentId` en pagos, signo de los importes, `status`) llegan
como espera el normalizador; si no, el ajuste va en `pipeline/normalize.py`.

### Reglas de negocio

**Imputación por proyecto** (`config/projects.json`, sin tocar código). Se evalúa **cada
línea** de factura, así una factura de un freelance con horas de tres proyectos se reparte
entre los tres. Cascada:

1. **Tags de Holded**: los de la línea, después los del documento (`[skyla]`, `#Skyla`, `skyla` valen igual).
2. **Keywords / regex** en el concepto de la línea y la descripción (sin distinguir mayúsculas ni acentos).
3. **Contacto / proveedor** asignado a un proyecto.
4. **Reglas de estructura** → *Gasto Común / Overhead*.
5. Nada encaja → *Sin Asignar (Requiere Revisión)* + alerta.

Cada transacción guarda **qué regla la imputó y por qué** (columna «Regla» / «Evidencia»).

**Doble criterio**
- *Devengo*: fecha de factura, base imponible sin IVA. Las nóminas, Seguridad Social y
  comisiones (que no llegan como factura) entran como overhead vía `bank_rules`.
- *Caja*: cobros y pagos reales; cada movimiento se reparte entre proyectos con la misma
  proporción que las líneas de la factura conciliada. Los impuestos liquidados (303/111)
  cuentan en caja pero no en P&L.

**Conciliación** de cada movimiento bancario, de más a menos fiable: enlace de Holded
(`documentId`) → regla bancaria → mismo contacto + importe → importe + fecha (candidato
único) → *sin factura*.

**KPIs**
- Ingresos, gastos, margen neto (€ y %), % gasto directo / común / sin asignar.
- **Burn rate** = media de los últimos 3 meses cerrados (bruto: salidas; neto: salidas − entradas).
- **Runway** = tesorería actual / burn neto (∞ si la caja crece). También «runway sin
  ingresos» = tesorería / burn bruto.
- P&L por proyecto con overhead repercutido por **prorrata de ingresos**, **a partes iguales** o **sin repercutir**.
- El saldo histórico se reconstruye hacia atrás desde el saldo bancario actual, así siempre cuadra con el banco.

**Alertas**: cobros vencidos (crítico a +30 días), pagos vencidos, gastos sin proyecto,
movimientos sin factura, borradores sin validar y facturas marcadas como pagadas sin
movimiento bancario.

---

## 🎤 Demo Script (3 minutos)

> Preparación: `./run_demo.sh` antes de entrar; navegador a pantalla completa en
> `localhost:8501`. Datos 100 % sintéticos de una agencia con 6 proyectos, fecha de corte
> 06/10/2026 (fija, para que la demo salga siempre igual).

**0:00 · El problema (15 s)**
«Cada mes perdemos días cuadrando Holded con el banco, descargando CSVs y preguntando
"¿esta factura de qué proyecto es?". Esto lo hace solo.»

**0:15 · Visión global (45 s)** — pestaña *📊 Visión global*
- Señalar las 4 tarjetas: **93.772 € en tesorería**, **facturación de septiembre +12,6 %**,
  **runway de 13,4 meses** y **margen global del 7,6 %**.
- «Facturamos con margen… pero mirad la segunda fila: **34.725 € en cobros vencidos**. El
  problema no es vender, es cobrar.»
- Gráfico de cash flow: «la línea blanca es el saldo real; baja desde julio por el IVA trimestral y los impagos.»

**1:00 · Rentabilidad por proyecto (40 s)**
- Gráfico de barras horizontales: «Skyla y Ethos financian la empresa. **Hornymoon pierde
  23.000 €**: la inversión en Meta Ads se come la cuota.»
- Cambiar en la barra lateral *Reparto del overhead* a «A partes iguales»: «según cómo
  repartamos la estructura, la foto cambia. Ahora la decisión es explícita.»
- Pulsar **Caja** en *Criterio contable*: «mismo análisis, con el dinero que de verdad ha entrado y salido.»

**1:40 · Drill-down (30 s)** — pestaña *🔎 Por proyecto* → **Hornymoon**
- KPIs del proyecto, evolución mensual y principales proveedores (Meta Ads arriba).
- Tabla de transacciones, columna **Regla**: «cada euro dice por qué está aquí: por tag,
  por palabra clave o por proveedor. Nada de hojas de cálculo a mano.»

**2:10 · Conciliación en vivo (35 s)** — pestaña *🚨 Conciliación*
- «El sistema ha encontrado 25 cosas que revisar.»
- En *Gastos sin proyecto*: asignar *Licencias anuales de software* a **Gasto Común /
  Overhead** → **Aplicar reasignación**. Volver a *Visión global*: «Gasto imputado» sube.
- En *Movimientos sin factura*: «Pago tarjeta · Uber» → **✔ Justificar sin factura** → **Conciliar**.
- Pulsar **📨 Reclamado** en la factura de Ethos de 21.780 €.

**2:45 · Cierre (15 s)** — pestaña *⬇️ Exportar*
- **Descargar todo (ZIP)**: CSVs que abren bien en Excel y un JSON listo para volcar en Google Sheets.
- «Con la clave de Holded en el `.env` y `DEMO_MODE=false` esto mismo funciona con nuestros datos reales.»

> Para repetir la demo: botón **↺ Reiniciar** en la barra lateral (borra los cambios de conciliación).

### Plan B si algo falla en directo
- Sin Internet: no pasa nada, el modo demo es 100 % local.
- Si el navegador no abre: `python main.py --mock report` enseña los mismos números en la terminal.
- Puerto ocupado: `python main.py --mock --port 8502`.

---

## Notas y límites conocidos

- Las nóminas se toman del movimiento bancario (neto pagado), no del módulo de nóminas
  de Holded; es una aproximación al coste de personal.
- La reasignación y la conciliación del dashboard **simulan** la acción: se guardan en la
  sesión y no se escriben en Holded (escribir de vuelta sería el siguiente paso, vía
  `PUT /invoicing/v1/documents/{docType}/{id}` para los tags).
- Moneda única (EUR); los documentos en otra divisa no se convierten.
