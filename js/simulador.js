/*
  "Probadlo vosotros": simulador de WhatsApp y de correo.
  Lee lo que escribe la persona, detecta de qué habla (precio, perro, fecha,
  descuento…) y monta la respuesta con los textos de js/simulador-textos.js,
  siguiendo las reglas del agente: el precio siempre al final, una pregunta
  cada vez, el enlace solo cuando ya hay día y experiencia.
  No se conecta a nada: todo ocurre en el navegador.
*/
(function () {
  'use strict';

  var S = (window.DEMO || {}).simulador;
  if (!S) return;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function el(tag, clase, html) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rellenar(plantilla, datos) {
    return String(plantilla).replace(/\{(\w+)\}/g, function (_, k) { return datos[k] != null ? datos[k] : ''; });
  }
  function norm(t) {
    return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function horaAhora() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ---------------- Entender el mensaje ---------------- */

  var MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var MESES_EN_CORTO = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MESES_ES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var NUMEROS = {
    dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, quince: 15, veinte: 20,
    two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20
  };
  var NUM = '(\\d{1,2}|' + Object.keys(NUMEROS).join('|') + ')';

  function aNumero(t) { return /^\d+$/.test(t) ? parseInt(t, 10) : NUMEROS[t]; }

  function idioma(s, anterior) {
    var en = (s.match(/\b(hi|hello|hey|how|much|what|the|we|our|is|are|boat|price|can|dog|thanks|thank|would|could|book|trip|you|have|there|any|free|please|people|kids)\b/g) || []).length;
    var es = (s.match(/\b(hola|buenas|que|el|la|los|somos|cuanto|precio|barco|perro|perra|para|dia|gracias|queremos|teneis|vale|hay|libre|nos|por|una|un|con|y|de)\b/g) || []).length;
    if (en === 0 && es === 0) return anterior || 'es';
    return en > es ? 'en' : 'es';
  }

  function buscarFecha(s) {
    var m, i;
    var hoy = new Date();
    // "12 de julio", "12 julio", "12 jul"
    m = s.match(new RegExp('\\b(\\d{1,2})\\s*(?:de\\s+)?(' + MESES_ES.join('|') + '|' + MESES_ES_CORTO.join('|') + ')\\b'));
    if (m) { i = MESES_ES.indexOf(m[2]); if (i < 0) i = MESES_ES_CORTO.indexOf(m[2]); return crearFecha(+m[1], i); }
    // "12th of july", "12 july"
    m = s.match(new RegExp('\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(' + MESES_EN.join('|') + '|' + MESES_EN_CORTO.join('|') + ')\\b'));
    if (m) { i = MESES_EN.indexOf(m[2]); if (i < 0) i = MESES_EN_CORTO.indexOf(m[2]); return crearFecha(+m[1], i); }
    // "july 12th"
    m = s.match(new RegExp('\\b(' + MESES_EN.join('|') + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b'));
    if (m) return crearFecha(+m[2], MESES_EN.indexOf(m[1]));
    // "pasado mañana", "mañana" (pero no "por la mañana"), "tomorrow"
    if (/\bpasado manana\b/.test(s)) { var p = new Date(hoy); p.setDate(p.getDate() + 2); return crearFecha(p.getDate(), p.getMonth()); }
    if ((/\bmanana\b/.test(s) && !/\b(la|las|por|de) manana/.test(s)) || /\btomorrow\b/.test(s)) {
      var t = new Date(hoy); t.setDate(t.getDate() + 1); return crearFecha(t.getDate(), t.getMonth());
    }
    return null;
  }

  function crearFecha(dia, mes) {
    if (!dia || dia > 31 || mes < 0) return null;
    var hoy = new Date();
    var anio = hoy.getFullYear();
    var f = new Date(anio, mes, dia);
    if (f < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) f = new Date(anio + 1, mes, dia);
    if (f.getDate() !== dia) return null; // 31 de junio y cosas así
    return { dia: dia, mes: mes, anio: f.getFullYear() };
  }

  function buscarPersonas(s) {
    var m = s.match(new RegExp('\\bsomos\\s+' + NUM + '\\b')) ||
      s.match(new RegExp('\\bseriamos\\s+' + NUM + '\\b')) ||
      s.match(new RegExp('\\b' + NUM + '\\s+(personas|adultos|amigos|people|adults|friends|of us)\\b')) ||
      s.match(new RegExp('\\bwe(?:\\s+are|\'re)\\s+(?:a\\s+(?:group|family|party)\\s+of\\s+)?' + NUM + '\\b')) ||
      s.match(new RegExp('\\b(?:grupo|familia|group|family|party)\\s+(?:de|of)\\s+' + NUM + '\\b'));
    if (m) return aNumero(m[1]);
    if (/\b(pareja|mi novi[oa]|mi mujer|mi marido|couple|my wife|my husband|my partner|my girlfriend|my boyfriend)\b/.test(s)) return 2;
    return null;
  }

  function buscarExperiencia(s) {
    var half = /\b(medio dia|media jornada|half ?-?day|4 horas|cuatro horas)\b/.test(s);
    var sunset = /\b(sunset|atardecer|puesta de sol)\b/.test(s);
    if (half && sunset) return 'halfsunset';
    if (/\bcomplete\b/.test(s) || /\bdia entero\b.*\b(atardecer|sunset)\b/.test(s)) return 'complete';
    if (/\b(dia completo|full ?-?day|todo el dia|whole day|all day)\b/.test(s)) return 'full';
    if (sunset) return 'sunset';
    if (half) return 'half';
    return null;
  }

  function analizar(texto, estado) {
    var s = norm(texto);
    return {
      idioma: idioma(s, estado.idioma),
      saludo: /^(hola|buenas|buenos dias|hi|hello|hey|good morning)\b/.test(s),
      info: /\b(info|informacion|experiencias|salidas|opciones|que teneis|que hay|que ofreceis|what do you|options|trips|tours|excursiones)\b/.test(s),
      precio: /\b(cuanto|precio|precios|cuesta|valen|tarifa|tarifas|how much|price|prices|cost|rate|rates|incluye|include|includes|included)\b/.test(s),
      experiencia: buscarExperiencia(s),
      perro: /\b(perr\w*|mascota\w*|dogs?|pets?|puppy)\b/.test(s),
      ninos: /\b(ninos|ninas|nino|nina|hijos|hijas|peques|crios|kids|children|child|bebe|baby)\b/.test(s),
      aniversario: /\b(aniversario|anniversary|cumple\w*|birthday|luna de miel|honeymoon)\b/.test(s),
      celebracion: /\b(despedida|celebrar|celebracion|fiesta|hen party|stag|bachelor\w*|celebrate|celebrating|party)\b/.test(s),
      descuento: /\b(descuento|rebaja|oferta|mas barato|precio especial|discount|cheaper|deal|best price)\b/.test(s),
      comida: /\b(comida|comer|almuerzo|almorzar|restaurante|lunch|food|eat)\b/.test(s),
      foradada: /\bforadada\b/.test(s),
      pago: /\b(pagar|pago|paga|se paga|tarjeta|senal|pay|payment|deposit)\b/.test(s),
      donde: /\b(donde|desde donde|puerto|punto de encuentro|where|meeting point|pick ?up)\b/.test(s),
      horario: /\b(horario|horarios|a que hora|que hora|what time|times|schedule)\b/.test(s),
      reservado: /\b(reservado|ya esta reservado|hecho|booked|done)\b/.test(s),
      afirmacion: /^(si|sii+|vale|ok|okay|perfecto|genial|nos va bien|nos encaja|me encaja|yes|sure|great|perfect|sounds good|works)\b/.test(s),
      gracias: /^(ok|vale|gracias|muchas gracias|perfecto|genial|guay|top|thanks|thank you|great|cool|perfect)[\s!.]*$/.test(s),
      fecha: buscarFecha(s),
      personas: buscarPersonas(s),
      texto: s
    };
  }

  /* ---------------- Calendario de prueba ---------------- */
  // Un calendario inventado pero estable: el mismo día da siempre el mismo resultado.
  function ocupado(f) { return (f.dia + (f.mes + 1) * 2) % 6 === 0; }
  function siguienteLibre(f) {
    var d = new Date(f.anio, f.mes, f.dia);
    do { d.setDate(d.getDate() + 1); } while (ocupado({ dia: d.getDate(), mes: d.getMonth() }));
    return { dia: d.getDate(), mes: d.getMonth(), anio: d.getFullYear() };
  }
  function enTemporada(f) { return f.mes >= 4 && f.mes <= 7; } // 1 de mayo - 31 de agosto

  function ordinal(n) {
    if (n % 100 >= 11 && n % 100 <= 13) return n + 'th';
    return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  }
  function diaCorto(f, lang) { return lang === 'en' ? ordinal(f.dia) : String(f.dia); }
  function diaLargo(f, lang) {
    if (lang === 'en') return ordinal(f.dia) + ' ' + MESES_EN[f.mes].charAt(0).toUpperCase() + MESES_EN[f.mes].slice(1);
    return f.dia + ' de ' + MESES_ES[f.mes];
  }
  function diaPanel(f) { return f.dia + ' de ' + MESES_ES[f.mes]; }

  /* ---------------- Montar la respuesta ---------------- */

  /*
    Devuelve { mensajes: [{texto, enlace}], pasos: [...], pasosFinal: [...] }
    formal = true para el correo.
  */
  function responder(texto, estado, formal) {
    var a = analizar(texto, estado);
    var lang = a.idioma;
    estado.idioma = lang;
    var T = formal ? S.correo[lang] : S.whatsapp[lang];
    var out = [];
    var pasos = [];
    var pasosFinal = [];
    var hayPregunta = false;
    var primera = !estado.mensajes;
    estado.mensajes = (estado.mensajes || 0) + 1;

    function di(t, enlace) { out.push({ texto: t, enlace: !!enlace }); }
    function paso(detras, resultado, tipo) { pasos.push({ detras: detras, resultado: resultado, tipo: tipo }); }

    var h = horaAhora();
    var horaNum = parseInt(h, 10);
    if (primera) {
      var fuera = horaNum >= 21 || horaNum < 9;
      paso((formal ? 'Correo nuevo' : 'Mensaje nuevo') + ' a las ' + h, fuera ? 'fuera de horario, se contesta igual' : 'se contesta al momento', 'mensaje');
    }
    if (lang === 'en' && !estado.avisoIdioma) {
      estado.avisoIdioma = true;
      paso('Escribe en inglés', 'se le contesta en inglés', 'idioma');
    }

    // Recordar lo que nos cuentan
    if (a.experiencia) estado.experiencia = a.experiencia;
    if (a.perro) estado.perro = true;
    if (a.ninos) estado.ninos = true;
    var personasNuevas = a.personas && a.personas !== estado.personas;
    if (a.personas) estado.personas = a.personas;

    // ¿Acepta la alternativa que le propusimos?
    var fecha = a.fecha;
    if (!fecha && estado.alternativa) {
      var alt = estado.alternativa;
      if (new RegExp('\\b' + alt.dia + '\\b').test(a.texto) || a.afirmacion) fecha = alt;
    }

    var exp = estado.experiencia ? S.experiencias[estado.experiencia] : null;

    /* --- Correo: saludo y agradecimiento --- */
    if (formal) {
      di(rellenar(T.saludo, { nombre: estado.nombre || '' }));
      di(T.gracias);
    }

    /* --- Ya ha reservado / da las gracias --- */
    if (!formal && estado.enlaceEnviado && a.reservado) {
      registrarLead(estado, pasosFinal);
      di(rellenar(T.reservado, { dia: diaCorto(estado.fecha, lang) }));
      return { mensajes: out, pasos: pasos, pasosFinal: pasosFinal, idioma: lang };
    }
    if (!formal && a.gracias && !a.fecha && !a.experiencia) {
      if (estado.enlaceEnviado) registrarLead(estado, pasosFinal);
      di(T.gracias);
      return { mensajes: out, pasos: pasos, pasosFinal: pasosFinal, idioma: lang };
    }

    /* --- Reacciones de persona antes de informar --- */
    var reaccion = [];
    if (a.aniversario) reaccion.push(T.aniversario + (formal ? '' : ' 🥂'));
    else if (a.celebracion) reaccion.push(T.celebracion);
    if (a.ninos) reaccion.push(T.ninos);
    if (a.perro) { reaccion.push(T.perro); paso(lang === 'en' ? 'Pregunta por su perro' : 'Pregunta por mascotas', 'los perros educados son bienvenidos', 'regla'); }
    if (formal) { if (reaccion.length) di(reaccion.join(' ')); }
    else reaccion.forEach(function (r, i) { di((i === 0 && primera && (a.saludo || !a.precio) ? T.saludo + ' ' : '') + r); });
    var saludado = !formal && reaccion.length && primera && (a.saludo || !a.precio);

    /* --- Información y precio (el precio, siempre al final) --- */
    var hablaExp = a.experiencia || (a.precio && exp);
    if (hablaExp && exp) {
      var L = exp[lang];
      if (a.precio) paso(lang === 'en' ? 'Pregunta el precio' : 'Pregunta el precio', 'primero todo lo que incluye, el precio al final', 'regla');
      var fueraTemp = exp.temporada && (fecha || estado.fecha) && !enTemporada(fecha || estado.fecha);
      if (fueraTemp) {
        di(prefijo(rellenar(T.fueraTemporada, { nombre: L.nombre })));
        estado.experiencia = null;
        paso('Esa experiencia no sale en esas fechas', 'solo del 1 de mayo al 31 de agosto', 'regla');
      } else {
        var textoExp = rellenar(T.exp, { nombre: L.nombre, horas: formal ? L.formalHoras : L.horas, extra: formal ? L.formalExtra : L.extra });
        if (exp.comida) {
          di(prefijo(textoExp));
          paso('Lo que no entra, contado como ventaja', 'comer en un restaurante de cala', 'regla');
          di(rellenar(T.expComida, { precio: exp.precio }));
        } else if (formal) {
          di(textoExp + ' ' + rellenar(T.expSinComida, { precio: exp.precio }));
        } else {
          di(prefijo(textoExp));
          di(rellenar(T.expSinComida, { precio: exp.precio }));
        }
        estado.precioDado = true;
      }
    } else if (a.precio || a.info || (primera && !a.fecha && !reaccion.length && !a.descuento)) {
      if (a.precio && !a.info) {
        paso('Pregunta el precio sin decir de qué', 'no suelta la lista de precios: pregunta qué le apetece', 'regla');
        if (formal) { di(T.info); di(T.infoPregunta); estado.preguntoExp = true; }
        else { di(prefijo(T.precioSinExp)); hayPregunta = true; }
      } else if (a.info || primera) {
        paso('Le explica las experiencias él mismo', 'sin mandarle a buscar a la web', 'regla');
        if (formal) { di(T.info); if (!a.fecha) { di(T.infoPregunta); estado.preguntoExp = true; } }
        else { S.whatsapp[lang].info.forEach(function (t, i) { di(i === 0 ? prefijo(t) : t); }); }
      }
    }

    /* --- Otras dudas concretas --- */
    if (a.foradada) di(prefijo(T.foradada));
    if (a.comida && !(hablaExp && exp && exp.comida)) di(prefijo(T.comida));
    if (a.horario && !hablaExp && T.horario) di(prefijo(T.horario));
    if (a.pago) di(prefijo(T.pago));
    if (a.donde) di(prefijo(T.donde));

    /* --- Grupo grande: lo mira David --- */
    var aDavid = false;
    if (personasNuevas && estado.personas > 12) {
      di(prefijo(rellenar(T.grupoGrande, { n: estado.personas })));
      paso('Grupo de ' + estado.personas + ' personas', 'lo tiene que mirar David', 'regla');
      pasos.push({ detras: 'Pasado a David', resultado: 'grupo de ' + estado.personas + ' personas', tipo: 'david' });
      aDavid = true;
    }

    /* --- Fecha: se mira el calendario --- */
    if (fecha && exp && exp.temporada && !enTemporada(fecha) && estado.experiencia) {
      // pide una salida de atardecer fuera de temporada
      di(prefijo(rellenar(T.fueraTemporada, { nombre: exp[lang].nombre })));
      estado.experiencia = null;
    }
    if (fecha) {
      estado.alternativa = null;
      var corto = diaCorto(fecha, lang), largo = diaLargo(fecha, lang);
      pasos.push({ detras: 'Consultando calendario del ' + diaPanel(fecha) + '…', resultado: ocupado(fecha) ? 'ocupado' : 'libre', tipo: ocupado(fecha) ? 'ocupado' : 'calendario' });
      if (ocupado(fecha)) {
        var otra = siguienteLibre(fecha);
        pasos.push({ detras: 'Buscando alternativa: ' + diaPanel(otra) + '…', resultado: 'libre', tipo: 'calendario' });
        estado.alternativa = otra;
        estado.fecha = otra;
        if (formal) {
          di(rellenar(T.ocupado, { dia: largo, alt: diaLargo(otra, lang) }));
          estado.enlaceEnviado = true;
        } else {
          di(prefijo(rellenar(T.ocupado, { dia: corto, alt: diaCorto(otra, lang) })));
          hayPregunta = true;
        }
      } else {
        estado.fecha = fecha;
        if (estado.experiencia && !aDavid) {
          if (formal) di(rellenar(T.libre, { dia: largo }));
          else di(prefijo(rellenar(T.libreConEnlace, { dia: corto })), true);
          estado.enlaceEnviado = true;
          pasosFinal.push({ detras: 'Enlace de reserva enviado', resultado: 'la reserva la hace el cliente, en la web', tipo: 'enlace' });
          registrarLead(estado, pasosFinal);
        } else {
          di(prefijo(rellenar(formal ? T.libreSinExp : T.libreSinExp, { dia: formal ? largo : corto })));
        }
      }
    } else if (estado.fecha && estado.experiencia && !estado.enlaceEnviado && !estado.alternativa && !aDavid) {
      // ya sabíamos el día y ahora ha elegido experiencia: se le pasa el enlace
      if (formal) di(rellenar(T.libre, { dia: diaLargo(estado.fecha, lang) }));
      else di(prefijo(rellenar(T.libreConEnlace, { dia: diaCorto(estado.fecha, lang) })), true);
      estado.enlaceEnviado = true;
      pasosFinal.push({ detras: 'Enlace de reserva enviado', resultado: 'la reserva la hace el cliente, en la web', tipo: 'enlace' });
      registrarLead(estado, pasosFinal);
    } else if (formal && !estado.fecha && !estado.preguntoExp) {
      di(T.sinFecha);
    }

    /* --- Descuento: nunca se toca, se pasa a David --- */
    if (a.descuento) {
      di(prefijo(T.descuento));
      paso('Pide descuento', 'no lo toca: eso lo decide David', 'regla');
      pasosFinal.push({ detras: 'Pasado a David', resultado: resumenLead(estado), tipo: 'david' });
      aDavid = true;
    }

    /* --- Una sola pregunta para seguir (solo WhatsApp) --- */
    if (!formal && !hayPregunta && !aDavid && !estado.enlaceEnviado) {
      var pregunta = null;
      if (!estado.fecha) pregunta = T.preguntaFecha;
      else if (!estado.experiencia) pregunta = T.preguntaExp;
      else if (!estado.personas) pregunta = T.preguntaPersonas;
      // nunca se insiste dos veces con la misma pregunta
      estado.preguntas = estado.preguntas || {};
      if (pregunta && estado.preguntas[pregunta]) pregunta = null;
      if (pregunta) {
        estado.preguntas[pregunta] = true;
        if (personasNuevas && estado.personas <= 12) pregunta = rellenar(T.personasOk, { n: estado.personas }) + ' ' + pregunta;
        // la pregunta va en un mensaje aparte: el precio siempre cierra su mensaje
        di(prefijo(pregunta));
      }
    }

    if (!out.length || (formal && out.length === 2)) di(prefijo(T.nada || T.sinFecha));

    if (formal) {
      di(T.cierre);
      pasosFinal.push({ detras: 'Apuntado en Google Calendar', resultado: textoAgenda(estado, T), tipo: 'agenda' });
    }

    return { mensajes: out, pasos: pasos, pasosFinal: pasosFinal, idioma: lang, agenda: formal ? textoAgenda(estado, T) : null };

    // El "hola!" solo en el primer mensaje de todos
    function prefijo(t) {
      if (!formal && primera && !saludado && (a.saludo || primera)) { saludado = true; return T.saludo + ' ' + t; }
      return t;
    }
  }

  function resumenLead(estado) {
    var partes = [estado.nombre || 'Vuestra prueba'];
    if (estado.fecha) partes.push(diaPanel(estado.fecha));
    if (estado.personas) partes.push(estado.personas + ' personas' + (estado.perro ? ' + perro' : ''));
    else if (estado.perro) partes.push('con perro');
    if (estado.experiencia) partes.push(S.experiencias[estado.experiencia].etiqueta);
    if (estado.idioma === 'en') partes.push('inglés');
    return partes.join(' · ');
  }

  function registrarLead(estado, lista) {
    if (estado.leadAnotado) return;
    estado.leadAnotado = true;
    if (!estado.formal) lista.push({ detras: 'Aviso enviado al equipo', resultado: 'David y Patricia ya lo saben', tipo: 'aviso' });
    if (!estado.formal) lista.push({ detras: 'Lead anotado en la agenda', resultado: resumenLead(estado), tipo: 'agenda' });
  }

  function textoAgenda(estado, T) {
    return rellenar(T.agenda, {
      nombre: estado.nombre || 'vuestra prueba',
      dia: estado.fecha ? diaPanel(estado.fecha) : T.sinDia,
      exp: estado.experiencia ? S.experiencias[estado.experiencia].etiqueta : T.sinExp,
      personas: estado.personas ? estado.personas + ' personas' + (estado.perro ? ' + perro' : '') : T.sinPersonas
    });
  }

  /* =========================================================
     WhatsApp de prueba
     ========================================================= */

  var ICO = {
    cargando: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    mensaje: '<path d="M4 5h16v11H9l-5 4z"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ocupado: '<path d="M6 6l12 12M18 6L6 18"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    aviso: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8.5 14.5l2.3 2.3 4.7-4.6"/>',
    regla: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z"/>',
    idioma: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    david: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    doble: '<path d="M1.5 6.2l2.8 2.8L10 3.2M6.2 8.3l.7.7L12.6 3.2"/>'
  };
  function icono(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICO[n] || ICO.check) + '</svg>'; }

  var sim = {
    chat: $('#sim-chat'), lista: $('#sim-lista'), sub: $('#sim-sub'), reloj: $('#sim-reloj'),
    form: $('#sim-form'), input: $('#sim-input'), sug: $('#sim-sugerencias'), ahora: $('#sim-ahora'),
    estado: null, ocupado: false, turno: 0, anterior: null
  };
  if (!sim.chat) return;

  function esperar(ms, turno) {
    return new Promise(function (ok, ko) { setTimeout(function () { if (turno !== sim.turno) ko('cancelado'); else ok(); }, ms); });
  }

  function bajar() { sim.chat.scrollTop = sim.chat.scrollHeight; }

  function tarjetaEnlace() {
    var e = window.DEMO.enlaceReserva || {};
    return '<span class="tarjeta-enlace"><span class="tarjeta-enlace-img" aria-hidden="true"><svg viewBox="0 0 300 86" preserveAspectRatio="xMidYMid slice">' +
      '<circle cx="232" cy="30" r="15" fill="#D99A2B" opacity=".9"/>' +
      '<path d="M0 60c30-6 60-6 90 0s60 6 90 0 60-6 90 0 30 4 30 4v22H0z" fill="#2c5282" opacity=".55"/>' +
      '<path d="M0 68c30-5 60-5 90 0s60 5 90 0 60-5 90 0 30 3 30 3v15H0z" fill="#3b6aa6" opacity=".6"/>' +
      '<path d="M110 56h58l-7 9h-44z" fill="#D99A2B"/><path d="M139 22v33M139 24l17 29h-17z" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M137 28l-13 25h13z" fill="#cfd8e6"/>' +
      '</svg></span><span class="tarjeta-enlace-txt"><b>' + esc(e.titulo || '') + '</b><span>' + esc(e.texto || '') + '</span><small>' + esc(e.dominio || '') + '</small></span></span>';
  }

  function burbuja(texto, suya, enlace) {
    var b = el('div', 'burbuja ' + (suya ? 'suya' : 'nuestra'));
    if (sim.anterior !== (suya ? 'c' : 'a')) b.classList.add('primera');
    sim.anterior = suya ? 'c' : 'a';
    b.innerHTML = (enlace ? tarjetaEnlace() : '') + esc(texto) + (enlace ? ' <span class="enlace-falso">' + (sim.estado.idioma === 'en' ? 'book →' : 'reservar →') + '</span>' : '') +
      '<span class="meta">' + horaAhora() + (suya ? '<svg viewBox="0 0 14 11" aria-hidden="true">' + ICO.doble + '</svg>' : '') + '</span>';
    sim.chat.appendChild(b);
    bajar();
    return b;
  }

  function nuevoPaso(p) {
    var li = el('li', 'paso ' + (p.tipo || 'regla') + ' activo');
    li.innerHTML = '<span class="paso-ico">' + icono('cargando') + '</span><span class="paso-txt"><b>' + esc(p.detras) + '</b><span class="paso-res"></span></span>';
    var vacio = $('.sim-vacio', sim.lista);
    if (vacio) vacio.remove();
    sim.lista.appendChild(li);
    sim.lista.scrollTop = sim.lista.scrollHeight;
    sim.ahora.innerHTML = '<span class="ico">' + icono('cargando') + '</span><span class="txt"><b>Por detrás:</b> ' + esc(p.detras) + '</span>';
    sim.ahora.classList.remove('brilla'); void sim.ahora.offsetWidth; sim.ahora.classList.add('brilla');
    return li;
  }

  function cerrarPaso(li, p) {
    li.classList.remove('activo');
    li.classList.add('hecho');
    if (p.tipo === 'calendario') li.classList.add('ok');
    $('.paso-ico', li).innerHTML = icono(p.tipo === 'calendario' ? 'calendario' : p.tipo);
    var etq = '';
    if (p.tipo === 'calendario') etq = '<span class="etiqueta libre">' + esc(p.resultado) + '</span>';
    else if (p.tipo === 'ocupado') etq = '<span class="etiqueta pillado">' + esc(p.resultado) + '</span>';
    if (etq) $('b', li).insertAdjacentHTML('beforeend', ' ' + etq);
    else $('.paso-res', li).textContent = p.resultado || '';
    sim.ahora.innerHTML = '<span class="ico" style="color:var(--verde)">' + icono('check') + '</span><span class="txt"><b>Por detrás:</b> ' + esc(p.detras.replace(/…$/, '')) + (etq ? ' ' + etq : (p.resultado ? ' · ' + esc(p.resultado) : '')) + '</span>';
  }

  async function mostrarPasos(lista, turno) {
    for (var i = 0; i < lista.length; i++) {
      var li = nuevoPaso(lista[i]);
      await esperar(lista[i].tipo === 'calendario' || lista[i].tipo === 'ocupado' ? 1300 : 800, turno);
      cerrarPaso(li, lista[i]);
      await esperar(250, turno);
    }
  }

  // Si escriben mientras se contesta, el mensaje sale igual y se contesta después
  var cola = [];
  function enviar(texto) {
    texto = String(texto || '').trim();
    if (!texto) return;
    sim.input.value = '';
    var mio = burbuja(texto, true);
    cola.push({ texto: texto, burbuja: mio });
    if (!sim.ocupado) siguiente();
  }

  async function siguiente() {
    var item = cola.shift();
    if (!item) { sim.ocupado = false; sim.chat.removeAttribute('data-ocupado'); return; }
    var turno = sim.turno;
    sim.ocupado = true;
    sim.chat.setAttribute('data-ocupado', '1');
    var texto = item.texto, mio = item.burbuja;
    var r = responder(texto, sim.estado, false);
    try {
      await esperar(700, turno);
      var m = $('.meta', mio); if (m) m.classList.add('leido');
      await mostrarPasos(r.pasos, turno);
      for (var i = 0; i < r.mensajes.length; i++) {
        var puntos = el('div', 'escribiendo', '<i></i><i></i><i></i>');
        sim.chat.appendChild(puntos); bajar();
        sim.sub.textContent = r.idioma === 'en' ? 'typing…' : 'escribiendo…';
        sim.sub.classList.add('escribe');
        try { await esperar(Math.min(2000, Math.max(1000, 600 + r.mensajes[i].texto.length * 8)), turno); }
        finally { puntos.remove(); }
        sim.sub.textContent = r.idioma === 'en' ? 'online' : 'en línea';
        sim.sub.classList.remove('escribe');
        burbuja(r.mensajes[i].texto, false, r.mensajes[i].enlace);
        await esperar(300, turno);
      }
      await mostrarPasos(r.pasosFinal, turno);
    } catch (e) {
      if (e !== 'cancelado') throw e;
    }
    if (turno === sim.turno) siguiente();
  }

  function empezarWhatsapp() {
    sim.turno++;
    sim.ocupado = false;
    cola = [];
    sim.chat.removeAttribute('data-ocupado');
    sim.estado = { formal: false };
    sim.anterior = null;
    sim.chat.innerHTML = '<div class="wa-dia">HOY</div><div class="wa-cifrado">Escribid como si fuerais un cliente. Os contesta Carlo Mar.</div>';
    sim.lista.innerHTML = '<li class="sim-vacio">Cuando escribáis, aquí veréis lo que se hace por detrás.</li>';
    sim.ahora.innerHTML = '<span class="ico" style="color:var(--texto-3)">' + icono('reloj') + '</span><span class="txt">Aquí veréis lo que se hace por detrás</span>';
    sim.sub.textContent = 'en línea';
    sim.sub.classList.remove('escribe');
    sim.reloj.textContent = horaAhora();
  }

  sim.form.addEventListener('submit', function (e) { e.preventDefault(); enviar(sim.input.value); });
  (S.sugerenciasWhatsapp || []).forEach(function (t) {
    var b = el('button', 'sugerencia', esc(t));
    b.type = 'button';
    b.addEventListener('click', function () { enviar(t); });
    sim.sug.appendChild(b);
  });
  $('#sim-reiniciar').addEventListener('click', empezarWhatsapp);
  empezarWhatsapp();
  setInterval(function () { sim.reloj.textContent = horaAhora(); }, 30000);

  /* =========================================================
     Correo de prueba
     ========================================================= */

  var co = {
    form: $('#simc-form'), nombre: $('#simc-nombre'), asunto: $('#simc-asunto'), mensaje: $('#simc-mensaje'),
    resultado: $('#simc-resultado'), boton: $('#simc-enviar'), turno: 0
  };

  function parrafos(texto) {
    return String(texto).split(/\n\s*\n/).map(function (p) {
      return '<p>' + esc(p).replace(/\n/g, '<br>').replace(/\[([^\]]+)\]/g, '<span class="boton-web">$1</span>') + '</p>';
    }).join('');
  }

  var ej = S.correoEjemplo || {};
  co.nombre.value = ej.nombre || '';
  co.asunto.value = ej.asunto || '';
  co.mensaje.value = ej.mensaje || '';

  co.form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var nombre = co.nombre.value.trim() || 'Cliente';
    var asunto = co.asunto.value.trim() || '(sin asunto)';
    var mensaje = co.mensaje.value.trim();
    if (!mensaje) { co.mensaje.focus(); return; }
    var turno = ++co.turno;
    var estado = { formal: true, nombre: nombre };
    var r = responder(asunto + '. ' + mensaje, estado, true);
    var segundos = 30 + Math.floor(Math.random() * 20);
    co.boton.disabled = true;
    co.resultado.innerHTML =
      '<div class="simc-recibido">' +
        '<div class="correo-avatar" style="background:#3b6aa6">' + esc(nombre.charAt(0).toUpperCase()) + '</div>' +
        '<div class="simc-recibido-txt"><b>' + esc(nombre) + '</b><span>' + esc(asunto) + '</span></div>' +
        '<span class="correo-hora">' + horaAhora() + '</span>' +
      '</div>' +
      '<ol class="detras-lista simc-pasos"></ol>';
    co.resultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    var lista = $('.simc-pasos', co.resultado);
    var todos = [{ detras: 'Leyendo el correo…', resultado: 'es una petición de chárter: se contesta', tipo: 'mensaje' }]
      .concat(r.pasos.filter(function (p) { return p.tipo !== 'mensaje'; }))
      .concat([{ detras: 'Redactando la respuesta', resultado: r.idioma === 'en' ? 'en inglés, como le ha escrito' : 'con vuestro tono, el precio al final', tipo: 'regla' }]);
    try {
      for (var i = 0; i < todos.length; i++) {
        var p = todos[i];
        var li = el('li', 'paso ' + p.tipo + ' activo');
        li.innerHTML = '<span class="paso-ico">' + icono('cargando') + '</span><span class="paso-txt"><b>' + esc(p.detras) + '</b><span class="paso-res"></span></span>';
        lista.appendChild(li);
        await new Promise(function (ok) { setTimeout(ok, p.tipo === 'calendario' || p.tipo === 'ocupado' ? 1200 : 800); });
        if (turno !== co.turno) return;
        li.classList.remove('activo'); li.classList.add('hecho');
        if (p.tipo === 'calendario') li.classList.add('ok');
        $('.paso-ico', li).innerHTML = icono(p.tipo === 'calendario' ? 'calendario' : p.tipo);
        if (p.tipo === 'calendario' || p.tipo === 'ocupado') $('b', li).insertAdjacentHTML('beforeend', ' <span class="etiqueta ' + (p.tipo === 'ocupado' ? 'pillado' : 'libre') + '">' + esc(p.resultado) + '</span>');
        else $('.paso-res', li).textContent = p.resultado || '';
      }
      var cuerpo = r.mensajes.map(function (m) { return m.texto; }).join('\n\n');
      var tieneDavid = r.pasosFinal.some(function (p) { return p.tipo === 'david'; });
      co.resultado.insertAdjacentHTML('beforeend',
        '<div class="correo-respuesta"><div class="bloque-titulo">Respuesta enviada a ' + esc(nombre) + ' <em>contestado en ' + segundos + ' segundos</em></div>' + parrafos(cuerpo) + '</div>' +
        '<div class="nota-agenda">' + icono('agenda') + '<span>' + esc(r.agenda) + (tieneDavid ? ' Y aviso a David por el descuento.' : '') + '</span></div>');
    } finally {
      if (turno === co.turno) co.boton.disabled = false;
    }
  });
})();
