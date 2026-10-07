# Astra · Facturas

Registro de facturas en segundos para Astra. Se rellena un formulario simple
(venta o compra, cliente/proveedor, NIF, concepto, importe y fecha) y la herramienta:

- **calcula el IVA** según la operación: 21 % general, 10 % hostelería y transporte de viajeros,
  4 % libros, exento (seguros, comisiones bancarias), **inversión del sujeto pasivo** con
  proveedores extranjeros y **no sujeta** en ventas a empresas de la UE o de fuera;
- **aplica la retención de IRPF** del 15 % cuando el proveedor es autónomo (NIF de persona física);
- **elige la cuenta contable** del PGC (627 publicidad, 623 profesionales, 628 suministros,
  621 alquileres, 629 otros servicios, 217 equipos informáticos de más de 300 €, 705 servicios…)
  y explica por qué;
- **genera el asiento** (debe/haber cuadrado: 472, 477, 4751, 410, 430…);
- en compras **adjunta el PDF o la foto** de la factura del proveedor;
- **sube la factura a Holded** (en esta demo, simulado) y la añade al registro, con la estimación
  de los modelos **303** (IVA) y **111** (retenciones) y exportación a CSV.

Todo lo automático se puede corregir a mano desde «Cálculo automático».

## Probarlo

Es una web estática, sin dependencias:

```bash
cd astra-facturas
python3 -m http.server 8080      # http://localhost:8080
npm test                         # 14 tests del motor de cálculo (Node 18+)
```

Los botones «Ejemplos» rellenan casos típicos: Meta Ads (inversión del sujeto pasivo),
freelance (IRPF 15 %), AWS, hotel (IVA 10 % con importe ya incluido), venta nacional y venta UE.

## Estructura

| Archivo | Qué hace |
|---|---|
| `js/rules.js` | Reglas configurables: cuentas PGC, palabras clave por cuenta, tipos de IVA, contactos habituales |
| `js/calc.js` | Motor de cálculo puro (NIF, IVA, IRPF, cuenta, asiento, avisos, resumen 303/111) |
| `js/holded.js` | Construye la petición a la API de Holded y la simula (`DEMO = true`) |
| `netlify/functions/holded.mjs` | Proxy real a Holded con la clave en el servidor |
| `js/app.js`, `index.html`, `css/styles.css` | Interfaz |

## Conectarlo a Holded de verdad

1. En Netlify → Site configuration → Environment variables, crear `HOLDED_API_KEY`.
2. En `js/holded.js`, poner `DEMO = false`.
3. Publicar. La web llama a `/.netlify/functions/holded`, que crea el documento con
   `POST /api/invoicing/v1/documents/{invoice|purchase}` y, si hay adjunto,
   `POST /api/invoicing/v1/documents/{tipo}/{id}/attach`.

La clave nunca llega al navegador. Antes de usarlo con datos reales conviene revisar con la
gestoría las reglas de `js/rules.js` y probar contra una cuenta de Holded de pruebas.

> Las reglas fiscales cubren los casos habituales de una agencia de servicios; no sustituyen
> la revisión de un asesor (por ejemplo, prorratas, recargo de equivalencia o importaciones de bienes).
