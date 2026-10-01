# Demo agente de WhatsApp · SeaTime (Jordi)

Demostración estática preparada por **Polaris** para la reunión del jueves con Jordi. No se conecta a nada.

**Publicada en: https://seatime-demo-astra.netlify.app** (sitio de Netlify `seatime-demo-astra`). En local se abre con `jordi/index.html`.

## Qué enseña (lo que pidió en la llamada)

| Pestaña | Petición de Jordi |
|---|---|
| **Pruébalo tú** | WhatsApp en el que Jordi puede escribir como si fuera un cliente (español o inglés). Bot de reglas con la flota de ejemplo: pregunta tipo de barco, personas, fecha y horario, mira disponibilidad, da precio, manda el enlace y pasa a Jordi pernoctas, barcos grandes, grupos de más de 10, descuentos, quejas o si piden una persona. Muestra la ficha del cliente rellenándose. Fechas ocupadas para probar: el 9, 16 y 23, y mañana por la tarde en lancha sin licencia. |
| **WhatsApp** | El bot contesta y reserva las lanchas pequeñas de día (3 conversaciones) y pasa al equipo las pernoctas o los barcos grandes (catamarán, 3 noches). Panel "Lo que pasa por detrás" con las consultas al CRM. |
| **Equipo** | Chatwoot en el móvil: aviso, nota interna con el resumen, el bot se aparta, Jordi contesta y llama por WhatsApp. |
| **Flota** | Lo que el bot lee del CRM (fichas, precios, calendario) y el interruptor bot/equipo por barco. |
| **Panel** | Lo que se guarda en la base de datos, visto como panel. |
| **Montaje** | VPS Ubuntu propio con n8n + Chatwoot + PostgreSQL, las dos modalidades (llave en mano / lo monta él con soporte) y plan de 4 semanas. |

Enlaces directos: `#prueba`, `#whatsapp`, `#equipo`, `#flota`, `#panel`, `#montaje`.

## Cómo retocarla

| Archivo | Qué contiene |
|---|---|
| `js/conversaciones.js` | **Nombre del negocio** (`DEMO.marca`), enlace de reserva y las 4 conversaciones |
| `js/prueba.js` | Bot de la pestaña Pruébalo tú: flota, frases y reglas (todo en un archivo) |
| `js/datos.js` | Flota, reglas bot/equipo, app del equipo, cifras del panel, opciones de trabajo (**precios**: campo `precio`) y plan |
| `notas.md` | Supuestos y cosas a confirmar con Jordi |

La empresa de Jordi es **SeaTime**. Este año empiezan también en Mallorca, por eso la flota de ejemplo sale de puertos de Mallorca.

## Volver a publicar en Netlify

Se suben solo `index.html`, `css/` y `js/` (las notas internas no):

```bash
cd jordi && zip -qr /tmp/seatime.zip index.html css js
curl -X POST "https://api.netlify.com/api/v1/sites/38c7a32d-e9f8-4bab-8554-50b224744880/deploys" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" -H "Content-Type: application/zip" --data-binary @/tmp/seatime.zip
```
