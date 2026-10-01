/*
  TEXTOS DEL SIMULADOR ("Probadlo vosotros").
  Respuestas preparadas a partir de las tarifas y las reglas reales del agente.
  {llaves} = huecos que rellena el simulador. Entre [corchetes] = botón de la web (solo correo).
  Se pueden retocar sin tocar js/simulador.js.
*/
window.DEMO = window.DEMO || {};

window.DEMO.simulador = {
  experiencias: {
    half: {
      etiqueta: 'Half Day', precio: 1100, comida: false, temporada: false,
      es: { nombre: 'medio día', horas: 'cuatro horas, de 9.30 a 13.30 o por la tarde de 14.30 a 18.30', extra: '', formalHoras: 'de 9:30 a 13:30 o por la tarde de 14:30 a 18:30', formalExtra: '' },
      en: { nombre: 'half day', horas: 'four hours, 9.30 to 13.30 or in the afternoon 14.30 to 18.30', extra: '', formalHoras: 'from 9:30 to 13:30 or in the afternoon from 14:30 to 18:30', formalExtra: '' }
    },
    full: {
      etiqueta: 'Full Day', precio: 2000, comida: true, temporada: false,
      es: { nombre: 'día completo', horas: 'de 10 a 18', extra: ' y hacéis cuatro paradas, cuatro calas de la costa de andratx', formalHoras: 'de 10:00 a 18:00', formalExtra: ', con cuatro paradas en cuatro calas de la costa de Andratx' },
      en: { nombre: 'full day', horas: '10am to 6pm', extra: ' and you get four stops, four different coves along the andratx coast', formalHoras: 'from 10:00 to 18:00', formalExtra: ', with four stops in four different coves along the Andratx coast' }
    },
    sunset: {
      etiqueta: 'Sunset', precio: 1100, comida: false, temporada: true,
      es: { nombre: 'sunset', horas: 'de 18.30 a 21.30', extra: ', salís con la luz de la tarde y volvéis con el sol ya puesto', formalHoras: 'de 18:30 a 21:30', formalExtra: ', con la vuelta ya con el sol puesto' },
      en: { nombre: 'sunset trip', horas: '18.30 to 21.30', extra: ', you head out in the evening light and come back after the sun goes down', formalHoras: 'from 18:30 to 21:30', formalExtra: ', coming back after the sun goes down' }
    },
    halfsunset: {
      etiqueta: 'Half Day + Sunset', precio: 2050, comida: true, temporada: true,
      es: { nombre: 'medio día + sunset', horas: 'de 14 a 21.30', extra: ', toda la tarde en el agua y la vuelta con el atardecer', formalHoras: 'de 14:00 a 21:30', formalExtra: ', toda la tarde en el agua y la vuelta con el atardecer' },
      en: { nombre: 'half day + sunset', horas: '2pm to 9.30pm', extra: ', the whole afternoon on the water and back with the sunset', formalHoras: 'from 14:00 to 21:30', formalExtra: ', the whole afternoon on the water and back with the sunset' }
    },
    complete: {
      etiqueta: 'Complete', precio: 2850, comida: true, temporada: true,
      es: { nombre: 'complete', horas: 'de 10 a 21.30', extra: ', el día entero y la vuelta con el atardecer', formalHoras: 'de 10:00 a 21:30', formalExtra: ', el día entero y la vuelta con el atardecer' },
      en: { nombre: 'complete', horas: '10am to 9.30pm', extra: ', the whole day and back with the sunset', formalHoras: 'from 10:00 to 21:30', formalExtra: ', the whole day and back with the sunset' }
    }
  },

  /* ---------- WhatsApp: tono de WhatsApp, minúsculas, frases cortas ---------- */
  whatsapp: {
    es: {
      saludo: 'hola!',
      info: [
        'pues mira, tenemos medio día, que son cuatro horas por la mañana o por la tarde. y el día completo, de 10 a 18, que es el más top porque te da para cuatro calas',
        'luego están los de atardecer, que solo van de mayo a agosto: el sunset de 18.30 a 21.30, el medio día + sunset, y el complete, que es el día entero hasta las 21.30',
        'todo en un llaut mallorquín de madera con más de 50 años, por la costa de andratx'
      ],
      precioSinExp: 'depende de la experiencia. tenemos medio día, día completo y los de atardecer, qué tenéis en mente?',
      exp: 'el {nombre} es {horas}{extra}. va con patrón, combustible, snacks, refrescos, agua, paddle surf, snorkel, sea scooter, seguro y limpieza',
      expComida: 'lo único que no entra es la comida, pero es que ahí está la gracia: paráis a comer en un restaurante de cala, sant elmo o cala illamp, y es un planazo. son solo {precio}',
      expSinComida: 'y el baño en cala, que eso no tiene precio. son {precio} y ya está todo',
      fueraTemporada: 'ojo que el {nombre} solo va del 1 de mayo al 31 de agosto. para esas fechas os encaja mejor el medio día o el día completo',
      perro: 'claro que sí! los perros educados son bienvenidos, nosotros navegamos con los nuestros 🐶',
      ninos: 'con peques os lo vais a pasar en grande, el barco es muy familiar y muy seguro',
      aniversario: 'uy qué bien, felicidades!!',
      celebracion: 'uy qué planazo!',
      comida: 'la comida no entra, pero es parte del plan: paráis en un restaurante de cala, tipo sant elmo, cala illamp o el puerto de valldemossa',
      foradada: 'se puede, sí. como está más lejos son 150 más de combustible, pero merece mucho la pena',
      pago: 'la mitad al reservar en la web y la otra mitad ese mismo día en el barco',
      donde: 'navegamos por la costa de andratx, entre las malgrats y cala ses hortigues. el punto exacto os lo pasamos con la ubicación al cerrar la reserva',
      horario: 'el medio día de 9.30 a 13.30 o de 14.30 a 18.30, el día completo de 10 a 18 y el sunset de 18.30 a 21.30. según el mes puede variar un poco',
      descuento: 'eso ya lo tiene que ver david, se lo paso y te dice',
      grupoGrande: 'para {n} lo tiene que mirar david antes, se lo paso y te dice enseguida',
      personasOk: 'vale, {n} perfecto.',
      libreConEnlace: 'el {dia} lo tienes libre. resérvalo aquí mismo y queda hecho',
      libreSinExp: 'el {dia} lo tienes libre.',
      ocupado: 'uf, el {dia} lo tengo pillado. el {alt} lo tienes libre, te encaja?',
      preguntaFecha: 'qué fechas mirabais?',
      preguntaPersonas: 'cuántos seríais?',
      preguntaExp: 'y qué os apetece más, medio día, día completo o atardecer?',
      gracias: 'a ti! cualquier cosa me dices',
      reservado: 'de lujo! nos vemos el {dia}',
      nada: 'cuéntame, qué teníais pensado?'
    },
    en: {
      saludo: 'hi!',
      info: [
        'so, we have the half day, four hours in the morning or the afternoon. and the full day, 10am to 6pm, which is the best one because you get to see four coves',
        'then there are the sunset ones, only from may to august: the sunset trip 18.30 to 21.30, the half day + sunset, and the complete, which is the whole day until 21.30',
        'all on a wooden mallorcan llaut with more than 50 years of history, along the andratx coast'
      ],
      precioSinExp: 'depends on the trip. we have half day, full day and the sunset ones, what do you have in mind?',
      exp: 'the {nombre} is {horas}{extra}. skipper, fuel, snacks, soft drinks, water, paddleboard, snorkel, sea scooter, insurance and cleaning are all included',
      expComida: 'the only thing not included is lunch, but honestly that\'s the best part, you stop at a restaurant in one of the coves, sant elmo or cala illamp. it\'s just {precio}',
      expSinComida: 'plus a swim in a quiet cove, which is priceless. it\'s {precio} and that\'s everything',
      fueraTemporada: 'heads up, the {nombre} only runs from 1 may to 31 august. for those dates the half day or the full day would suit you better',
      perro: 'of course! well-behaved dogs are more than welcome, we sail with our own dogs 🐶',
      ninos: 'you\'re going to have a great time with the kids, the boat is very family friendly and very safe',
      aniversario: 'oh congrats!!',
      celebracion: 'oh that sounds like a great plan!',
      comida: 'lunch isn\'t included, but that\'s part of the plan: you stop at a restaurant in a cove, like sant elmo, cala illamp or port de valldemossa',
      foradada: 'yes we can. it\'s further away so it\'s 150 extra for fuel, but it\'s really worth it',
      pago: 'half when you book on the website and the other half on the day, on the boat',
      donde: 'we sail along the andratx coast, between the malgrats islands and cala ses hortigues. we send you the exact meeting point with the location once you book',
      horario: 'half day 9.30 to 13.30 or 14.30 to 18.30, full day 10 to 18 and the sunset trip 18.30 to 21.30. it can change a little depending on the month',
      descuento: 'that\'s one for david, i\'ll pass it on and he\'ll get back to you',
      grupoGrande: 'for {n} people david needs to have a look first, i\'ll pass it on and he\'ll get back to you',
      personasOk: '{n} of you, lovely.',
      libreConEnlace: 'the {dia} is free, you can book it right here',
      libreSinExp: 'the {dia} is free.',
      ocupado: 'ah, the {dia} is already taken. the {alt} is free though, would that work?',
      preguntaFecha: 'what dates were you thinking?',
      preguntaPersonas: 'how many of you would there be?',
      preguntaExp: 'and what fancies you more, half day, full day or sunset?',
      gracias: 'thank you! any questions just let me know',
      reservado: 'amazing! see you on the {dia}',
      nada: 'tell me, what did you have in mind?'
    }
  },

  /* ---------- Correo: mismo tono, algo más formal ---------- */
  correo: {
    es: {
      saludo: 'Hola {nombre},',
      gracias: 'Muchas gracias por escribirnos.',
      aniversario: 'Y enhorabuena por la celebración, qué buen plan.',
      celebracion: 'Qué buen plan para celebrarlo.',
      perro: 'Y sí, vuestro perro es bienvenido a bordo: nosotros navegamos con los nuestros.',
      ninos: 'Con niños os lo vais a pasar en grande: el barco es muy familiar y muy seguro.',
      info: 'Tenemos medio día, que son cuatro horas por la mañana o por la tarde, y día completo, de 10:00 a 18:00, con cuatro paradas en cuatro calas. Y de mayo a agosto, las salidas de atardecer: el sunset de 18:30 a 21:30, el medio día + sunset de 14:00 a 21:30 y el complete, el día entero hasta las 21:30. Todo a bordo de nuestro llaut mallorquín de más de 50 años, por la costa de Andratx.',
      infoPregunta: 'Si nos decís cuál os apetece más, os contamos todo lo que incluye.',
      exp: 'El {nombre} es {horas}{extra}, a bordo de nuestro llaut mallorquín de más de 50 años. Va con patrón profesional, combustible, snacks, refrescos, agua, paddle surf, snorkel, sea scooter, seguro y limpieza.',
      expComida: 'Lo único que no entra es la comida, y ahí está parte de la gracia: se para a comer en un restaurante de cala, en Sant Elmo o en Cala Illamp. Todo esto son {precio} €.',
      expSinComida: 'Todo esto son {precio} €.',
      fueraTemporada: 'Os comento que el {nombre} solo sale del 1 de mayo al 31 de agosto; para esas fechas os encajaría mejor el medio día o el día completo.',
      comida: 'La comida no está incluida: se para a comer en un restaurante de cala, en Sant Elmo, Cala Illamp o el Puerto de Valldemossa, y es parte del plan.',
      foradada: 'Se puede ir a Sa Foradada; al estar más lejos son 150 € más de combustible.',
      pago: 'Se paga la mitad al reservar en la web y la otra mitad el mismo día en el barco.',
      donde: 'Navegamos por la costa de Andratx; el punto de encuentro exacto os lo enviamos con la ubicación al cerrar la reserva.',
      libre: 'He mirado el calendario y el {dia} lo tenemos libre. Podéis reservarlo directamente aquí: [Reservar en la web]',
      libreSinExp: 'He mirado el calendario y el {dia} lo tenemos libre. En cuanto nos digáis qué experiencia os apetece, lo dejáis reservado en un minuto.',
      ocupado: 'He mirado el calendario y el {dia} ya lo tenemos reservado, pero el {alt} está libre, por si os encaja. Podéis reservarlo aquí: [Reservar en la web]',
      sinFecha: 'Si nos decís qué día os iría bien, lo miramos en el calendario al momento.',
      descuento: 'Sobre el descuento, eso lo tiene que ver David directamente; se lo pasamos y os escribe él.',
      grupoGrande: 'Para un grupo de {n} personas lo tiene que mirar David antes; se lo pasamos y os confirma.',
      cierre: 'Un saludo,\nCarlo Mar Charter',
      agenda: 'Apuntado en Google Calendar: consulta de {nombre} · {dia} · {exp} · {personas}.',
      sinDia: 'sin fecha todavía',
      sinExp: 'experiencia por decidir',
      sinPersonas: 'personas por confirmar'
    },
    en: {
      saludo: 'Hi {nombre},',
      gracias: 'Thanks so much for getting in touch.',
      aniversario: 'And congratulations on the celebration, what a lovely plan.',
      celebracion: 'What a great way to celebrate.',
      perro: 'And yes, your dog is more than welcome on board: we sail with our own dogs.',
      ninos: 'You\'ll have a great time with the kids: the boat is very family friendly and very safe.',
      info: 'We have the half day, four hours in the morning or the afternoon, and the full day, from 10:00 to 18:00, with four stops in four different coves. And from May to August, the sunset trips: the sunset from 18:30 to 21:30, the half day + sunset from 14:00 to 21:30 and the complete, the whole day until 21:30. All on our traditional Mallorcan llaut, a wooden boat with more than 50 years of history, along the Andratx coast.',
      infoPregunta: 'Let us know which one you like best and we\'ll tell you everything it includes.',
      exp: 'The {nombre} goes {horas}{extra}, on our traditional Mallorcan llaut, a wooden boat with more than 50 years of history. It includes the skipper, fuel, snacks, soft drinks, water, paddleboard, snorkel, sea scooter, insurance and cleaning.',
      expComida: 'The only thing not included is lunch, and that\'s part of the fun: you stop at a restaurant in one of the coves, Sant Elmo or Cala Illamp. It\'s {precio} € in total.',
      expSinComida: 'It\'s {precio} € in total.',
      fueraTemporada: 'Just so you know, the {nombre} only runs from 1 May to 31 August; for those dates the half day or the full day would suit you better.',
      comida: 'Lunch isn\'t included: you stop at a restaurant in one of the coves, like Sant Elmo, Cala Illamp or Port de Valldemossa, and it\'s part of the plan.',
      foradada: 'We can go to Sa Foradada; as it\'s further away it\'s 150 € extra for fuel.',
      pago: 'You pay half when you book on the website and the other half on the day, on the boat.',
      donde: 'We sail along the Andratx coast; we send you the exact meeting point with the location once you book.',
      libre: 'I\'ve checked the calendar and {dia} is free. You can book it directly here: [Book on our website]',
      libreSinExp: 'I\'ve checked the calendar and {dia} is free. As soon as you know which trip you\'d like, you can book it in a minute.',
      ocupado: 'I\'ve checked the calendar and {dia} is already booked, but {alt} is free if that works for you. You can book it here: [Book on our website]',
      sinFecha: 'If you tell us which day suits you, we\'ll check the calendar straight away.',
      descuento: 'As for a discount, that\'s something David needs to look at himself; we\'ll pass it on and he\'ll write to you.',
      grupoGrande: 'For a group of {n} people David needs to have a look first; we\'ll pass it on and he\'ll confirm.',
      cierre: 'Best wishes,\nCarlo Mar Charter',
      agenda: 'Apuntado en Google Calendar: consulta de {nombre} · {dia} · {exp} · {personas} · en inglés.',
      sinDia: 'sin fecha todavía',
      sinExp: 'experiencia por decidir',
      sinPersonas: 'personas por confirmar'
    }
  },

  /* Frases para empezar, por si no se les ocurre qué escribir */
  sugerenciasWhatsapp: [
    'hola! qué salidas tenéis?',
    'cuánto vale el día completo? somos 5',
    'puede venir nuestro perro?',
    'tenéis libre el 14 de julio?',
    'nos hacéis descuento?',
    'Hi! How much is the sunset trip?'
  ],

  correoEjemplo: {
    nombre: 'Patricia',
    asunto: 'Salida en barco en agosto',
    mensaje: 'Hola, somos 4 adultos y vamos con nuestro perro. Nos gustaría hacer el día completo el 12 de agosto. ¿Qué incluye y qué precio tiene?'
  }
};
