/*
  DATOS DE LA DEMO — flota, app del equipo, panel y montaje.
  Todo es de ejemplo. Se puede cambiar aquí sin tocar la lógica.
*/
window.DEMO = window.DEMO || {};

/* =========================================================
   FLOTA (lo que el bot lee del CRM)
     quien: 'bot' | 'equipo'   quién atiende por defecto
     semana: 7 días (lun-dom); cada día [mañana, tarde]
             'l' libre · 'o' ocupado · 'n' noche a bordo (pernocta)
   ========================================================= */
window.DEMO.semana = { titulo: 'Semana del 12 al 18 de julio', dias: ['L 12', 'M 13', 'X 14', 'J 15', 'V 16', 'S 17', 'D 18'] };

window.DEMO.flota = [
  {
    nombre: 'Blau', tipo: 'Lancha sin licencia', medida: '5 m', personas: 5, base: 'Port d\'Andratx',
    precio: 'Medio día 190 € · día 290 €', extra: 'Gasolina aparte · chalecos de niño',
    quien: 'bot',
    semana: [['l','l'],['o','l'],['l','o'],['o','o'],['l','l'],['l','o'],['o','o']]
  },
  {
    nombre: 'Sol', tipo: 'Lancha sin licencia', medida: '5 m', personas: 5, base: 'Port d\'Andratx',
    precio: 'Medio día 190 € · día 290 €', extra: 'Gasolina aparte',
    quien: 'bot',
    semana: [['o','l'],['l','l'],['o','o'],['l','o'],['o','l'],['o','o'],['l','o']]
  },
  {
    nombre: 'Cala', tipo: 'Lancha con licencia', medida: '6,7 m', personas: 7, base: 'Puerto Portals',
    precio: 'Medio día 300 € · día 420 €', extra: 'Necesita PNB o superior · 150 cv',
    quien: 'bot',
    semana: [['l','l'],['l','l'],['o','o'],['l','l'],['o','o'],['o','o'],['l','l']]
  },
  {
    nombre: 'Gavina', tipo: 'Semirrígida con patrón', medida: '8 m', personas: 10, base: 'Puerto Portals',
    precio: 'Medio día 650 € · día 950 €', extra: 'Patrón, gasolina de ruta, nevera, snorkel',
    quien: 'bot',
    semana: [['o','o'],['l','l'],['l','l'],['o','o'],['l','o'],['o','o'],['o','l']]
  },
  {
    nombre: 'Llevant', tipo: 'Velero', medida: '14 m', personas: 10, base: 'Palma',
    precio: 'Día desde 1.400 € · semana a consultar', extra: '8 personas para dormir · 4 camarotes',
    quien: 'equipo',
    semana: [['n','n'],['n','n'],['n','n'],['l','l'],['l','l'],['o','o'],['l','l']]
  },
  {
    nombre: 'Blue Moon', tipo: 'Catamarán Lagoon 42', medida: '12,8 m', personas: 12, base: 'Palma',
    precio: 'Día desde 1.900 € · pernocta a consultar', extra: '8 para dormir · patrón y cocinera opcionales',
    quien: 'equipo',
    semana: [['l','l'],['o','o'],['l','l'],['n','n'],['n','n'],['n','n'],['l','l']]
  },
  {
    nombre: 'Aurora', tipo: 'Yate a motor', medida: '18 m', personas: 12, base: 'Puerto Portals',
    precio: 'A consultar', extra: 'Tripulación incluida · eventos',
    quien: 'equipo',
    semana: [['l','l'],['l','l'],['o','o'],['l','l'],['l','l'],['o','o'],['o','o']]
  }
];

/* Cuándo contesta el bot y cuándo os lo pasa. */
window.DEMO.reglas = {
  bot: [
    'Lanchas con y sin licencia y semirrígidas',
    'Salidas de medio día o día entero',
    'Preguntas de precio, horarios, qué incluye, cómo se paga',
    'Mira el calendario, propone alternativa y deja la reserva hecha'
  ],
  equipo: [
    'Más de un día o noches a bordo',
    'Veleros, catamaranes y yates',
    'Grupos de más de 12 o eventos a medida',
    'Descuentos, quejas o si el cliente pide hablar con alguien'
  ]
};

/* =========================================================
   APP DEL EQUIPO (Chatwoot)
     etiqueta: 'equipo' | 'bot' | 'resuelto'
   ========================================================= */
