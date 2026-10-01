/*
  "Pruébalo tú": un WhatsApp en el que se puede escribir.
  No es la IA real: es un bot de reglas preparado para la demo, que entiende
  lo típico de un cliente (tipo de barco, personas, fecha, precio, dudas)
  en español e inglés, y se aparta cuando algo es para el equipo.
*/
(function () {
  'use strict';

  var D = window.DEMO || {};
  var jefe = (D.marca || {}).responsable || 'Jordi';
  var jefeMin = jefe.toLowerCase();

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function el(tag, clase, html) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function horaAhora() {
    var d = new Date();
    return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  }
  // minúsculas, sin acentos ni signos
  function norm(t) {
    return ' ' + String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[¿?¡!.,;:()"“”]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  }

  var ICONOS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cargando: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/>',
    mensaje: '<path d="M4 5h16v11H9l-5 4z"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ocupado: '<path d="M6 6l12 12M18 6L6 18"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8.5 14.5l2.3 2.3 4.7-4.6"/>',
    regla: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z"/>',
    idioma: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    barco: '<path d="M3 15h18l-2.5 4.5h-13z"/><path d="M12 3v11M12 4l6 9h-6z"/>',
    base: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>',
    nota: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M9 11h6M9 14.5h6M9 18h3.5"/>',
    doble: '<path d="M1.5 6.2l2.8 2.8L10 3.2M6.2 8.3l.7.7L12.6 3.2"/>'
  };
  function icono(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[n] || ICONOS.check) + '</svg>'; }

  /* ---------- La flota que conoce este bot (de ejemplo) ---------- */
  var TIPOS = {
    sinlicencia: { barco: 'Blau', max: 5, medio: 190, dia: 290, gasolina: true,
      es: 'lancha sin licencia', en: 'no-license boat',
      descEs: 'una lancha sin licencia de 5 metros, que la lleváis vosotros sin necesitar nada', descEn: 'a 5 m boat you drive yourselves, no license needed' },
    licencia: { barco: 'Cala', max: 7, medio: 300, dia: 420, gasolina: true,
      es: 'lancha con licencia', en: 'licensed boat',
      descEs: 'la cala, una lancha de 6,7 metros con 150 cv (pide pnb o superior)', descEn: 'the cala, a 6.7 m boat with 150 hp (you need a license)' },
    patron: { barco: 'Gavina', max: 10, medio: 650, dia: 950, gasolina: false,
      es: 'semirrígida con patrón', en: 'RIB with skipper',
      descEs: 'la gavina, una semirrígida de 8 metros con patrón, que os lleva a las mejores calas', descEn: 'the gavina, an 8 m RIB with a skipper who takes you to the best coves' }
  };

  var MESES = { enero: 'enero', febrero: 'febrero', marzo: 'marzo', abril: 'abril', mayo: 'mayo', junio: 'junio', julio: 'julio', agosto: 'agosto', septiembre: 'septiembre', setiembre: 'septiembre', octubre: 'octubre', noviembre: 'noviembre', diciembre: 'diciembre',
    january: 'enero', february: 'febrero', march: 'marzo', april: 'abril', may: 'mayo', june: 'junio', july: 'julio', august: 'agosto', september: 'septiembre', october: 'octubre', november: 'noviembre', december: 'diciembre' };
  var MES_EN = { enero: 'January', febrero: 'February', marzo: 'March', abril: 'April', mayo: 'May', junio: 'June', julio: 'July', agosto: 'August', septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December' };
  var DIAS_SEM = { lunes: ['el lunes', 'on Monday'], martes: ['el martes', 'on Tuesday'], miercoles: ['el miércoles', 'on Wednesday'], jueves: ['el jueves', 'on Thursday'], viernes: ['el viernes', 'on Friday'], sabado: ['el sábado', 'on Saturday'], domingo: ['el domingo', 'on Sunday'],
    monday: ['el lunes', 'on Monday'], tuesday: ['el martes', 'on Tuesday'], wednesday: ['el miércoles', 'on Wednesday'], thursday: ['el jueves', 'on Thursday'], friday: ['el viernes', 'on Friday'], saturday: ['el sábado', 'on Saturday'], sunday: ['el domingo', 'on Sunday'] };
  var NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20 };
  var NUM_RE = '(\\d{1,2}|' + Object.keys(NUM).join('|') + ')';
  function aNum(t) { return /^\d+$/.test(t) ? Number(t) : NUM[t]; }
  function ordinal(n) { var u = n % 10, d = n % 100; return n + (u === 1 && d !== 11 ? 'st' : u === 2 && d !== 12 ? 'nd' : u === 3 && d !== 13 ? 'rd' : 'th'); }

  /* ---------- Estado de la conversación ---------- */
  var s, cola = Promise.resolve(), ocupado = false, ultimoDe = null;

  function estadoInicial() {
    return { idioma: null, tipo: null, personas: null, ninos: false, fecha: null, duracion: null, turno: null,
      ofertado: false, enlace: false, reservado: false, derivar: null, preguntasDerivar: 0, derivado: false, avisoJordi: false, saludado: false };
  }

  var ui = {
    chat: $('#pr-chat'), form: $('#pr-form'), input: $('#pr-input'), sub: $('#pr-sub'), reloj: $('#pr-reloj'),
    chips: $('#pr-chips'), pasos: $('#pr-pasos'), ficha: $('#pr-ficha')
  };
  if (!ui.chat) return;

  function t(es, en) { return s.idioma === 'en' ? en : es; }

  /* ---------- Entender el mensaje ---------- */
  function detectarIdioma(n) {
    var en = (n.match(/ (hi|hello|hey|boat|how|much|tomorrow|people|we|are|license|licence|the|is|can|price|you|have|please|thanks|thank|book|want|would|for|morning|afternoon|yes|with|skipper|nights|what|do|there|our|of|us|rent)(?= )/g) || []).length;
    var es = (n.match(/ (hola|buenas|lancha|barco|cuanto|manana|somos|personas|licencia|el|la|de|que|precio|teneis|quiero|queremos|gracias|si|dia|tarde|patron|noches|para|alquilar|hay|un|una|y|con|sin|seriamos)(?= )/g) || []).length;
    if (en > es) return 'en';
    if (es > en) return 'es';
    return null;
  }

  function leerPersonas(n) {
    var total = 0, encontrado = false, m;
    var re = new RegExp(' ' + NUM_RE + ' (personas|persona|pax|adultos|adulto|amigos|amigas|people|persons|adults|adult|friends|ninos|nino|ninas|nina|kids|kid|children|child|crios|peques)(?= )', 'g');
    while ((m = re.exec(n))) { total += aNum(m[1]); encontrado = true; }
    if (encontrado) return total;
    m = n.match(new RegExp(' (?:somos|seriamos|seremos|vamos|we are|we re|were|there are|there will be|party of|group of|para|for) ' + NUM_RE + '(?= )(?! (dias|dia|noches|noche|horas|hora|days|day|nights|night|hours|hour|de |am|pm))'));
    if (m) return aNum(m[1]);
    if (/ (en pareja|mi pareja y yo|somos una pareja|a couple|my wife and i|my husband and i|my partner and i) /.test(n)) return 2;
    return null;
  }

  function leerTurno(n) {
    if (/ (por la manana|de manana|la manana|a la manana|morning|am) /.test(n)) return 'manana';
    if (/ (por la tarde|la tarde|de tarde|tarde|afternoon|evening|pm) /.test(n)) return 'tarde';
    return null;
  }

  function leerDuracion(n) {
    if (/ (dia entero|todo el dia|dia completo|full day|whole day|all day|8 horas|8 hours) /.test(n)) return 'dia';
    if (/ (un dia|1 dia|a day|one day|for the day) /.test(n) && !/ (medio dia|half day) /.test(n)) return 'dia';
    if (/ (medio dia|media jornada|half day|half-day|4 horas|4 hours|unas horas|un par de horas|couple of hours|few hours) /.test(n)) return 'medio';
    return null;
  }

  function leerFecha(n) {
    var m;
    // rango "del 12 al 15" / "from 12 to 15"
    m = n.match(/ (?:del|desde el|from the|from) (\d{1,2})(?:st|nd|rd|th)? (?:al|hasta el|to the|to|till|until) (\d{1,2})(?:st|nd|rd|th)?(?: de| of)? ?([a-z]+)?/);
    if (m) {
      var mr = MESES[m[3]] || '';
      return { es: 'del ' + m[1] + ' al ' + m[2] + (mr ? ' de ' + mr : ''), en: 'from the ' + ordinal(+m[1]) + ' to the ' + ordinal(+m[2]) + (mr ? ' of ' + MES_EN[mr] : ''), rango: true };
    }
    if (/ pasado manana | day after tomorrow /.test(n)) return { es: 'pasado mañana', en: 'the day after tomorrow', clave: 'pasado' };
    var sinTurno = n.replace(/ (por la|de|la|a la) manana /g, ' ');
    if (/ manana /.test(sinTurno) || / tomorrow /.test(n)) return { es: 'mañana', en: 'tomorrow', clave: 'manana' };
    if (/ (hoy|esta tarde|today|this afternoon) /.test(n)) return { es: 'hoy', en: 'today', clave: 'hoy' };
    // "12 de agosto" / "august 12" / "12 august" / "12th of august" / "12/8"
    var r;
    r = buscar(n, / (\d{1,2})(?:st|nd|rd|th)? (?:de |of )?([a-z]+)(?= )/g, function (x) { return MESES[x[2]] ? conDia(+x[1], MESES[x[2]]) : null; });
    if (r) return r;
    r = buscar(n, / ([a-z]+) (?:the )?(\d{1,2})(?:st|nd|rd|th)?(?= )/g, function (x) { return MESES[x[1]] ? conDia(+x[2], MESES[x[1]]) : null; });
    if (r) return r;
    m = n.match(/ (\d{1,2})\/(\d{1,2})(?:\/\d{2,4})? /);
    if (m) { var mm = Object.keys(MES_EN)[+m[2] - 1]; if (mm) return conDia(+m[1], mm); }
    for (var d in DIAS_SEM) {
      var md = n.match(new RegExp(' ' + d + ' (?:el |the )?(\\d{1,2})(?:st|nd|rd|th)?(?= )'));
      if (md) { var f = conDia(+md[1], null); f.es = DIAS_SEM[d][0] + ' ' + md[1]; f.en = DIAS_SEM[d][1] + ' the ' + ordinal(+md[1]); return f; }
      if (n.indexOf(' ' + d + ' ') >= 0) return { es: DIAS_SEM[d][0], en: DIAS_SEM[d][1], clave: d };
    }
    m = n.match(/ (?:el|dia|the|on the|on) (\d{1,2})(?:st|nd|rd|th)?(?= )/);
    if (m && +m[1] >= 1 && +m[1] <= 31) return conDia(+m[1], null);
    m = n.match(/ (?:en|para|a mediados de|a finales de|a principios de|in|mid|early|late|end of) ([a-z]+)/);
    if (m && MESES[m[1]]) return { es: 'en ' + MESES[m[1]], en: 'in ' + MES_EN[MESES[m[1]]], vaga: true };
    return null;
  }
  function buscar(n, re, fn) {
    var x;
    re.lastIndex = 0;
    while ((x = re.exec(n))) { var r = fn(x); if (r) return r; re.lastIndex = x.index + 1; }
    return null;
  }
  function conDia(dia, mes) {
    return { es: 'el ' + dia + (mes ? ' de ' + mes : ''), en: 'the ' + ordinal(dia) + (mes ? ' of ' + MES_EN[mes] : ''), dia: dia, mes: mes };
  }

  function leerTipo(n) {
    if (/ (sin licencia|sin titulacion|sin carnet|sin titulo|no license|no licence|without a licen|without licen|dont have a licen|don t have a licen|no tenemos licencia|no tengo licencia|no tenemos titulacion|no tengo titulacion|blau) /.test(n)) return 'sinlicencia';
    if (/ (patron|skipper|captain|capitan|que nos lleve|nos lleven|con tripulacion|semirrigida|gavina|rib) /.test(n)) return 'patron';
    if (/ (con licencia|tengo licencia|tenemos licencia|tengo titulacion|tenemos titulacion|tengo el pnb|tengo pnb|pnb|patron de embarcaciones|licencia de navegacion|i have a licen|we have a licen|have a boating licen|licensed|cala) /.test(n)) return 'licencia';
    return null;
  }
  function sinTitulacion(n) {
    return / (nadie tiene|ninguno tiene|ninguno tenemos|no tenemos|no tengo|none of us|nobody has|no one has|we don t have|we dont have) /.test(n);
  }

  function motivoEquipo(n, personas, fecha) {
    var md = n.match(new RegExp(' ' + NUM_RE + ' (dias|days)(?= )'));
    if ((md && aNum(md[1]) > 1) || / (un par de dias|couple of days|varios dias|few days) /.test(n)) return 'pernocta';
    if (/ (noche|noches|pernoct|dormir|varios dias|una semana|semana entera|overnight|nights|night|sleep|a week|whole week|several days|multi day) /.test(n) || (fecha && fecha.rango)) return 'pernocta';
    if (/ (catamar|velero|vela|yate|yacht|sailboat|sailing|barco grande|big boat|large boat|lagoon) /.test(n)) return 'grande';
    if (/ (despedida|boda|evento|empresa|team building|bachelor|hen party|stag|wedding|corporate) /.test(n)) return 'evento';
    if (personas && personas > 10) return 'grupo';
    if (/ (descuento|rebaja|mas barato|precio especial|oferta|discount|cheaper|better price|deal) /.test(n)) return 'descuento';
    if (/ (queja|reclamacion|fatal|muy mal|horrible|complaint|terrible|awful|disappointed) /.test(n)) return 'queja';
    if (/ (hablar con (alguien|una persona|jordi|un humano)|persona real|humano|llamadme|me llamais|human|real person|talk to someone|speak to someone|call me) /.test(n)) return 'humano';
    return null;
  }
  var MOTIVOS = {
    pernocta: ['pernocta o varios días', 'overnight / several days'],
    grande: ['barco grande (velero, catamarán o yate)', 'big boat'],
    evento: ['evento a medida', 'event'],
    grupo: ['grupo de más de 10 (no cabe en las lanchas)', 'group of more than 10'],
    descuento: ['pide descuento', 'asks for a discount'],
    queja: ['queja', 'complaint'],
    humano: ['quiere hablar con una persona', 'wants to talk to a person']
  };

  /* ---------- Disponibilidad de ejemplo ---------- */
  function estaOcupado() {
    var f = s.fecha;
    if (!f) return false;
    if (f.dia && [9, 16, 23].indexOf(f.dia) >= 0) return true;
    if (f.clave === 'manana' && s.turno === 'tarde' && s.tipo === 'sinlicencia') return true;
    return false;
  }
  function alternativa() {
    var f = s.fecha;
    if (f.clave === 'manana') return { fecha: { es: 'mañana', en: 'tomorrow', clave: 'manana' }, turno: 'manana' };
    return { fecha: conDia(f.dia + 1, f.mes), turno: s.turno };
  }

  function precioTexto(tipo, duracion) {
    var x = TIPOS[tipo];
    if (duracion === 'medio') return t('el medio día son ' + x.medio + ' €', 'the half day is ' + x.medio + ' €');
    if (duracion === 'dia') return t('el día entero son ' + x.dia + ' €', 'the full day is ' + x.dia + ' €');
    return t('medio día ' + x.medio + ' € y día entero ' + x.dia + ' €', x.medio + ' € half day and ' + x.dia + ' € full day');
  }
  function extraTexto(tipo) {
    return TIPOS[tipo].gasolina
      ? t('con seguro incluido, la gasolina va aparte según lo que gastes', 'insurance included, fuel is paid at the end depending on use')
      : t('con patrón, gasolina de la ruta, nevera y snorkel', 'with skipper, fuel for the route, cooler and snorkel gear');
  }
  function franjaTexto() {
    return s.duracion === 'dia' ? 'día entero' : (s.turno === 'manana' ? 'medio día por la mañana' : 'medio día por la tarde');
  }
  function turnoTexto() {
    if (s.duracion === 'dia') return t(', de 10 a 18', ', 10am to 6pm');
    if (s.turno === 'manana') return t(' por la mañana, de 9:30 a 13:30', ' in the morning, 9:30 to 13:30');
    if (s.turno === 'tarde') return t(' por la tarde, de 14:30 a 18:30', ' in the afternoon, 14:30 to 18:30');
    return '';
  }

  /* ---------- Respuestas a dudas sueltas ---------- */
  function dudas(n, respuestas) {
    var tipo = s.tipo;
    if (/ (cuanto|precio|precios|cuesta|cuestan|cuanto vale|que vale|tarifa|tarifas|cuanto sale|price|prices|how much|cost|rates) /.test(n) && !s.ofertado) {
      if (tipo) respuestas.push(t('la ' + TIPOS[tipo].barco.toLowerCase() + ': ', 'the ' + TIPOS[tipo].barco.toLowerCase() + ': ') + precioTexto(tipo, s.duracion) + ', ' + extraTexto(tipo));
      else respuestas.push(t('mira, la sin licencia va desde 190 € el medio día, la de con licencia desde 300 € y la semirrígida con patrón desde 650 €',
        'so, the no-license boat is from 190 € for a half day, the licensed one from 300 € and the RIB with skipper from 650 €'));
      s.preguntoPrecio = true;
    }
    if (/ (incluye|incluido|incluida|lleva|include|included|includes) /.test(n)) {
      respuestas.push(tipo === 'patron'
        ? t('va con patrón, gasolina de la ruta, seguro, nevera, chalecos y equipo de snorkel', 'it includes the skipper, fuel for the route, insurance, cooler, life jackets and snorkel gear')
        : t('lleva seguro, chalecos (también de niño), toldo y escalera de baño. la gasolina se paga al volver', 'insurance, life jackets (kids too), sun shade and swim ladder are included. fuel is paid when you come back'));
    }
    if (/ (gasolina|combustible|fuel|gas|petrol) /.test(n)) {
      respuestas.push(t('en las lanchas se paga al volver según lo que gastes, normalmente unos 30-40 € el medio día. en la gavina con patrón ya va incluida', 'on the self-drive boats you pay at the end for what you use, usually 30-40 € for a half day. with the skipper it\'s included'));
    }
    if (/ (pagar|pago|paga|tarjeta|efectivo|senal|transferencia|bizum|pay|payment|card|cash|deposit) /.test(n)) {
      respuestas.push(t('la señal con tarjeta al reservar y el resto el mismo día, con tarjeta o en efectivo', 'a deposit by card when booking and the rest on the day, card or cash'));
    }
    if (/ (perro|perra|perrito|perrita|mascota|mascotas|dog|dogs|pet|pets|puppy) /.test(n)) {
      respuestas.push(t('claro, los perros educados son bienvenidos 🐶', 'of course, well-behaved dogs are very welcome 🐶'));
    }
    if (s.ninosNuevo) {
      respuestas.push(t('con peques perfecto, llevamos chalecos de niño a bordo', 'kids are very welcome, we have children\'s life jackets on board'));
    }
    if (/ (donde|ubicacion|puerto|salis|sale|zona|mallorca|where|location|port|located|marina) /.test(n)) {
      respuestas.push(t('este año estamos también en mallorca: las lanchas salen de port d\'andratx y la semirrígida de puerto portals', 'this year we\'re also in mallorca: the boats leave from port d\'andratx and the RIB from puerto portals'));
    }
    if (/ (horario|horarios|a que hora|que horas|what time|hours|schedule|times) /.test(n)) {
      respuestas.push(t('el medio día es de 9:30 a 13:30 o de 14:30 a 18:30, y el día entero de 10 a 18', 'half days are 9:30 to 13:30 or 14:30 to 18:30, and the full day is 10am to 6pm'));
    }
    if (/ (hace falta|necesito|necesitamos|se necesita|do i need|do we need|need a licen) /.test(n) && /licen|titul|carnet/.test(n)) {
      respuestas.push(t('para la blau y la sol no hace falta nada, te lo explicamos todo en 10 minutos antes de salir. la cala sí pide pnb', 'for the small ones you need nothing, we explain everything in 10 minutes before you leave. the bigger one needs a license'));
    }
    if (/ (tiempo|viento|llueve|lluvia|mal tiempo|weather|wind|rain) /.test(n)) {
      respuestas.push(t('si el tiempo no acompaña, te cambiamos el día o te devolvemos la señal, sin problema', 'if the weather is bad, we change the day or refund the deposit, no problem'));
    }
    if (/ (cancelar|cancelacion|anular|cancel|cancellation|refund) /.test(n)) {
      respuestas.push(t('puedes cancelar sin coste hasta 48 h antes', 'you can cancel for free up to 48 hours before'));
    }
    if (/ (cumple|cumpleanos|aniversario|birthday|anniversary|luna de miel|honeymoon) /.test(n)) {
      respuestas.unshift(t('ooh qué bien, felicidades! 🎉', 'oh lovely, congratulations! 🎉'));
    }
  }

  /* ---------- Lo que toca preguntar o hacer ahora ---------- */
  function siguientePaso(respuestas, pasos) {
    // ¿le cabe la gente en el barco?
    if (s.tipo && s.personas && s.personas > TIPOS[s.tipo].max) {
      if (s.personas <= 10) {
        var antes = TIPOS[s.tipo].barco;
        s.tipo = 'patron';
        pasos.push(['Para ' + s.personas + ' no cabe en la ' + antes, 'propone la Gavina con patrón (hasta 10)', 'ficha']);
        respuestas.push(t('para ' + s.personas + ' la ' + antes.toLowerCase() + ' se os queda pequeña. os va mejor la gavina, una semirrígida de 8 metros con patrón, caben hasta 10',
          'for ' + s.personas + ' the ' + antes.toLowerCase() + ' is too small. the gavina is better, an 8 m RIB with a skipper, up to 10 people'));
      }
    }
    if (!s.tipo) {
      if (s.titulacion === false) {
        s.tipo = (s.personas && s.personas > 5) ? 'patron' : 'sinlicencia';
        respuestas.push(t('sin problema, entonces os va ', 'no problem, then ') + t(TIPOS[s.tipo].descEs, TIPOS[s.tipo].descEn));
      } else {
        respuestas.push(t('la queréis llevar vosotros o preferís con patrón? para las pequeñas no hace falta licencia', 'would you like to drive it yourselves or go with a skipper? the small ones need no license'));
        return;
      }
    }
    if (!s.personas) { respuestas.push(t('cuántos seríais?', 'how many of you?')); return; }
    if (!s.fecha) { respuestas.push(t('qué día os iría bien?', 'which day were you thinking?')); return; }
    if (s.fecha.vaga) { respuestas.push(t('y qué día de ' + s.fecha.es.replace('en ', '') + ' exactamente?', 'and which day exactly?')); return; }
    if (!s.duracion) {
      if (s.turno) s.duracion = 'medio';
      else { respuestas.push(t('medio día (4 horas) o día entero?', 'half day (4 hours) or full day?')); return; }
    }
    if (s.duracion === 'medio' && !s.turno) { respuestas.push(t('por la mañana o por la tarde?', 'morning or afternoon?')); return; }

    // Mira el calendario
    var nombreTipo = t(TIPOS[s.tipo].es, TIPOS[s.tipo].es);
    var franja = franjaTexto();
    if (estaOcupado()) {
      pasos.push(['CRM: ' + nombreTipo + ', ' + s.fecha.es + ', ' + franja + '…', 'ocupado', 'ocupado']);
      var alt = alternativa();
      var antes2 = s.fecha, antesTurno = s.turno;
      s.fecha = alt.fecha; s.turno = alt.turno;
      pasos.push(['Busca el hueco más cercano…', 'libre', 'crm']);
      var turnoAntes = s.duracion === 'dia' ? '' : (antesTurno === 'manana' ? t(' por la mañana', ' morning') : antesTurno === 'tarde' ? t(' por la tarde', ' afternoon') : '');
      respuestas.push(t('uf, ' + antes2.es + turnoAntes + ' lo tengo cogido. ' + s.fecha.es + turnoTexto() + ' lo tienes libre, te encaja?',
        'ah, ' + antes2.en + turnoAntes + ' is already booked. ' + s.fecha.en + turnoTexto() + ' is free, would that work?'));
      s.ofertado = true;
      return;
    }
    pasos.push(['CRM: ' + nombreTipo + ', ' + s.fecha.es + ', ' + franja + '…', 'libre', 'crm']);
    pasos.push(['Ficha de la ' + TIPOS[s.tipo].barco + ' en el CRM', 'hasta ' + TIPOS[s.tipo].max + ' · ' + TIPOS[s.tipo].medio + ' € medio día · ' + TIPOS[s.tipo].dia + ' € día', 'ficha']);
    respuestas.push(t(s.fecha.es + turnoTexto() + ' tengo libre la ' + TIPOS[s.tipo].barco.toLowerCase() + '. ' + precioTexto(s.tipo, s.duracion) + ', ' + extraTexto(s.tipo),
      s.fecha.en + turnoTexto() + ' the ' + TIPOS[s.tipo].barco.toLowerCase() + ' is free. ' + precioTexto(s.tipo, s.duracion) + ', ' + extraTexto(s.tipo)));
    respuestas.push(t('te la dejo reservada?', 'shall I book it for you?'));
    s.ofertado = true;
  }

  /* ---------- Procesar un mensaje ---------- */
  function procesar(texto) {
    var n = norm(texto);
    var respuestas = [], pasos = [], enlace = false;
    var primer = !s.idioma;
    s.preguntoPrecio = false;

    var idioma = detectarIdioma(n);
    if (idioma && (primer || idioma !== s.idioma)) {
      var cambia = s.idioma && idioma !== s.idioma;
      s.idioma = idioma;
      if (idioma === 'en' || cambia) pasos.push(['Escribe en ' + (idioma === 'en' ? 'inglés' : 'español'), 'se le contesta en ' + (idioma === 'en' ? 'inglés' : 'español'), 'idioma']);
    }
    if (!s.idioma) s.idioma = 'es';

    // Si ya lo lleva Jordi, el bot no contesta
    if (s.derivado) {
      pasos.push(['Mensaje nuevo', 'lo ve ' + jefe + ' en la app, el bot no contesta', 'persona']);
      var nota = !s.avisoJordi;
      s.avisoJordi = true;
      return { respuestas: [], pasos: pasos, notaJordi: nota };
    }

    // Lo que trae el mensaje
    var personas = leerPersonas(n); if (personas) s.personas = personas;
    var ninos = / (nino|ninos|nina|ninas|crio|crios|peque|peques|hijos|hijas|bebe|kid|kids|children|child|baby) /.test(n);
    s.ninosNuevo = ninos && !s.ninos; if (ninos) s.ninos = true;
    var fecha = leerFecha(n); if (fecha) { s.fecha = fecha; if (s.ofertado && !s.enlace) s.ofertado = false; }
    var turno = leerTurno(n); if (turno) { s.turno = turno; if (s.ofertado && !s.enlace) s.ofertado = false; }
    var duracion = leerDuracion(n); if (duracion) { s.duracion = duracion; if (s.ofertado && !s.enlace) s.ofertado = false; }
    var tipo = leerTipo(n); if (tipo) { if (tipo !== s.tipo && s.ofertado && !s.enlace) s.ofertado = false; s.tipo = tipo; }
    if (sinTitulacion(n) && !tipo) s.titulacion = false;
    if (s.titulacion === false && s.tipo === 'licencia') s.tipo = null;

    // ¿Es para el equipo?
    var motivo = motivoEquipo(n, s.personas, fecha);
    if (motivo && !s.derivar) {
      s.derivar = motivo;
      pasos.push(['Qué pide: ' + MOTIVOS[motivo][0], 'esto es para el equipo, el bot solo prepara el terreno', 'persona']);
    }
    if (s.derivar) return derivar(n, respuestas, pasos);

    // Clasificación (una vez)
    if ((s.tipo || personas || fecha) && !s.clasificado) {
      s.clasificado = true;
      pasos.push(['Qué pide: lancha de día', 'esto lo lleva el bot de principio a fin', 'regla']);
    }

    var saludo = / (hola|buenas|buenos dias|buenas tardes|hey|hi|hello|good morning|good afternoon) /.test(n);
    var gracias = / (gracias|thank|thanks|thx|merci|danke) /.test(n);
    var si = / (si|vale|ok|okay|perfecto|genial|dale|venga|adelante|claro|reserva|reservala|reservalo|reservamela|yes|yeah|yep|sure|great|perfect|book it|lets do it|let s do it|sounds good|go ahead) /.test(n);
    var hecho = / (reservado|reservada|hecho|listo|ya esta|pagado|booked|done|paid|all set) /.test(n);
    var no = / (no gracias|no thanks|mejor no|nah|ya te digo|lo pienso|let me think|i ll think) /.test(n);

    // Ya mandó el enlace y confirma la reserva
    if (s.enlace && !s.reservado && (hecho || (si && !fecha))) {
      s.reservado = true;
      pasos.push(['La reserva entra en el CRM', TIPOS[s.tipo].barco + ' · ' + s.fecha.es + ' · ' + franjaTexto() + ' · ' + s.personas + ' personas', 'reserva']);
      pasos.push(['Guardado en la base de datos', 'conversación completa + datos del cliente', 'bd']);
      respuestas.push(t('genial! nos vemos ' + s.fecha.es + '. venid 15 minutos antes para firmar y enseñaros la lancha ⛵', 'lovely! see you ' + s.fecha.en + '. come 15 minutes early so we can show you the boat ⛵'));
      return { respuestas: respuestas, pasos: pasos };
    }

    if (s.ofertado && !s.enlace && no) {
      respuestas.push(t('sin problema, aquí estoy para lo que necesites', 'no problem, I\'m here if you need anything'));
      pasos.push(['Guardado en la base de datos', 'interesado, pendiente de reservar', 'bd']);
      return { respuestas: respuestas, pasos: pasos };
    }

    var tipoAntes = s.tipoContado;
    dudas(n, respuestas);

    var algo = personas || fecha || turno || duracion || tipo || ninos || s.titulacion === false;
    if (saludo && !algo && !respuestas.length && !s.ofertado) {
      s.saludado = true;
      respuestas.push(t('hola! qué tal? cuéntame qué tenías en mente', 'hi! how can I help?'));
      return { respuestas: respuestas, pasos: pasos };
    }
    var entendido = algo || respuestas.length || saludo || gracias || si || hecho || no;

    // Primera vez que dice qué barco quiere: se lo cuenta un poco
    if (tipo && !tipoAntes && !s.preguntoPrecio && !s.ofertado) {
      s.tipoContado = true;
      respuestas.push(t('sí, claro. tenemos ' + TIPOS[tipo].descEs, 'sure! we have ' + TIPOS[tipo].descEn));
    } else if (tipo) s.tipoContado = true;

    // Acepta la oferta → enlace de reserva
    if (s.ofertado && !s.enlace && si && !fecha && !turno && !duracion && !tipo) {
      s.enlace = true;
      enlace = true;
      respuestas.push(t('aquí la tienes, con el día ya puesto. solo tus datos y la señal', 'here you go, the date is already filled in. just your details and the deposit'));
      pasos.push(['Enlace de reserva enviado', TIPOS[s.tipo].barco + ' · ' + s.fecha.es + ' ya rellenos', 'enlace']);
      return { respuestas: respuestas, pasos: pasos, enlace: true };
    }

    if (s.reservado) {
      if (!respuestas.length) respuestas.push(gracias ? t('a vosotros! cualquier cosa me dices', 'thank you! anything else, just ask') : t('dime, lo que necesites', 'sure, tell me'));
      return { respuestas: respuestas, pasos: pasos };
    }

    var antes = respuestas.length;
    if (!entendido) respuestas.push(t('perdona, no te he pillado del todo', 'sorry, I didn\'t quite get that'));
    if (!s.ofertado || fecha || turno || duracion || tipo || personas) {
      if (s.ofertado && s.enlace) { /* ya tiene el enlace */ } else { s.ofertado = false; siguientePaso(respuestas, pasos); }
    } else if (s.ofertado && !respuestas.length) {
      respuestas.push(t('te la dejo reservada entonces?', 'shall I book it for you then?'));
    }

    if (saludo && !s.saludado) {
      s.saludado = true;
      respuestas.unshift(t('hola!', 'hi!'));
    }
    if (gracias && !respuestas.length) respuestas.push(t('a ti!', 'thank you!'));
    if (enlace) return { respuestas: respuestas, pasos: pasos, enlace: true };
    return { respuestas: respuestas.slice(0, 4), pasos: pasos };
  }

  function derivar(n, respuestas, pasos) {
    var m = s.derivar;
    var largo = m === 'pernocta' || m === 'grande' || m === 'evento' || m === 'grupo';
    if (largo && s.preguntasDerivar < 2) {
      var falta = (!s.fecha || (s.fecha.vaga && s.preguntasDerivar === 0)) ? 'fecha' : (!s.personas ? 'personas' : null);
      if (falta) {
        if (s.preguntasDerivar === 0) respuestas.push(m === 'pernocta'
          ? t('qué buen plan! dormir a bordo y despertarse en una cala es otra cosa', 'what a plan! waking up in a quiet cove is something else')
          : t('qué buen plan! para eso tenemos velero, catamarán y yate', 'sounds great! for that we have a sailboat, a catamaran and a yacht'));
        s.preguntasDerivar++;
        respuestas.push(falta === 'fecha' ? t('qué fechas tenéis en mente?', 'which dates do you have in mind?') : t('y cuántos seríais?', 'and how many of you?'));
        return { respuestas: respuestas, pasos: pasos };
      }
    }
    // Se lo pasa a Jordi
    s.derivado = true;
    var resumen = [MOTIVOS[m][0]];
    if (s.personas) resumen.push(s.personas + ' personas' + (s.ninos ? ' (con niños)' : ''));
    if (s.fecha) resumen.push(s.fecha.es);
    if (s.tipo) resumen.push(TIPOS[s.tipo].es);
    if (s.titulacion === false) resumen.push('sin titulación');
    resumen.push('en ' + (s.idioma === 'en' ? 'inglés' : 'español'));
    pasos.push(['Prepara el resumen para el equipo', resumen.join(' · '), 'resumen']);
    pasos.push(['Pasado a ' + jefe + ' en la app', 'aviso en su móvil con el resumen', 'persona']);
    pasos.push(['El bot se aparta de esta conversación', 'hasta que ' + jefe + ' la devuelva', 'regla']);
    pasos.push(['Guardado en la base de datos', 'oportunidad para el equipo', 'bd']);
    var txt = {
      pernocta: t('esto ya te lo prepara ' + jefeMin + ' personalmente, que las salidas de varios días las monta él a medida. le paso todo y te escribe hoy mismo', jefe + ' will prepare this for you personally, he puts together the multi-day trips. I\'m passing everything on and he\'ll write to you today'),
      grande: t('esto te lo prepara ' + jefeMin + ' personalmente, que los barcos grandes los lleva él. le paso todo y te escribe en un rato', jefe + ' handles the bigger boats personally. I\'m passing everything on and he\'ll get back to you shortly'),
      evento: t('esto lo monta ' + jefeMin + ' a medida. le paso todo y te escribe hoy mismo', jefe + ' will put this together for you. I\'m passing it on and he\'ll write to you today'),
      grupo: t('para un grupo así lo mejor es que te lo prepare ' + jefeMin + '. le paso todo y te escribe en un rato', 'for a group that size ' + jefe + ' will prepare it for you. he\'ll write to you shortly'),
      descuento: t('eso ya lo tiene que ver ' + jefeMin + ', se lo paso y te dice', 'that\'s for ' + jefe + ' to decide, I\'ll pass it on and he\'ll let you know'),
      queja: t('uf, lo siento mucho. se lo paso ahora mismo a ' + jefeMin + ' para que te escriba él', 'oh, I\'m really sorry. I\'m passing this to ' + jefe + ' right now so he can get back to you'),
      humano: t('claro, le paso tu mensaje a ' + jefeMin + ' y te escribe él en un rato', 'of course, I\'m passing your message to ' + jefe + ' and he\'ll write to you shortly')
    }[m];
    respuestas.push(txt);
    return { respuestas: respuestas, pasos: pasos };
  }

  /* ---------- Pintar ---------- */
  function horaMeta(suya) {
    return '<span class="meta' + (suya ? '' : ' sin') + '">' + horaAhora() +
      (suya ? '<svg viewBox="0 0 14 11" aria-hidden="true">' + ICONOS.doble + '</svg>' : '') + '</span>';
  }
  function tarjetaEnlace() {
    var e = D.enlaceReserva || {};
    return '<span class="tarjeta-enlace">' +
      '<span class="tarjeta-enlace-img" aria-hidden="true"><svg viewBox="0 0 300 86" preserveAspectRatio="xMidYMid slice">' +
        '<circle cx="232" cy="30" r="15" fill="#D99A2B" opacity=".9"/>' +
        '<path d="M0 60c30-6 60-6 90 0s60 6 90 0 60-6 90 0 30 4 30 4v22H0z" fill="#2c5282" opacity=".55"/>' +
        '<path d="M0 68c30-5 60-5 90 0s60 5 90 0 60-5 90 0 30 3 30 3v15H0z" fill="#3b6aa6" opacity=".6"/>' +
        '<path d="M108 58h64l-8 9h-48z" fill="#fff"/><path d="M118 58l6-9h26l4 9z" fill="#D99A2B"/>' +
      '</svg></span>' +
      '<span class="tarjeta-enlace-txt"><b>' + esc(e.titulo || '') + '</b><span>' + esc(e.texto || '') + '</span><small>' + esc(e.dominio || '') + '</small></span>' +
    '</span>';
  }
  function burbuja(texto, de, conEnlace) {
    var suya = de === 'cliente';
    var b = el('div', 'burbuja ' + (suya ? 'suya' : 'nuestra'));
    if (ultimoDe !== de) b.classList.add('primera');
    ultimoDe = de;
    b.innerHTML = (conEnlace ? tarjetaEnlace() : '') + esc(texto) + (conEnlace ? ' <span class="enlace-falso">reservar →</span>' : '') + horaMeta(suya);
    ui.chat.appendChild(b);
    bajar();
    return b;
  }
  function bajar() { ui.chat.scrollTop = ui.chat.scrollHeight; }

  function paso(p) {
    var vacio = $('.pr-vacio', ui.pasos);
    if (vacio) vacio.remove();
    var tipo = p[2];
    var etiqueta = tipo === 'crm' ? ' <span class="etiqueta libre">' + esc(p[1]) + '</span>' : tipo === 'ocupado' ? ' <span class="etiqueta pillado">' + esc(p[1]) + '</span>' : '';
    var ico = { crm: 'calendario', ocupado: 'ocupado', ficha: 'barco', enlace: 'enlace', reserva: 'agenda', bd: 'base', regla: 'regla', idioma: 'idioma', persona: 'persona', resumen: 'nota' }[tipo] || 'check';
    var cls = tipo === 'persona' ? 'equipo' : tipo;
    var li = el('li', 'paso hecho ' + cls + (tipo === 'crm' || tipo === 'reserva' ? ' ok' : ''));
    li.innerHTML = '<span class="paso-ico">' + icono(ico) + '</span><span class="paso-txt"><b>' + esc(etiqueta ? p[0].replace(/…$/, '') : p[0]) + etiqueta + '</b><span class="paso-res">' + (etiqueta ? '' : esc(p[1] || '')) + '</span></span>';
    ui.pasos.appendChild(li);
    var caja = ui.pasos.parentNode;
    caja.scrollTop = caja.scrollHeight;
  }

  function pintarFicha() {
    var estado = s.derivado ? ['Pasado a ' + jefe, 'equipo'] : s.reservado ? ['Reservado', 'reservado'] : s.enlace ? ['Enlace enviado', 'pendiente'] : s.ofertado ? ['Oferta hecha', 'pendiente'] : (s.idioma ? ['Hablando con el bot', 'pendiente'] : ['Esperando mensaje', 'pendiente']);
    var filas = [
      ['Idioma', s.idioma ? (s.idioma === 'en' ? 'Inglés' : 'Español') : ''],
      ['Qué busca', s.derivar ? MOTIVOS[s.derivar][0] : (s.tipo ? TIPOS[s.tipo].es : '')],
      ['Personas', s.personas ? s.personas + (s.ninos ? ' (con niños)' : '') : (s.ninos ? 'con niños' : '')],
      ['Fecha', s.fecha ? s.fecha.es : ''],
      ['Horario', s.duracion === 'dia' ? 'Día entero' : s.turno ? 'Medio día, ' + (s.turno === 'manana' ? 'mañana' : 'tarde') : (s.duracion === 'medio' ? 'Medio día' : '')],
      ['Barco', !s.derivar && s.tipo ? TIPOS[s.tipo].barco : '']
    ];
    var antes = ui.ficha.getAttribute('data-ultimo') || '';
    var html = filas.map(function (f) {
      return '<div class="pr-campo' + (f[1] ? ' lleno' : '') + '"><dt>' + f[0] + '</dt><dd>' + (f[1] ? esc(f[1]) : '—') + '</dd></div>';
    }).join('') + '<div class="pr-campo lleno"><dt>Estado</dt><dd><span class="estado ' + estado[1] + '">' + esc(estado[0]) + '</span></dd></div>';
    if (html !== antes) {
      var viejos = Array.prototype.map.call(ui.ficha.querySelectorAll('dd'), function (d) { return d.textContent; });
      ui.ficha.innerHTML = html;
      ui.ficha.setAttribute('data-ultimo', html);
      Array.prototype.forEach.call(ui.ficha.querySelectorAll('dd'), function (d, i) {
        if (viejos.length && viejos[i] !== d.textContent) { d.classList.remove('salta'); void d.offsetWidth; d.classList.add('salta'); }
      });
    }
  }

  /* ---------- Sugerencias ---------- */
  function sugerencias() {
    var en = s.idioma === 'en', l;
    if (s.derivado) l = en ? ['ok, thanks!'] : ['vale, gracias!'];
    else if (s.reservado) l = en ? ['thanks!', 'can we bring our dog?', 'where do you leave from?'] : ['gracias!', 'se puede llevar al perro?', 'de dónde salís?'];
    else if (s.enlace) l = en ? ['booked!', 'how do I pay?'] : ['hecho, reservado!', 'cómo se paga?'];
    else if (s.ofertado) l = en ? ['yes, book it', 'any discount?', 'what\'s included?'] : ['sí, resérvala', 'hay descuento?', 'qué incluye?'];
    else if (!s.idioma) l = ['hola! alquiláis lanchas sin licencia?', 'cuánto cuesta un día con patrón?', 'queremos un catamarán 3 noches en agosto', 'Hi! Boat for 4 tomorrow afternoon?'];
    else if (s.derivar) l = en ? ['12 to 15 August', 'we are 8'] : ['del 12 al 15 de agosto', 'somos 8'];
    else if (!s.tipo) l = en ? ['no license', 'with a skipper', 'I have a license'] : ['sin licencia', 'con patrón', 'tengo el pnb'];
    else if (!s.personas) l = en ? ['we are 4', '2 adults and 2 kids'] : ['somos 4', '2 adultos y 2 niños', 'somos 8'];
    else if (!s.fecha || s.fecha.vaga) l = en ? ['on Saturday', 'tomorrow afternoon', '9 August'] : ['el sábado', 'mañana por la tarde', 'el 9 de agosto'];
    else if (!s.duracion && !s.turno) l = en ? ['half day', 'full day'] : ['medio día', 'día entero'];
    else l = en ? ['morning', 'afternoon'] : ['por la mañana', 'por la tarde'];
    ui.chips.innerHTML = l.map(function (x) { return '<button type="button" class="pr-chip">' + esc(x) + '</button>'; }).join('');
  }

  /* ---------- Enviar ---------- */
  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  var turnoConv = 0;

  function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto || ocupado) return;
    ocupado = true;
    var miTurno = turnoConv;
    ui.input.value = '';
    ui.form.classList.add('ocupado');
    ui.reloj.textContent = horaAhora();
    var b = burbuja(texto, 'cliente');
    var r = procesar(texto);
    (async function () {
      await esperar(500);
      if (miTurno !== turnoConv) return;
      var m = $('.meta', b); if (m) m.classList.add('leido');
      for (var i = 0; i < r.pasos.length; i++) {
        paso(r.pasos[i]);
        await esperar(260);
        if (miTurno !== turnoConv) return;
      }
      pintarFicha();
      for (var j = 0; j < r.respuestas.length; j++) {
        var puntos = el('div', 'escribiendo', '<i></i><i></i><i></i>');
        ui.chat.appendChild(puntos); bajar();
        ui.sub.textContent = t('escribiendo…', 'typing…'); ui.sub.classList.add('escribe');
        await esperar(Math.min(1700, 600 + r.respuestas[j].length * 10));
        puntos.remove();
        if (miTurno !== turnoConv) return;
        ui.sub.textContent = 'en línea'; ui.sub.classList.remove('escribe');
        burbuja(r.respuestas[j], 'agente', r.enlace && j === r.respuestas.length - 1);
        await esperar(250);
      }
      if (r.notaJordi) {
        ui.chat.appendChild(el('div', 'wa-cifrado pr-nota', 'Aquí ya no contesta el bot: le escribe ' + esc(jefe) + ' desde su app'));
        bajar();
      }
      pintarFicha();
      sugerencias();
      ocupado = false;
      ui.form.classList.remove('ocupado');
    })();
  }

  ui.form.addEventListener('submit', function (e) { e.preventDefault(); enviar(ui.input.value); });
  ui.chips.addEventListener('click', function (e) {
    var c = e.target.closest('.pr-chip');
    if (c) enviar(c.textContent);
  });

  function reiniciar() {
    turnoConv++;
    s = estadoInicial();
    ocupado = false;
    ultimoDe = null;
    ui.form.classList.remove('ocupado');
    ui.chat.innerHTML = '';
    ui.chat.appendChild(el('div', 'wa-dia', 'HOY'));
    ui.chat.appendChild(el('div', 'wa-cifrado', 'Escribid como lo haría un cliente. Probad también a pedir un catamarán, un descuento o a escribir en inglés.'));
    ui.pasos.innerHTML = '<li class="pr-vacio">Aquí veréis lo que hace por detrás con cada mensaje.</li>';
    ui.ficha.removeAttribute('data-ultimo');
    ui.ficha.innerHTML = '';
    ui.sub.textContent = 'en línea'; ui.sub.classList.remove('escribe');
    ui.reloj.textContent = horaAhora();
    pintarFicha();
    sugerencias();
  }
  $('#pr-reiniciar').addEventListener('click', function () { reiniciar(); ui.input.focus(); });

  reiniciar();
  window.PruebaDemo = { mostrar: function () { /* listo desde el principio */ }, procesar: function (txt) { return procesar(txt); }, reiniciar: reiniciar };
})();
