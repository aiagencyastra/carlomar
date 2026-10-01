# Notas para la reunión con Jordi

## Lo que pidió (llamada)
- Agente de WhatsApp que conteste solo lo de más volumen: lanchas pequeñas, salidas de día.
- Varios días, pernoctas o barcos grandes → que se lo pase a ellos.
- Conectarlo a su CRM nuevo (tiene API: flota, fichas, calendarios). Lo usan brokers y agencias de Baleares.
- Llamadas de WhatsApp API y una app en el móvil para el equipo → mencionó **Chatwoot**.
- Base de datos que guarde chats y lo que les interese.
- Todo **self-hosted en un VPS** (Ubuntu), n8n incluido. No quiere nube.
- Presupuesto desglosado en dos versiones: **todo hecho por nosotros** vs **lo instala él + soporte**. Presupuesto ajustado; quieren mantenerlo todo el año y probarlo.
- Reunión: **jueves a las 15:00**.

## Supuestos de la demo (todo inventado, a confirmar)
- Nombre del negocio, barcos, precios, puertos y horarios son de ejemplo.
- Cierre de venta: el bot manda un enlace de reserva con barco y día ya rellenos y la reserva "entra en el CRM". Depende de lo que permita la API del CRM (¿crea reservas o solo lee?, ¿tiene enlace de pago?).
- Regla de derivación: bot = lanchas con/sin licencia y semirrígidas de día; equipo = pernoctas, más de un día, veleros/catamaranes/yates, +12 personas, descuentos, quejas.

## Preguntas para el jueves
1. Nombre del CRM y documentación de la API. ¿Lectura y escritura? ¿Webhooks?
2. ¿Cómo reservan hoy los clientes? ¿Hay web con pasarela de pago o se paga señal por transferencia?
3. ¿El número de WhatsApp ya está en la API de Meta o es WhatsApp Business de la app? (migrar el número implica dejar de usarlo en la app normal).
4. ¿Cuántos del equipo usarían Chatwoot? ¿Qué idiomas reciben más?
5. ¿Tienen ya VPS? ¿Proveedor y tamaño? (para n8n + Chatwoot + Postgres, mínimo ~4 GB de RAM, mejor 8 GB).
6. Precios y reglas reales por barco (fianza, gasolina, titulación, horarios).

## A comprobar por nuestra parte antes de prometer
- **Llamadas de WhatsApp en Chatwoot**: confirmar en la versión actual que la integración de llamadas de WhatsApp Cloud API funciona en la app móvil, no solo en la web.
- Costes de Meta: los mensajes de respuesta dentro de la ventana de 24 h no tienen coste; las plantillas (recordatorios, marketing) sí. Revisar tarifas vigentes para España.
- Licencia de n8n (Sustainable Use License): uso interno del cliente en su servidor, OK; revisar si lo gestionamos nosotros para él.