window.DEMO.equipo = {
  bandeja: [
    { id: 'laia', nombre: 'Laia Puig', hora: '19:09', texto: 'genial, gracias!', etiquetas: [['equipo', 'Pernocta'], ['equipo', 'Para Jordi']], noLeidos: 1, tab: 'mios' },
    { id: 'marco', nombre: 'Marco Bianchi', hora: '18:42', texto: 'Yacht for 12 people, birthday on 3 August…', etiquetas: [['equipo', 'Barco grande']], noLeidos: 2, tab: 'sin' },
    { id: 'tom', nombre: 'Tom Baker', hora: '18:30', texto: 'lovely, see you tomorrow!', etiquetas: [['resuelto', 'Reservado por el bot']], tab: 'todos' },
    { id: 'marta', nombre: 'Marta Serra', hora: '11:41', texto: 'a vosotros! los peques se lo van a pasar…', etiquetas: [['resuelto', 'Reservado por el bot']], tab: 'todos' },
    { id: 'ana', nombre: 'Ana López', hora: 'ayer', texto: 'genial, pues nos vemos el sábado…', etiquetas: [['resuelto', 'Reservado por el bot']], tab: 'todos' },
    { id: 'pau', nombre: 'Pau Ribas', hora: 'ayer', texto: 'y la gasolina cuánto suele ser?', etiquetas: [['bot', 'Lo lleva el bot']], tab: 'todos' }
  ],

  // Conversación de Laia tal y como la ve Jordi al abrirla
  laia: {
    historial: [
      { de: 'cliente', hora: '19:05', texto: 'hola, buenas. estamos mirando un catamarán para 3 noches a mediados de agosto, seríamos 8. qué opciones hay?' },
      { de: 'bot', hora: '19:06', texto: 'tenemos un lagoon 42 que va genial para 8, con cuatro camarotes dobles. qué días tenéis en mente exactamente?' },
      { de: 'cliente', hora: '19:07', texto: 'del 12 al 15 más o menos, flexibles un día arriba o abajo' },
      { de: 'cliente', hora: '19:08', texto: 'con patrón, nadie tiene titulación. y si hay alguien que cocine mejor jaja' },
      { de: 'bot', hora: '19:09', texto: 'jaja se puede, sí. esto ya te lo prepara jordi personalmente, que las salidas de varios días las monta él a medida. le paso todo y te escribe hoy mismo' },
      { de: 'nota', hora: '19:09', titulo: 'Nota del bot · solo la veis vosotros', texto: 'Laia · 8 adultos · catamarán 3 noches · 12-15 agosto (flexible ±1 día) · con patrón y le interesa cocinera · nadie tiene titulación.\nBlue Moon libre del 11 al 16 de agosto según el CRM.' },
      { de: 'cliente', hora: '19:09', texto: 'genial, gracias!' }
    ],
    // Lo que escribe Jordi al pulsar "Contestar"
    respuesta: [
      { de: 'jordi', hora: '19:31', texto: 'hola laia! soy jordi. ya tengo el blue moon reservado provisionalmente para vosotros del 12 al 15 de agosto' },
      { de: 'jordi', hora: '19:32', texto: 'te preparo el presupuesto con patrón y cocinera y te lo mando esta noche. si quieres te llamo un momento y lo vemos más rápido' },
      { de: 'cliente', hora: '19:33', texto: 'sí porfa, llámame cuando puedas!' }
    ]
  }
};

/* =========================================================
   PANEL (datos guardados en la base de datos)
   ========================================================= */
