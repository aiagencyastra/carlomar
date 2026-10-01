/*
  CONTENIDO DE LA DEMO — marca, conversaciones de WhatsApp y enlace de reserva.
  Aquí solo hay textos. Se pueden retocar sin tocar nada de la lógica.

  Cada conversación es una lista de "eventos" que se reproducen en orden:
    { de: 'cliente', hora, texto }                 mensaje del cliente (burbuja verde)
    { de: 'agente',  hora, texto }                 respuesta del bot (antes sale "escribiendo…")
    { de: 'agente',  hora, texto, enlace: true }   igual, con la tarjeta del enlace de reserva
    { detras: 'texto', resultado: 'texto', tipo }  paso del panel "Lo que pasa por detrás"
        tipo: 'mensaje' | 'regla' | 'crm' | 'ocupado' | 'ficha' | 'enlace' | 'reserva'
              | 'bd' | 'idioma' | 'equipo' | 'resumen'
*/

window.DEMO = window.DEMO || {};

/* Nombre del negocio: se cambia aquí y sale en toda la demo. */
window.DEMO.marca = {
  nombre: 'SeaTime',
  responsable: 'Jordi'
};

window.DEMO.enlaceReserva = {
  titulo: 'Reserva tu lancha · SeaTime',
  texto: 'Barco, día y horario ya puestos. Solo datos y señal',
  dominio: 'web de seatime'
};

