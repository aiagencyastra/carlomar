/*
  Carlo Mar Charter · Demostración
  Navegación, utilidades, reproductor de WhatsApp y bandeja de correo.
  Los textos están en js/conversaciones.js; aquí solo está la lógica.
*/
(function () {
  'use strict';

  var DEMO = window.DEMO || {};

  /* ---------------- Utilidades ---------------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function el(tag, clase, html) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapar(t) {
    return String(t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var CANCELADO = { cancelado: true };

  /*
    Temporizador que se puede pausar y cancelar.
    Cada reproductor tiene un "turno": al reiniciar se sube el turno y
    todas las esperas pendientes del turno anterior se cancelan solas.
  */
  function crearReloj() {
    var reloj = { turno: 0, pausado: false };
    reloj.esperar = function (ms, turno) {
      return new Promise(function (ok, ko) {
        var queda = ms;
        var antes = Date.now();
        (function tic() {
          if (reloj.turno !== turno) { ko(CANCELADO); return; }
          var ahora = Date.now();
          if (!reloj.pausado) queda -= (ahora - antes);
          antes = ahora;
          if (queda <= 0) ok();
          else setTimeout(tic, Math.min(60, Math.max(queda, 10)));
        })();
      });
    };
    return reloj;
  }

  var ICONOS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cargando: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/>',
    mensaje: '<path d="M4 5h16v11H9l-5 4z"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    ocupado: '<path d="M6 6l12 12M18 6L6 18"/>',
    enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    aviso: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4"/>',
    agenda: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M8.5 14.5l2.3 2.3 4.7-4.6"/>',
    regla: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z"/>',
    idioma: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    david: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    reiniciar: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>',
    doble: '<path d="M1.5 6.2l2.8 2.8L10 3.2M6.2 8.3l.7.7L12.6 3.2"/>'
  };

  function icono(nombre) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[nombre] || ICONOS.check) + '</svg>';
  }

  /* ---------------- Navegación por pestañas ---------------- */

  var alCambiar = {};   // funciones que se llaman al entrar/salir de cada sección
  var seccionActual = 'whatsapp';

  function irA(nombre, sinHash) {
    if (!$('#sec-' + nombre)) nombre = 'whatsapp';
    var anterior = seccionActual;
    seccionActual = nombre;
    $$('.pestana').forEach(function (b) {
      var si = b.getAttribute('data-seccion') === nombre;
      b.classList.toggle('activa', si);
      b.setAttribute('aria-selected', si ? 'true' : 'false');
    });
    $$('.seccion').forEach(function (s) {
      var si = s.id === 'sec-' + nombre;
      s.hidden = !si;
      s.classList.toggle('activa', si);
    });
    if (!sinHash && history.replaceState) {
      try { history.replaceState(null, '', '#' + nombre); } catch (e) { /* file:// en algunos navegadores */ }
    }
    if (anterior !== nombre && alCambiar[anterior] && alCambiar[anterior].salir) alCambiar[anterior].salir();
    if (alCambiar[nombre] && alCambiar[nombre].entrar) alCambiar[nombre].entrar();

    // Si la barra de pestañas está pegada arriba, subimos al principio de la sección
    var nav = $('.pestanas');
    var top = nav.getBoundingClientRect().top + window.pageYOffset;
    if (window.pageYOffset > top) window.scrollTo(0, top);
  }

  $$('.pestana').forEach(function (b) {
    b.addEventListener('click', function () { irA(b.getAttribute('data-seccion')); });
  });

  /* "Probadlo": cambiar entre WhatsApp y correo */
  function modoProbar(modo) {
    $$('.probar-modo .modo').forEach(function (b) {
      var si = b.getAttribute('data-modo') === modo;
      b.classList.toggle('activo', si);
      b.setAttribute('aria-selected', si ? 'true' : 'false');
    });
    var wa = $('#probar-wa'), co = $('#probar-correo');
    if (wa) wa.hidden = modo !== 'wa';
    if (co) co.hidden = modo !== 'correo';
  }
  $$('.probar-modo .modo').forEach(function (b) {
    b.addEventListener('click', function () { modoProbar(b.getAttribute('data-modo')); });
  });
  $$('[data-ir]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-modo-ir')) modoProbar(b.getAttribute('data-modo-ir'));
      irA(b.getAttribute('data-ir'));
      window.scrollTo(0, $('.pestanas').getBoundingClientRect().top + window.pageYOffset);
    });
  });

  /* =========================================================
     1. WHATSAPP
     ========================================================= */

  var wa = {
    reloj: crearReloj(),
    conv: null,
    terminado: false,
    chat: $('#wa-chat'),
    lista: $('#detras-lista'),
    ahora: $('#detras-ahora'),
    sub: $('#wa-sub'),
    horaMovil: $('#wa-reloj'),
    play: $('#wa-play'),
    pasos: []
  };

  function tarjetaEnlace() {
    var e = DEMO.enlaceReserva || {};
    return '<span class="tarjeta-enlace">' +
      '<span class="tarjeta-enlace-img" aria-hidden="true"><svg viewBox="0 0 300 86" preserveAspectRatio="xMidYMid slice">' +
        '<circle cx="232" cy="30" r="15" fill="#D99A2B" opacity=".9"/>' +
        '<path d="M0 60c30-6 60-6 90 0s60 6 90 0 60-6 90 0 30 4 30 4v22H0z" fill="#2c5282" opacity=".55"/>' +
        '<path d="M0 68c30-5 60-5 90 0s60 5 90 0 60-5 90 0 30 3 30 3v15H0z" fill="#3b6aa6" opacity=".6"/>' +
        '<path d="M110 56h58l-7 9h-44z" fill="#D99A2B"/><path d="M139 22v33M139 24l17 29h-17z" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M137 28l-13 25h13z" fill="#cfd8e6"/>' +
      '</svg></span>' +
      '<span class="tarjeta-enlace-txt"><b>' + escapar(e.titulo || '') + '</b><span>' + escapar(e.texto || '') + '</span><small>' + escapar(e.dominio || '') + '</small></span>' +
    '</span>';
  }

  function horaMeta(hora, suya) {
    return '<span class="meta' + (suya ? '' : ' sin') + '">' + escapar(hora) +
      (suya ? '<svg viewBox="0 0 14 11" aria-hidden="true">' + ICONOS.doble + '</svg>' : '') + '</span>';
  }

  function ponerBurbuja(ev, anterior) {
    var suya = ev.de === 'cliente';
    var b = el('div', 'burbuja ' + (suya ? 'suya' : 'nuestra'));
    if (!anterior || anterior !== ev.de) b.classList.add('primera');
    var html = '';
    if (ev.enlace) html += tarjetaEnlace();
    html += escapar(ev.texto);
    if (ev.enlace) html += ' <span class="enlace-falso">reservar →</span>';
    html += horaMeta(ev.hora, suya);
    b.innerHTML = html;
    wa.chat.appendChild(b);
    bajarChat();
    return b;
  }

  function bajarChat() {
    wa.chat.scrollTop = wa.chat.scrollHeight;
  }

  function prepararPasos(conv) {
    wa.lista.innerHTML = '';
    wa.pasos = [];
    conv.eventos.forEach(function (ev) {
      if (!ev.detras) return;
      var tipo = ev.tipo || 'regla';
      var li = el('li', 'paso ' + tipo);
      li.innerHTML =
        '<span class="paso-ico">' + icono('reloj') + '</span>' +
        '<span class="paso-txt"><b>' + escapar(ev.detras) + '</b><span class="paso-res"></span></span>';
      wa.lista.appendChild(li);
      wa.pasos.push({ ev: ev, li: li });
    });
  }

  function textoResultado(paso) {
    var ev = paso.ev;
    if (ev.tipo === 'calendario') return '<span class="etiqueta libre">' + escapar(ev.resultado) + '</span>';
    if (ev.tipo === 'ocupado') return '<span class="etiqueta pillado">' + escapar(ev.resultado) + '</span>';
    return '';
  }

  function activarPaso(paso) {
    var li = paso.li;
    li.classList.add('activo');
    $('.paso-ico', li).innerHTML = icono('cargando');
    wa.ahora.innerHTML = '<span class="ico">' + icono('cargando') + '</span><span class="txt"><b>Por detrás:</b> ' + escapar(paso.ev.detras) + '</span>';
    wa.ahora.classList.remove('brilla'); void wa.ahora.offsetWidth; wa.ahora.classList.add('brilla');
  }

  function terminarPaso(paso) {
    var li = paso.li, ev = paso.ev;
    li.classList.remove('activo');
    li.classList.add('hecho');
    var icoFinal = { calendario: 'calendario', ocupado: 'ocupado', enlace: 'enlace', aviso: 'aviso', agenda: 'agenda', regla: 'regla', mensaje: 'mensaje', idioma: 'idioma', david: 'david' }[ev.tipo] || 'check';
    if (ev.tipo === 'calendario') li.classList.add('ok');
    $('.paso-ico', li).innerHTML = icono(icoFinal);
    var etiqueta = textoResultado(paso);
    if (etiqueta) {
      $('b', li).insertAdjacentHTML('beforeend', ' ' + etiqueta);
    } else {
      $('.paso-res', li).textContent = ev.resultado || '';
    }
    var detalle = etiqueta ? escapar(ev.detras.replace(/…$/, '')) + ' ' + etiqueta : escapar(ev.detras) + (ev.resultado ? ' · ' + escapar(ev.resultado) : '');
    wa.ahora.innerHTML = '<span class="ico" style="color:var(--verde)">' + icono('check') + '</span><span class="txt"><b>Por detrás:</b> ' + detalle + '</span>';
  }

  function ponerEstadoPlay(pausado) {
    wa.play.classList.toggle('pausado', pausado);
    $('span', wa.play).textContent = pausado ? (wa.terminado ? 'Ver otra vez' : 'Seguir') : 'Pausar';
  }

  function limpiarChat() {
    wa.chat.innerHTML = '';
    wa.chat.appendChild(el('div', 'wa-dia', 'HOY'));
    wa.chat.appendChild(el('div', 'wa-cifrado', 'Los mensajes están cifrados de extremo a extremo.'));
  }

  function reproducir(conv) {
    var reloj = wa.reloj;
    esperandoVista = false;
    var turno = ++reloj.turno;
    reloj.pausado = false;
    wa.conv = conv;
    wa.terminado = false;
    ponerEstadoPlay(false);
    limpiarChat();
    prepararPasos(conv);
    wa.sub.textContent = 'en línea';
    wa.sub.classList.remove('escribe');
    wa.ahora.innerHTML = '<span class="ico" style="color:var(--texto-3)">' + icono('reloj') + '</span><span class="txt">Aquí veréis lo que se hace por detrás</span>';
    var primeraHora = (conv.eventos.filter(function (e) { return e.hora; })[0] || {}).hora || '';
    wa.horaMovil.textContent = primeraHora;

    var espera = function (ms) { return reloj.esperar(ms, turno); };
    var anterior = null;
    var indicePaso = 0;
    var ultimaBurbujaCliente = null;

    (async function () {
      try {
        await espera(700);
        for (var i = 0; i < conv.eventos.length; i++) {
          var ev = conv.eventos[i];

          if (ev.detras) {
            var paso = wa.pasos[indicePaso++];
            activarPaso(paso);
            await espera(ev.tipo === 'calendario' || ev.tipo === 'ocupado' ? 1500 : 1100);
            terminarPaso(paso);
            await espera(350);
            continue;
          }

          if (ev.de === 'cliente') {
            await espera(anterior ? 1300 : 200);
            wa.horaMovil.textContent = ev.hora;
            ultimaBurbujaCliente = ponerBurbuja(ev, anterior);
            anterior = 'cliente';
            // el doble check se pone azul cuando "lo leen"
            (function (b) {
              espera(900).then(function () { var m = $('.meta', b); if (m) m.classList.add('leido'); }, function () {});
            })(ultimaBurbujaCliente);
            continue;
          }

          // Respuesta del agente: "escribiendo…" entre 1 y 2 segundos según lo largo
          await espera(anterior === 'agente' ? 350 : 500);
          if (ultimaBurbujaCliente) { var m = $('.meta', ultimaBurbujaCliente); if (m) m.classList.add('leido'); }
          var puntos = el('div', 'escribiendo', '<i></i><i></i><i></i>');
          wa.chat.appendChild(puntos);
          bajarChat();
          wa.sub.textContent = 'escribiendo…';
          wa.sub.classList.add('escribe');
          var ms = Math.min(2000, Math.max(1000, 700 + ev.texto.length * 9));
          try { await espera(ms); } finally { if (puntos.parentNode) puntos.parentNode.removeChild(puntos); }
          wa.sub.textContent = 'en línea';
          wa.sub.classList.remove('escribe');
          wa.horaMovil.textContent = ev.hora;
          ponerBurbuja(ev, anterior);
          anterior = 'agente';
        }

        await espera(900);
        wa.terminado = true;
        ponerEstadoPlay(true);
        var fin = el('button', 'wa-fin', icono('reiniciar') + 'Ver otra vez');
        fin.type = 'button';
        fin.addEventListener('click', function () { reproducir(wa.conv); });
        wa.chat.appendChild(fin);
        bajarChat();
      } catch (e) {
        if (e !== CANCELADO) throw e;
      }
    })();
  }

  function pintarSelector() {
    var cont = $('#wa-selector');
    (DEMO.conversaciones || []).forEach(function (c, i) {
      var b = el('button', 'opcion', '<strong>' + escapar(c.titulo) + '</strong><span>' + escapar(c.resumen) + '</span>');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        $$('.opcion', cont).forEach(function (o) { o.setAttribute('aria-checked', 'false'); });
        b.setAttribute('aria-checked', 'true');
        reproducir(c);
      });
      cont.appendChild(b);
    });
  }

  var esperandoVista = false;
  wa.play.addEventListener('click', function () {
    if (wa.terminado) { reproducir(wa.conv); return; }
    esperandoVista = false;
    wa.reloj.pausado = !wa.reloj.pausado;
    ponerEstadoPlay(wa.reloj.pausado);
  });
  $('#wa-reiniciar').addEventListener('click', function () { reproducir(wa.conv); });

  var pausadoPorSalir = false;
  alCambiar.whatsapp = {
    salir: function () {
      if (!wa.reloj.pausado && !wa.terminado) { wa.reloj.pausado = true; pausadoPorSalir = true; ponerEstadoPlay(true); }
    },
    entrar: function () {
      if (pausadoPorSalir) { wa.reloj.pausado = false; pausadoPorSalir = false; ponerEstadoPlay(false); }
    }
  };

  /* Seguimiento automático */
  function pintarSeguimiento() {
    var lista = $('#seg-lista');
    (DEMO.seguimiento || []).forEach(function (s) {
      var item = el('div', 'seg-item');
      item.innerHTML =
        '<div class="seg-cuando"><b>' + escapar(s.cuando) + '</b>' + escapar(s.detalle) + '</div>' +
        '<div class="burbuja nuestra primera">' + escapar(s.texto) + '<span class="meta">' + escapar(s.hora) + '</span></div>';
      lista.appendChild(item);
    });
    var boton = $('#seg-boton'), cuerpo = $('#seg-cuerpo');
    boton.addEventListener('click', function () {
      var abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
      cuerpo.hidden = abierto;
    });
  }

  /* =========================================================
     2. CORREO
     ========================================================= */

  var correo = {
    reloj: crearReloj(),
    lista: $('#correo-lista'),
    boton: $('#correo-procesar'),
    estado: 'inicial',   // inicial | procesando | hecho
    filas: []
  };

  var COLORES_AVATAR = ['#13233F', '#3b6aa6', '#7a5c2e', '#2f7a6b', '#8a4f7d', '#56627a', '#b0782a'];

  function parrafos(texto) {
    return String(texto).split(/\n\s*\n/).map(function (p) {
      var h = escapar(p).replace(/\n/g, '<br>');
      h = h.replace(/\[([^\]]+)\]/g, '<span class="boton-web">$1</span>');
      return '<p>' + h + '</p>';
    }).join('');
  }

  function pintarBandeja() {
    correo.lista.innerHTML = '';
    correo.filas = [];
    (DEMO.correos || []).forEach(function (c, i) {
      var li = el('li', 'correo');
      var inicial = (c.remitente || '?').replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').charAt(0).toUpperCase();
      li.innerHTML =
        '<button class="correo-fila" type="button" aria-expanded="false">' +
          '<span class="correo-avatar" style="background:' + COLORES_AVATAR[i % COLORES_AVATAR.length] + '">' + escapar(inicial) + '</span>' +
          '<span class="correo-cuerpo-fila">' +
            '<span class="correo-linea1"><span class="correo-de">' + escapar(c.remitente) + '</span><span class="correo-hora">' + escapar(c.hora) + '</span></span>' +
            '<span class="correo-asunto" style="display:block">' + escapar(c.asunto) + '</span>' +
            '<span class="correo-extracto" style="display:block">' + escapar(c.extracto) + '</span>' +
            '<span class="correo-marca"></span>' +
          '</span>' +
        '</button>';
      var fila = { c: c, li: li, abierto: null };
      $('.correo-fila', li).addEventListener('click', function () { alternarCorreo(fila); });
      correo.lista.appendChild(li);
      correo.filas.push(fila);
    });
    $('#bandeja-cuenta').textContent = correo.filas.length + ' sin leer';
    ponerContador(null);
  }

  function ponerContador(datos) {
    var cont = $('#correo-contador');
    var total = (DEMO.correos || []).length;
    var valores = datos || { total: total, clientes: '–', contestados: '–', ignorados: '–' };
    Object.keys(valores).forEach(function (k) {
      var n = $('[data-c="' + k + '"]', cont);
      if (!n) return;
      if (n.textContent !== String(valores[k])) {
        n.textContent = valores[k];
        if (datos) { n.classList.remove('salta'); void n.offsetWidth; n.classList.add('salta'); }
      }
    });
  }

  function etiquetaDe(c) {
    if (c.tipo === 'cliente') return { clase: 'verde', icono: 'check', texto: c.etiqueta || 'Petición de chárter — respondida' };
    return { clase: 'gris', icono: 'ocupado', texto: c.etiqueta || 'Ignorado' };
  }

  function contenidoAbierto(c) {
    var html = '<div class="correo-original"><div class="bloque-titulo">' + escapar(c.remitente) + ' escribió</div>' + parrafos(c.cuerpo) + '</div>';
    if (c.respuesta && correo.estado === 'hecho') {
      html += '<div class="correo-respuesta"><div class="bloque-titulo">Respuesta enviada <em>' + escapar(c.respuesta.tiempo || '') + '</em></div>' + parrafos(c.respuesta.texto) + '</div>';
      if (c.respuesta.agenda) {
        html += '<div class="nota-agenda">' + icono('agenda') + '<span>' + escapar(c.respuesta.agenda) + '</span></div>';
      }
    } else if (c.motivo && correo.estado === 'hecho') {
      html += '<div class="correo-motivo">' + escapar(c.motivo) + '</div>';
    }
    return html;
  }

  function alternarCorreo(fila, forzarAbrir) {
    var boton = $('.correo-fila', fila.li);
    if (fila.abierto && !forzarAbrir) {
      fila.li.removeChild(fila.abierto);
      fila.abierto = null;
      boton.setAttribute('aria-expanded', 'false');
      return;
    }
    if (fila.abierto) fila.li.removeChild(fila.abierto);
    fila.abierto = el('div', 'correo-abierto', contenidoAbierto(fila.c));
    fila.li.appendChild(fila.abierto);
    boton.setAttribute('aria-expanded', 'true');
    fila.li.classList.add('leido');
  }

  function procesarBandeja() {
    var reloj = correo.reloj;
    var turno = ++reloj.turno;
    var espera = function (ms) { return reloj.esperar(ms, turno); };
    correo.estado = 'procesando';
    pintarBandeja();
    correo.boton.disabled = true;
    $('span', correo.boton).textContent = 'Procesando…';

    var clientes = 0, ignorados = 0, sinLeer = correo.filas.length;
    var total = correo.filas.length;

    (async function () {
      try {
        await espera(400);
        for (var i = 0; i < correo.filas.length; i++) {
          var f = correo.filas[i];
          var marca = $('.correo-marca', f.li);
          f.li.classList.add('analizando');
          var esCliente = f.c.tipo === 'cliente';
          marca.innerHTML = '<span class="correo-etiqueta analiza">' + icono('cargando') + (esCliente ? 'Leyendo y contestando…' : 'Leyendo…') + '</span>';
          await espera(esCliente ? 1300 : 650);
          var e = etiquetaDe(f.c);
          marca.innerHTML = '<span class="correo-etiqueta ' + e.clase + '">' + icono(e.icono) + escapar(e.texto) + '</span>';
          f.li.classList.remove('analizando');
          f.li.classList.add('leido');
          if (!esCliente) f.li.classList.add('ignorado');
          if (esCliente) clientes++; else ignorados++;
          sinLeer--;
          $('#bandeja-cuenta').textContent = sinLeer ? sinLeer + ' sin leer' : 'todo al día';
          ponerContador({ total: total, clientes: clientes, contestados: clientes, ignorados: ignorados });
          await espera(250);
        }
        correo.estado = 'hecho';
        await espera(500);
        // Se abren solos los que se han contestado
        correo.filas.forEach(function (f) { if (f.c.tipo === 'cliente') alternarCorreo(f, true); });
        correo.boton.disabled = false;
        $('span', correo.boton).textContent = 'Volver a empezar';
      } catch (e) {
        if (e !== CANCELADO) throw e;
      }
    })();
  }

  correo.boton.addEventListener('click', function () {
    if (correo.estado === 'hecho') {
      correo.reloj.turno++;
      correo.estado = 'inicial';
      pintarBandeja();
      $('span', correo.boton).textContent = 'Procesar bandeja';
      return;
    }
    if (correo.estado === 'inicial') procesarBandeja();
  });

  /* =========================================================
     3. PANEL (lo pinta js/panel.js)
     ========================================================= */
  alCambiar.panel = {
    entrar: function () { if (window.PanelDemo) window.PanelDemo.mostrar(); }
  };

  /* ---------------- Arranque ---------------- */

  pintarSelector();
  pintarSeguimiento();
  if (DEMO.correos) pintarBandeja();

  var inicio = (location.hash || '').replace('#', '');
  if (inicio && inicio !== 'whatsapp') {
    // Dejamos la conversación preparada pero en pausa hasta que entren en WhatsApp
    irA(inicio, true);
  }
  if (DEMO.conversaciones && DEMO.conversaciones.length) {
    reproducir(DEMO.conversaciones[0]);
    esperandoVista = true;
    // No arranca hasta que el móvil se ve en pantalla (en el teléfono queda un poco más abajo)
    wa.reloj.pausado = true;
    ponerEstadoPlay(true);
    $('span', wa.play).textContent = 'Empezar';
    var arrancar = function () {
      if (!esperandoVista) return;
      esperandoVista = false;
      if (seccionActual === 'whatsapp') { wa.reloj.pausado = false; ponerEstadoPlay(false); }
      else pausadoPorSalir = true;
    };
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { if (e.isIntersecting) { arrancar(); obs.disconnect(); } });
      }, { threshold: 0.35 });
      obs.observe($('.movil'));
    } else {
      arrancar();
    }
  }
})();