window.DEMO.panel = {
  aviso: 'Datos de ejemplo para la demostración, pensados como una temporada normal.',
  mesActual: 'agosto',

  kpis: [
    { etiqueta: 'Conversaciones en agosto', valor: 512, nota: '+11 % que julio' },
    { etiqueta: 'Resueltas por el bot sin tocar nada', valor: 72, unidad: '%', nota: '368 conversaciones', destacado: true },
    { etiqueta: 'Pasadas al equipo', valor: 144, nota: 'pernoctas y barcos grandes' },
    { etiqueta: 'Tiempo medio de respuesta', valor: 9, unidad: 's', nota: 'de día y de noche' }
  ],

  series: [
    { clave: 'bot', nombre: 'Las lleva el bot', color: '#13233F' },
    { clave: 'equipo', nombre: 'Pasadas al equipo', color: '#D99A2B' }
  ],

  meses: [
    { mes: 'Abr', bot: 52, equipo: 21 },
    { mes: 'May', bot: 118, equipo: 47 },
    { mes: 'Jun', bot: 251, equipo: 96 },
    { mes: 'Jul', bot: 330, equipo: 132 },
    { mes: 'Ago', bot: 368, equipo: 144, actual: true },
    { mes: 'Sep', bot: 214, equipo: 88 },
    { mes: 'Oct', bot: 61, equipo: 27 }
  ],

  // "Qué piden" (reparto de las conversaciones del mes)
  canales: [
    { nombre: 'Lancha sin licencia', porcentaje: 44, color: '#13233F' },
    { nombre: 'Con licencia o patrón', porcentaje: 27, color: '#5b7aa8' },
    { nombre: 'Pernoctas', porcentaje: 17, color: '#D99A2B' },
    { nombre: 'Barcos grandes', porcentaje: 12, color: '#e9c98a' }
  ],
  centroAnillo: 'en agosto',

  fueraDeHorario: {
    etiqueta: 'Conversaciones atendidas fuera de horario (21:00-09:00)',
    porcentaje: 41,
    frase: 'Clientes que antes esperaban a la mañana siguiente y ahora se van con la lancha reservada.'
  },

  // lleva: 'bot' | nombre de la persona   estado: 'reservado' | 'pendiente' | 'equipo'
  leads: [
    { nombre: 'Laia Puig', barco: 'Blue Moon · 3 noches', fecha: '12 ago', personas: 8, lleva: 'Jordi', estado: 'equipo' },
    { nombre: 'Marco Bianchi', barco: 'Aurora · cumpleaños', fecha: '3 ago', personas: 12, lleva: 'Sin asignar', estado: 'equipo' },
    { nombre: 'Tom Baker', barco: 'Sol · medio día', fecha: '13 jul', personas: 4, lleva: 'bot', estado: 'reservado' },
    { nombre: 'Marta Serra', barco: 'Gavina · día', fecha: '20 jul', personas: 6, lleva: 'bot', estado: 'reservado' },
    { nombre: 'Ana López', barco: 'Blau · medio día', fecha: '17 jul', personas: 3, lleva: 'bot', estado: 'reservado' },
    { nombre: 'Pau Ribas', barco: 'Blau o Sol · día', fecha: '24 jul', personas: 2, lleva: 'bot', estado: 'pendiente' },
    { nombre: 'Sophie Martin', barco: 'Llevant · semana', fecha: '2 ago', personas: 6, lleva: 'Jordi', estado: 'reservado' }
  ],

  estados: {
    reservado: 'Reservado',
    pendiente: 'Pendiente de reservar',
    equipo: 'En manos del equipo'
  }
};

/* =========================================================
   MONTAJE
   ========================================================= */
window.DEMO.montaje = {
  // Las dos formas de trabajar. Si se rellena "precio", aparece en la tarjeta.
  opciones: [
    {
      titulo: 'Os lo montamos todo',
      sub: 'Llave en mano',
      recomendada: true,
      precio: '',
      puntos: [
        'Contratamos y preparamos el servidor (VPS con Ubuntu)',
        'Instalamos n8n, Chatwoot y la base de datos, con copias de seguridad',
        'Damos de alta el WhatsApp Business API con vuestro número',
        'Construimos el cerebro: reglas, tono, conexión con el CRM',
        'Pruebas con conversaciones reales antes de encenderlo',
        'Mantenimiento y ajustes durante toda la temporada'
      ]
    },
    {
      titulo: 'Lo montas tú y te acompañamos',
      sub: 'Instalación vuestra, cerebro nuestro',
      precio: '',
      puntos: [
        'Tú preparas el VPS e instalas n8n, Chatwoot y PostgreSQL con nuestra guía paso a paso',
        'Revisamos juntos la instalación antes de seguir',
        'Nosotros construimos el cerebro en n8n y lo conectamos al CRM',
        'Bolsa de horas de soporte para dudas y cambios durante la temporada'
      ]
    }
  ],

  plan: [
    { cuando: 'Semana 1', que: 'Servidor, WhatsApp API y acceso al CRM' },
    { cuando: 'Semana 2', que: 'Cerebro en n8n: reglas, flota, calendario y reservas' },
    { cuando: 'Semana 3', que: 'Chatwoot en vuestros móviles, base de datos y panel' },
    { cuando: 'Semana 4', que: 'Pruebas con vosotros, ajustes de tono y en marcha' }
  ]
};
