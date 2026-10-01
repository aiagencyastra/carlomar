# Carlo Mar Charter · Demostración

Web de demostración preparada por **Polaris, agencia de inteligencia artificial**, para Carlo Mar Charter (Mallorca).

Enseña en una sola página, y pensada para verla en el móvil, cómo trabajaría el sistema con el negocio:

1. **WhatsApp**: cuatro conversaciones de ejemplo que se reproducen solas (pareja con perro, familia que pregunta el precio, pareja inglesa, fecha ocupada y descuento), con el panel "Lo que pasa por detrás" y los mensajes de seguimiento automático.
2. **Correo**: una bandeja con 7 correos mezclados que se procesa con un botón; solo se contestan los clientes y se ve la respuesta redactada.
3. **Panel**: un resumen de temporada con datos de ejemplo.
4. **Probadlo**: un WhatsApp y un correo de prueba donde escribir como si fuerais un cliente. Contesta con respuestas preparadas a partir de las tarifas y las reglas reales, con un calendario de ejemplo.

Todos los nombres, fechas y cifras son de ejemplo. La web es estática: no se conecta a nada, no usa claves ni carga nada de fuera.

## Para quién es

Para David y Patricia, de Carlo Mar Charter, para que vean el funcionamiento antes de decidir. Se entiende sin explicaciones.

## Cómo verla

- Abriendo `index.html` directamente en el navegador, o
- en la dirección de GitHub Pages del repositorio.

Se puede enlazar directamente a una sección: `…/#whatsapp`, `…/#correo`, `…/#panel` o `…/#probar`.

## Cómo retocar los textos

Los textos están separados de la lógica:

| Archivo | Qué contiene |
|---|---|
| `js/conversaciones.js` | Conversaciones de WhatsApp, pasos de "Lo que pasa por detrás", seguimiento y correos |
| `js/datos-panel.js` | Cifras, meses, canales y últimos interesados del panel |
| `js/simulador-textos.js` | Frases con las que contesta el apartado "Probadlo" |
| `notas.md` | Tarifas, qué incluye cada experiencia y reglas de tono en que se basan los textos |
| `index.html` / `css/styles.css` | Estructura y diseño |
| `js/app.js` / `js/panel.js` / `js/simulador.js` | Funcionamiento (pestañas, reproducción, gráficas, simulador) |

## Cómo se activa GitHub Pages

1. En el repositorio, ir a **Settings → Pages**.
2. En **Build and deployment**, elegir **Source: Deploy from a branch**.
3. Rama **main**, carpeta **/ (root)**, y **Save**.
4. En uno o dos minutos la web queda publicada en `https://<usuario>.github.io/carlo-mar-demo/`.

No hace falta instalar ni compilar nada.
