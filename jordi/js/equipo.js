/*
  App del equipo (Chatwoot en el móvil): bandeja, conversación pasada por el bot,
  respuesta de Jordi y llamada de WhatsApp. Los textos están en js/datos.js.
*/
(function () {
  'use strict';

  var E = (window.DEMO || {}).equipo;
  if (!E) return;
  var marca = (window.DEMO || {}).marca || {};
  var quien = marca.responsable || 'Jordi';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function iniciales(n) { return n.split(' ').map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase(); }

  var COLORES = ['#3b6aa6', '#7a5c2e', '#2f7a6b', '#8a4f7d', '#56627a', '#b0782a'];

  var ui = {
    lista: $('#eq-lista'),
    filas: $('#eq-filas'),
    chat: $('#eq-chat'),
    msgs: $('#eq-msgs'),
    acciones: $('#eq-acciones'),
    aviso: $('#eq-aviso'),
    llamada: $('#eq-llamada')
  };

  var turno = 0;          // al reiniciar se cancelan las esperas pendientes
  var pintado = false;
  var tab = 'mios';
  var fase = 'lista';     // lista | chat | contestado | llamado
  var cronometro = null;

  function esperar(ms) {
    var t = turno;
    return new Promise(function (ok, ko) { setTimeout(function () { if (t === turno) ok(); else ko('cancelado'); }, ms); });
  }

  /* ---------- Bandeja ---------- */
  function pintarBandeja() {
    var items = E.bandeja.filter(function (c) {
      if (tab === 'todos') return true;
      return c.tab === tab;
    });
    ui.filas.innerHTML = items.map(function (c, i) {
      var etq = (c.etiquetas || []).map(function (e) { return '<span class="eq-etq ' + e[0] + '">' + esc(e[1]) + '</span>'; }).join('');
      return '<li><button type="button" class="eq-fila' + (c.id === 'laia' ? ' destaca' : '') + '" data-id="' + c.id + '">' +
        '<span class="eq-av" style="background:' + COLORES[E.bandeja.indexOf(c) % COLORES.length] + '">' + esc(iniciales(c.nombre)) + '<i class="eq-wa"></i></span>' +
        '<span class="eq-fila-txt">' +
          '<span class="eq-l1"><b>' + esc(c.nombre) + '</b><small>' + esc(c.hora) + '</small></span>' +
          '<span class="eq-l2"><span>' + esc(c.texto) + '</span>' + (c.noLeidos ? '<em>' + c.noLeidos + '</em>' : '') + '</span>' +
          '<span class="eq-l3">' + etq + '</span>' +
        '</span></button></li>';
    }).join('');
    var cuenta = { mios: 0, sin: 0, todos: E.bandeja.length };
    E.bandeja.forEach(function (c) { if (cuenta[c.tab] != null && c.tab !== 'todos') cuenta[c.tab]++; });
    Array.prototype.forEach.call(document.querySelectorAll('.eq-tab'), function (b) {
      var t = b.getAttribute('data-tab');
      b.classList.toggle('activa', t === tab);
      b.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      $('em', b).textContent = cuenta[t];
    });
  }

  ui.filas.addEventListener('click', function (e) {
    var b = e.target.closest('.eq-fila');
    if (!b) return;
    if (b.getAttribute('data-id') === 'laia') abrirChat();
    else {
      b.classList.remove('meneo'); void b.offsetWidth; b.classList.add('meneo');
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.eq-tab'), function (b) {
    b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); pintarBandeja(); });
  });

  /* ---------- Conversación ---------- */
  function burbuja(m) {
    if (m.de === 'nota') {
      return '<div class="eq-nota"><b>' + esc(m.titulo) + '</b>' + esc(m.texto).replace(/\n/g, '<br>') + '<small>' + esc(m.hora) + '</small></div>';
    }
    if (m.de === 'sistema') return '<div class="eq-sistema">' + m.texto + '</div>';
    var cliente = m.de === 'cliente';
    var autor = m.de === 'bot' ? '<span class="eq-autor bot">Bot</span>' : (m.de === 'jordi' ? '<span class="eq-autor persona">' + esc(quien) + '</span>' : '');
    return '<div class="eq-msg ' + (cliente ? 'entra' : 'sale ' + m.de) + '">' + autor + esc(m.texto) + '<small>' + esc(m.hora) + '</small></div>';
  }

  function bajar() { ui.msgs.scrollTop = ui.msgs.scrollHeight; }

  function ponerAcciones() {
    var html = '';
    if (fase === 'chat') {
      html = '<button type="button" class="boton boton-principal" data-acc="contestar">Contestar como ' + esc(quien) + '</button>' +
             '<button type="button" class="boton" data-acc="bot">Devolver al bot</button>';
    } else if (fase === 'contestado') {
      html = '<button type="button" class="boton boton-verde" data-acc="llamar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg>Llamar por WhatsApp</button>';
    } else if (fase === 'devuelto' || fase === 'llamado') {
      html = '<button type="button" class="boton" data-acc="reiniciar">Ver otra vez</button>';
    }
    ui.acciones.innerHTML = html;
  }

  ui.acciones.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acc]');
    if (!b) return;
    var acc = b.getAttribute('data-acc');
    if (acc === 'contestar') contestar();
    if (acc === 'bot') devolver();
    if (acc === 'llamar') llamar();
    if (acc === 'reiniciar') reiniciar();
  });

  function abrirChat() {
    fase = 'chat';
    ui.aviso.classList.remove('visible');
    ui.lista.hidden = true;
    ui.chat.hidden = false;
    ui.msgs.innerHTML = '<div class="eq-sistema">Conversación asignada a <b>' + esc(quien) + '</b> por el bot · 19:09</div>' +
      E.laia.historial.map(burbuja).join('');
    ponerAcciones();
    bajar();
    var nota = $('.eq-nota', ui.msgs);
    // Que se vea la nota del bot (sin mover la página entera)
    if (nota) ui.msgs.scrollTop = Math.max(0, nota.offsetTop - 70);
  }

  function volverLista() {
    ui.chat.hidden = true;
    ui.lista.hidden = false;
    if (fase === 'chat') fase = 'lista';
  }
  $('#eq-atras').addEventListener('click', volverLista);
  ui.aviso.addEventListener('click', abrirChat);

  async function contestar() {
    fase = 'escribiendo';
    ui.acciones.innerHTML = '';
    try {
      for (var i = 0; i < E.laia.respuesta.length; i++) {
        var m = E.laia.respuesta[i];
        await esperar(m.de === 'cliente' ? 1300 : 500);
        if (m.de === 'jordi') {
          var punt = document.createElement('div');
          punt.className = 'eq-escribe';
          punt.textContent = quien + ' está escribiendo…';
          ui.msgs.appendChild(punt); bajar();
          await esperar(Math.min(1800, 600 + m.texto.length * 8));
          punt.remove();
        }
        ui.msgs.insertAdjacentHTML('beforeend', burbuja(m));
        bajar();
      }
      await esperar(400);
      fase = 'contestado';
      ponerAcciones();
    } catch (e) { /* cancelado */ }
  }

  function devolver() {
    fase = 'devuelto';
    ui.msgs.insertAdjacentHTML('beforeend', burbuja({ de: 'sistema', texto: '<b>' + esc(quien) + '</b> ha devuelto la conversación al bot' }));
    bajar();
    ponerAcciones();
  }

  /* ---------- Llamada de WhatsApp ---------- */
  async function llamar() {
    ui.acciones.innerHTML = '';
    ui.llamada.hidden = false;
    var estado = $('.eq-ll-estado', ui.llamada);
    estado.textContent = 'Llamando por WhatsApp…';
    ui.llamada.classList.remove('conectada');
    try {
      await esperar(2200);
      ui.llamada.classList.add('conectada');
      var seg = 0;
      estado.textContent = '00:00';
      cronometro = setInterval(function () {
        seg++;
        estado.textContent = '00:' + (seg < 10 ? '0' : '') + seg;
      }, 1000);
    } catch (e) { /* cancelado */ }
  }

  $('#eq-colgar').addEventListener('click', function () {
    if (cronometro) { clearInterval(cronometro); cronometro = null; }
    ui.llamada.hidden = true;
    if (fase !== 'contestado') return;
    fase = 'llamado';
    ui.msgs.insertAdjacentHTML('beforeend', burbuja({ de: 'sistema', texto: 'Llamada de WhatsApp con Laia · queda guardada en la conversación' }));
    bajar();
    ponerAcciones();
  });

  /* ---------- Arranque y reinicio ---------- */
  async function avisar() {
    try {
      await esperar(900);
      ui.aviso.classList.add('visible');
      var fila = $('.eq-fila.destaca', ui.filas);
      if (fila) fila.classList.add('nueva');
    } catch (e) { /* cancelado */ }
  }

  function reiniciar() {
    turno++;
    if (cronometro) { clearInterval(cronometro); cronometro = null; }
    ui.llamada.hidden = true;
    ui.aviso.classList.remove('visible');
    fase = 'lista';
    tab = 'mios';
    ui.chat.hidden = true;
    ui.lista.hidden = false;
    pintarBandeja();
    avisar();
  }
  $('#eq-reiniciar').addEventListener('click', reiniciar);

  window.EquipoDemo = {
    mostrar: function () {
      if (!pintado) { pintado = true; reiniciar(); }
    },
    pausar: function () {
      if (cronometro) { clearInterval(cronometro); cronometro = null; ui.llamada.hidden = true; if (fase === 'contestado') ponerAcciones(); }
    }
  };
})();