window.DEMO.conversaciones = [
  {
    id: 'sinlicencia',
    titulo: 'Lancha sin licencia',
    resumen: 'Familia, a las 23:08, reserva sola',
    eventos: [
      { de: 'cliente', hora: '23:08', texto: 'hola! se puede alquilar una lancha sin tener licencia? seríamos 2 adultos y un niño' },
      { detras: 'Mensaje nuevo de Ana a las 23:08', resultado: 'fuera de horario, se contesta igual', tipo: 'mensaje' },
      { detras: 'Qué pide: lancha de día', resultado: 'esto lo lleva el bot de principio a fin', tipo: 'regla' },
      { de: 'agente', hora: '23:08', texto: 'hola! sí, claro. tenemos lanchas sin licencia de 5 metros, caben hasta 5 personas, así que vais sobrados' },
      { de: 'agente', hora: '23:09', texto: 'la llevas tú, antes de salir te explicamos todo en 10 minutos y puedes moverte por la bahía y bañarte en las calas de alrededor' },
      { de: 'cliente', hora: '23:10', texto: 'qué bien. y cuánto cuesta? estábamos pensando el sábado 17 por la mañana' },
      { detras: 'CRM: lanchas sin licencia, sábado 17 por la mañana…', resultado: 'libre', tipo: 'crm' },
      { detras: 'Ficha de la Blau en el CRM', resultado: '5 m · hasta 5 personas · medio día 190 € · chalecos de niño', tipo: 'ficha' },
      { de: 'agente', hora: '23:10', texto: 'el sábado 17 por la mañana tengo libre la blau, de 9:30 a 13:30. el medio día son 190 € con el seguro incluido' },
      { de: 'agente', hora: '23:11', texto: 'la gasolina va aparte según lo que gastes, normalmente unos 30-40 €' },
      { de: 'cliente', hora: '23:12', texto: 'perfecto. el niño tiene 6 años, tenéis chalecos para él?' },
      { de: 'agente', hora: '23:12', texto: 'sí, llevamos chalecos de niño a bordo. te la dejo aquí con el sábado ya puesto, solo pones tus datos y pagas la señal', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'con barco, día y horario ya rellenos', tipo: 'enlace' },
      { de: 'cliente', hora: '23:15', texto: 'hecho!! 🙌' },
      { detras: 'La reserva entra en el CRM', resultado: 'Ana · sáb 17 · Blau · 9:30-13:30 · 3 personas (1 niño)', tipo: 'reserva' },
      { detras: 'Guardado en la base de datos', resultado: 'conversación completa + datos del cliente', tipo: 'bd' },
      { de: 'agente', hora: '23:15', texto: 'genial, pues nos vemos el sábado. venid 15 minutos antes para firmar y enseñaros la lancha ⛵' }
    ]
  },
  {
    id: 'patron',
    titulo: 'Sin titulación',
    resumen: 'Pide una lancha que no puede llevar',
    eventos: [
      { de: 'cliente', hora: '11:32', texto: 'buenos días, queremos la lancha de 7 personas para el martes 20, día entero' },
      { detras: 'Qué pide: lancha de día', resultado: 'esto lo lleva el bot', tipo: 'regla' },
      { detras: 'CRM: Cala, martes 20, día entero…', resultado: 'libre', tipo: 'crm' },
      { detras: 'Ficha de la Cala en el CRM', resultado: 'motor de 150 cv · necesita titulación (PNB o más)', tipo: 'ficha' },
      { de: 'agente', hora: '11:32', texto: 'buenos días! el martes 20 la cala la tengo libre todo el día' },
      { de: 'agente', hora: '11:33', texto: 'eso sí, lleva motor de 150 cv y hace falta titulación, el pnb como mínimo. alguno de vosotros la tiene?' },
      { de: 'cliente', hora: '11:35', texto: 'uy no, nadie. somos 6, dos parejas y dos niños' },
      { detras: 'Busca un barco con patrón para 6, martes 20…', resultado: 'libre', tipo: 'crm' },
      { detras: 'Ficha de la Gavina en el CRM', resultado: 'semirrígida 8 m · con patrón · hasta 10 · día 950 €', tipo: 'ficha' },
      { de: 'agente', hora: '11:35', texto: 'sin problema, entonces os va mejor la gavina, una semirrígida de 8 metros que va con patrón' },
      { de: 'agente', hora: '11:36', texto: 'no tenéis que preocuparos de nada y os lleva a las mejores calas, que el patrón se las sabe todas. el día entero son 950 € con patrón, gasolina de la ruta, nevera y snorkel' },
      { de: 'cliente', hora: '11:38', texto: 'vale, nos interesa. se puede pagar con tarjeta?' },
      { detras: 'Pregunta cómo se paga', resultado: 'lo saca de vuestras condiciones del CRM', tipo: 'regla' },
      { de: 'agente', hora: '11:38', texto: 'sí, la señal con tarjeta al reservar y el resto el mismo día, con tarjeta o en efectivo. te dejo el enlace con el martes 20 ya puesto', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'Gavina · martes 20 · día entero', tipo: 'enlace' },
      { de: 'cliente', hora: '11:41', texto: 'reservado, gracias!' },
      { detras: 'La reserva entra en el CRM', resultado: 'Marta · mar 20 · Gavina con patrón · 6 personas (2 niños)', tipo: 'reserva' },
      { detras: 'Guardado en la base de datos', resultado: 'conversación + "no tienen titulación"', tipo: 'bd' },
      { de: 'agente', hora: '11:41', texto: 'a vosotros! los peques se lo van a pasar en grande' }
    ]
  },
  {
    id: 'ingles',
    titulo: 'Tourists, in English',
    resumen: 'Mañana está todo cogido',
    eventos: [
      { de: 'cliente', hora: '08:47', texto: 'Hi there! Do you have a boat for 4 people tomorrow afternoon? We don\'t have a license' },
      { detras: 'Escribe en inglés', resultado: 'se le contesta en inglés', tipo: 'idioma' },
      { detras: 'CRM: lanchas sin licencia, mañana por la tarde…', resultado: 'ocupado', tipo: 'ocupado' },
      { detras: 'Busca el hueco más cercano…', resultado: 'libre', tipo: 'crm' },
      { de: 'agente', hora: '08:47', texto: 'hi! tomorrow afternoon both no-license boats are already booked, sorry' },
      { de: 'agente', hora: '08:48', texto: 'I do have one free tomorrow morning, 9:30 to 13:30, or the day after in the afternoon. would either of those work?' },
      { de: 'cliente', hora: '08:50', texto: 'Morning is fine! How much is it?' },
      { de: 'agente', hora: '08:50', texto: 'it\'s 190 € for the half day, insurance included. fuel is paid at the end, usually around 30-40 €. and 4 of you is perfect, the boat takes up to 5' },
      { de: 'cliente', hora: '08:51', texto: 'Great, let\'s do it' },
      { de: 'agente', hora: '08:51', texto: 'here you go, it\'s all set for tomorrow morning', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'Sol · mañana · 9:30-13:30', tipo: 'enlace' },
      { de: 'cliente', hora: '08:55', texto: 'Booked 👍' },
      { detras: 'La reserva entra en el CRM', resultado: 'Tom · mañana · Sol · 9:30-13:30 · 4 personas · inglés', tipo: 'reserva' },
      { detras: 'Guardado en la base de datos', resultado: 'conversación + idioma del cliente', tipo: 'bd' },
      { de: 'agente', hora: '08:55', texto: 'lovely, see you tomorrow! come 15 minutes early so we can show you the boat' }
    ]
  },
  {
    id: 'pernocta',
    titulo: 'Catamarán, 3 noches',
    resumen: 'Se lo pasa a Jordi',
    siguiente: { texto: 'Ver cómo le llega a Jordi', seccion: 'equipo' },
    eventos: [
      { de: 'cliente', hora: '19:05', texto: 'hola, buenas. estamos mirando un catamarán para 3 noches a mediados de agosto, seríamos 8. qué opciones hay?' },
      { detras: 'Qué pide: pernocta en catamarán', resultado: 'esto es para el equipo, el bot solo prepara el terreno', tipo: 'equipo' },
      { detras: 'CRM: catamaranes para 8, mediados de agosto…', resultado: 'libre', tipo: 'crm' },
      { de: 'agente', hora: '19:05', texto: 'hola! qué buen plan, tres noches en catamarán por las calas es otra cosa' },
      { de: 'agente', hora: '19:06', texto: 'tenemos un lagoon 42 que va genial para 8, con cuatro camarotes dobles. qué días tenéis en mente exactamente?' },
      { de: 'cliente', hora: '19:07', texto: 'del 12 al 15 más o menos, flexibles un día arriba o abajo' },
      { de: 'agente', hora: '19:07', texto: 'y lo queréis con patrón o alguno tiene titulación para llevarlo?' },
      { de: 'cliente', hora: '19:08', texto: 'con patrón, nadie tiene titulación. y si hay alguien que cocine mejor jaja' },
      { detras: 'Prepara el resumen para el equipo', resultado: 'Laia · 8 personas · 12-15 ago (±1 día) · catamarán · patrón + cocinera', tipo: 'resumen' },
      { detras: 'Pasado al equipo en la app', resultado: 'asignado a Jordi · aviso en su móvil', tipo: 'equipo' },
      { detras: 'El bot se aparta de esta conversación', resultado: 'hasta que Jordi la devuelva', tipo: 'regla' },
      { de: 'agente', hora: '19:09', texto: 'jaja se puede, sí. esto ya te lo prepara jordi personalmente, que las salidas de varios días las monta él a medida. le paso todo y te escribe hoy mismo' },
      { de: 'cliente', hora: '19:09', texto: 'genial, gracias!' },
      { detras: 'Guardado en la base de datos', resultado: 'oportunidad de pernocta · prioridad alta', tipo: 'bd' }
    ]
  }
];
