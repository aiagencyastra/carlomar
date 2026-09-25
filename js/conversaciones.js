/*
  CONTENIDO DE LA DEMO — conversaciones de WhatsApp, seguimiento y correos.
  Aquí solo hay textos. Se pueden retocar sin tocar nada de la lógica.

  Cada conversación es una lista de "eventos" que se reproducen en orden:
    { de: 'cliente', hora, texto }          mensaje del cliente (burbuja verde)
    { de: 'agente',  hora, texto }          respuesta de Carlo Mar (antes sale "escribiendo…")
    { de: 'agente',  hora, texto, enlace: true }   igual, con la tarjeta del enlace de reserva
    { detras: 'texto', resultado: 'texto', tipo }  paso del panel "Lo que pasa por detrás"
        tipo: 'mensaje' | 'regla' | 'calendario' | 'ocupado' | 'enlace' | 'aviso' | 'agenda' | 'idioma' | 'david'
*/

window.DEMO = window.DEMO || {};

window.DEMO.enlaceReserva = {
  titulo: 'Reserva tu salida · Carlo Mar Charter',
  texto: 'Elige experiencia y día, y reserva en un minuto',
  dominio: 'web de carlo mar charter'
};

window.DEMO.conversaciones = [
  {
    id: 'perro',
    titulo: 'Pareja con perro',
    resumen: 'Pide info, pregunta por su perra y reserva',
    eventos: [
      { de: 'cliente', hora: '22:41', texto: 'hola! queríamos info de las salidas en barco, estamos mirando para julio' },
      { detras: 'Mensaje nuevo de Laura a las 22:41', resultado: 'fuera de horario, se contesta igual', tipo: 'mensaje' },
      { detras: 'Le explica las experiencias él mismo', resultado: 'sin mandarla a buscar a la web', tipo: 'regla' },
      { de: 'agente', hora: '22:41', texto: 'hola! pues mira, tenemos medio día, que son cuatro horas por la mañana o por la tarde. y el día completo, de 10 a 18, que es el más top porque te da para cuatro calas' },
      { de: 'agente', hora: '22:42', texto: 'luego están los de atardecer, que solo van de mayo a agosto: el sunset de 18.30 a 21.30, el medio día + sunset, y el complete, que es el día entero hasta las 21.30' },
      { de: 'agente', hora: '22:42', texto: 'todo en un llaut mallorquín de madera con más de 50 años, por la costa de andratx' },
      { de: 'cliente', hora: '22:43', texto: 'qué bonito. somos dos y vamos con nuestra perrita, lola. puede subir?' },
      { detras: 'Pregunta por mascotas', resultado: 'los perros educados son bienvenidos', tipo: 'regla' },
      { de: 'agente', hora: '22:43', texto: 'claro que sí! nosotros navegamos con nuestros perros, así que lola va a estar como en casa 🐶' },
      { de: 'cliente', hora: '22:44', texto: 'jajaja qué bien. estábamos pensando en el sunset, qué incluye?' },
      { detras: 'Pregunta qué incluye', resultado: 'primero todo lo que se lleva, el precio al final', tipo: 'regla' },
      { de: 'agente', hora: '22:44', texto: 'el sunset es una pasada. salís a las 18.30 y volvéis a las 21.30, con el sol ya puesto' },
      { de: 'agente', hora: '22:45', texto: 'va con patrón, combustible, snacks, refrescos, agua, paddle surf, snorkel, sea scooter, seguro y limpieza. y el baño en cala con la luz de la tarde, que eso no tiene precio. son 1100 y ya está todo' },
      { de: 'cliente', hora: '22:45', texto: 'nos encanta. tendríais el 12 de julio?' },
      { detras: 'Consultando calendario del 12 de julio…', resultado: 'libre', tipo: 'calendario' },
      { de: 'agente', hora: '22:46', texto: 'el 12 lo tienes libre. resérvalo aquí mismo y queda hecho', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'la reserva la hace ella, en la web', tipo: 'enlace' },
      { de: 'cliente', hora: '22:48', texto: 'reservado!! 🙌' },
      { detras: 'Aviso enviado al equipo', resultado: 'David y Patricia ya lo saben', tipo: 'aviso' },
      { detras: 'Lead anotado en la agenda', resultado: 'Laura · 12 de julio · 2 personas + perra · Sunset', tipo: 'agenda' },
      { de: 'agente', hora: '22:48', texto: 'de lujo! nos vemos el 12, a vosotros y a lola' }
    ]
  },
  {
    id: 'familia',
    titulo: 'Familia, 5 personas',
    resumen: 'Pregunta el precio a bocajarro',
    eventos: [
      { de: 'cliente', hora: '14:05', texto: 'buenas. cuánto vale el día completo? somos 5, dos adultos y tres niños' },
      { detras: 'Pregunta el precio a bocajarro', resultado: 'no suelta la cifra de entrada', tipo: 'regla' },
      { de: 'agente', hora: '14:05', texto: 'uy, con niños os lo vais a pasar en grande, el barco es muy familiar y muy seguro' },
      { detras: 'Primero, todo lo que incluye', resultado: 'calas, patrón, bebida, paddle, snorkel, sea scooter…', tipo: 'regla' },
      { de: 'agente', hora: '14:06', texto: 'el día completo es de 10 a 18 y hacéis cuatro paradas, cuatro calas de la costa de andratx. va con patrón, combustible de la ruta, snacks, refrescos, agua, paddle surf, snorkel, sea scooter, seguro y limpieza' },
      { detras: 'Lo que no entra, contado como ventaja', resultado: 'comer en un restaurante de cala', tipo: 'regla' },
      { de: 'agente', hora: '14:06', texto: 'lo único que no entra es la comida, pero es que ahí está la gracia: paráis a comer en un restaurante de cala, sant elmo o cala illamp, y es un planazo. son solo 2000' },
      { detras: 'Y el precio, al final y sin darle importancia', resultado: '«son solo 2000»', tipo: 'regla' },
      { de: 'cliente', hora: '14:08', texto: 'vale, suena muy bien. y se puede llegar a sa foradada? nos lo han recomendado' },
      { de: 'agente', hora: '14:08', texto: 'se puede, sí. como está más lejos son 150 más de combustible, pero merece mucho la pena' },
      { de: 'cliente', hora: '14:09', texto: 'guay. el 3 de agosto lo tenéis?' },
      { detras: 'Consultando calendario del 3 de agosto…', resultado: 'libre', tipo: 'calendario' },
      { de: 'agente', hora: '14:09', texto: 'mira, el 3 lo tienes libre. te lo dejo aquí para que lo reserves', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'la reserva la hace él, en la web', tipo: 'enlace' },
      { de: 'cliente', hora: '14:10', texto: 'y cómo se paga?' },
      { de: 'agente', hora: '14:10', texto: 'la mitad al reservar en la web y la otra mitad ese mismo día en el barco' },
      { de: 'cliente', hora: '14:13', texto: 'hecho, reservado' },
      { detras: 'Aviso enviado al equipo', resultado: 'David y Patricia ya lo saben', tipo: 'aviso' },
      { detras: 'Lead anotado en la agenda', resultado: 'Sergio · 3 de agosto · 5 personas (3 niños) · Full Day + Sa Foradada', tipo: 'agenda' },
      { de: 'agente', hora: '14:13', texto: 'buah qué bien. los peques van a flipar con el sea scooter' }
    ]
  },
  {
    id: 'london',
    titulo: 'Couple from London',
    resumen: 'Lo mismo, pero en inglés',
    eventos: [
      { de: 'cliente', hora: '07:12', texto: 'Hi! My wife and I are coming to Mallorca for our anniversary in July. How much is a full day on the boat?' },
      { detras: 'Mensaje nuevo de James a las 07:12', resultado: 'fuera de horario, se contesta igual', tipo: 'mensaje' },
      { detras: 'Escribe en inglés', resultado: 'se le contesta en inglés', tipo: 'idioma' },
      { de: 'agente', hora: '07:12', texto: 'oh happy anniversary!! what a lovely way to celebrate 🥂' },
      { detras: 'Pregunta el precio', resultado: 'primero lo que incluye, el precio al final', tipo: 'regla' },
      { de: 'agente', hora: '07:13', texto: 'the full day is 10am to 6pm and you get four stops, four different coves along the andratx coast. skipper, fuel for the route, snacks, soft drinks, water, paddleboard, snorkel, sea scooter, insurance and cleaning are all included' },
      { de: 'agente', hora: '07:13', texto: 'the only thing not included is lunch, but honestly that\'s the best part. you stop at a restaurant in one of the coves, sant elmo or cala illamp. it\'s just 2000' },
      { de: 'cliente', hora: '07:15', texto: 'That sounds perfect. We fly in from London on the 17th, could we do the 18th?' },
      { detras: 'Consultando calendario del 18 de julio…', resultado: 'libre', tipo: 'calendario' },
      { de: 'agente', hora: '07:15', texto: 'ha, coming from london the water here is going to feel like another planet. the 18th is free, you can book it right here', enlace: true },
      { detras: 'Enlace de reserva enviado', resultado: 'la reserva la hace él, en la web', tipo: 'enlace' },
      { de: 'cliente', hora: '07:19', texto: 'Booked! Thank you so much' },
      { detras: 'Aviso enviado al equipo', resultado: 'David y Patricia ya lo saben', tipo: 'aviso' },
      { detras: 'Lead anotado en la agenda', resultado: 'James · 18 de julio · 2 personas · Full Day · aniversario · inglés', tipo: 'agenda' },
      { de: 'agente', hora: '07:19', texto: 'thank you! see you on the 18th, we\'ll make it a special one' }
    ]
  },
  {
    id: 'ocupada',
    titulo: 'Fecha ocupada y descuento',
    resumen: 'Día pillado y pide rebaja',
    eventos: [
      { de: 'cliente', hora: '16:20', texto: 'hola, cuánto sale el medio día? seríamos 6' },
      { detras: 'Pregunta el precio', resultado: 'primero lo que incluye, el precio al final', tipo: 'regla' },
      { de: 'agente', hora: '16:20', texto: 'hola! el medio día son cuatro horas, de 9.30 a 13.30 o por la tarde de 14.30 a 18.30' },
      { de: 'agente', hora: '16:21', texto: 'va con patrón, combustible, snacks, refrescos, agua, paddle surf, snorkel, sea scooter, seguro y limpieza, y da tiempo de sobra para bañarse en cala. son 1100' },
      { de: 'cliente', hora: '16:22', texto: 'vale. el 9 de agosto por la mañana?' },
      { detras: 'Consultando calendario del 9 de agosto…', resultado: 'ocupado', tipo: 'ocupado' },
      { detras: 'Buscando alternativa: 10 de agosto…', resultado: 'libre', tipo: 'calendario' },
      { de: 'agente', hora: '16:22', texto: 'uf, el 9 lo tengo pillado. el 10 por la mañana lo tienes libre, te encaja?' },
      { de: 'cliente', hora: '16:24', texto: 'el 10 nos va bien. oye y no hay descuento? somos 6 y seguramente repitamos en septiembre' },
      { detras: 'Pide descuento', resultado: 'no lo toca: eso lo decide David', tipo: 'regla' },
      { de: 'agente', hora: '16:24', texto: 'eso ya lo tiene que ver david, se lo paso y te dice' },
      { detras: 'Pasado a David', resultado: 'Marc · 10 de agosto, mañana · 6 personas · pide descuento', tipo: 'david' },
      { de: 'agente', hora: '16:25', texto: 'y si repetís en septiembre, mejor aún, que el agua sigue buenísima' },
      { de: 'cliente', hora: '16:25', texto: 'vale, gracias!' },
      { detras: 'Lead anotado en la agenda', resultado: 'Marc · 10 de agosto · 6 personas · Half Day · pendiente de David', tipo: 'agenda' },
      { de: 'agente', hora: '16:25', texto: 'a ti! en nada te escribe' }
    ]
  }
];

/* Los dos mensajes que el sistema manda solo, firmados por Patricia. */
window.DEMO.seguimiento = [
  {
    cuando: 'Al reservar',
    detalle: 'Se manda solo en cuanto entra la reserva',
    hora: '22:52',
    texto: 'hola laura! soy patricia, de carlo mar charter. mil gracias por reservar con nosotros, de verdad. os esperamos el lunes 12 de julio de 18:30 a 21:30, venid 10 minutitos antes y ahora te paso la ubicación. qué ganas de teneros a bordo, a vosotros y a lola ☀️'
  },
  {
    cuando: 'Dos días antes',
    detalle: 'Se manda solo el sábado 10 de julio',
    hora: '10:15',
    texto: 'laura, que ya lo tenemos aquí! el lunes a las 18:30 salimos, y nosotros con muchísimas ganas. si celebráis algo o queréis que tengamos algo en cuenta, cuéntamelo sin problema'
  }
];
