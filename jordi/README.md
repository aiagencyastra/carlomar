# Demo agente de WhatsApp · Jordi (chárter, Baleares)

Demostración estática preparada por **Polaris** para la reunión del jueves con Jordi. Se abre con `jordi/index.html` (o `…/jordi/` en GitHub Pages). No se conecta a nada.

## Qué enseña (lo que pidió en la llamada)

| Pestaña | Petición de Jordi |
|---|---|
| **WhatsApp** | El bot contesta y reserva las lanchas pequeñas de día (3 conversaciones) y pasa al equipo las pernoctas o los barcos grandes (catamarán, 3 noches). Panel "Lo que pasa por detrás" con las consultas al CRM. |
| **Equipo** | Chatwoot en el móvil: aviso, nota interna con el resumen, el bot se aparta, Jordi contesta y llama por WhatsApp. |
| **Flota** | Lo que el bot lee del CRM (fichas, precios, calendario) y el interruptor bot/equipo por barco. |
| **Panel** | Lo que se guarda en la base de datos, visto como panel. |
| **Montaje** | VPS Ubuntu propio con n8n + Chatwoot + PostgreSQL, las dos modalidades (llave en mano / lo monta él con soporte) y plan de 4 semanas. |

Enlaces directos: `#whatsapp`, `#equipo`, `#flota`, `#panel`, `#montaje`.

## Cómo retocarla

| Archivo | Qué contiene |
|---|---|
| `js/conversaciones.js` | **Nombre del negocio** (`DEMO.marca`), enlace de reserva y las 4 conversaciones |
| `js/datos.js` | Flota, reglas bot/equipo, app del equipo, cifras del panel, opciones de trabajo (**precios**: campo `precio`) y plan |
| `notas.md` | Supuestos y cosas a confirmar con Jordi |

El nombre "Charter Balear" es provisional: no sabemos aún el nombre de su empresa.
