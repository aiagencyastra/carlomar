/*
  Panel de control: números, gráfica de barras, anillo por canal y tabla.
  Todo dibujado a mano en SVG. Los datos están en js/datos-panel.js.
*/
(function () {
  'use strict';

  var D = (window.DEMO || {}).panel;
  if (!D) return;

  var SVG = 'http://www.w3.org/2000/svg';
  var pintado = false;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function nodo(tag, attrs, padre) {
    var n = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (padre) padre.appendChild(n);
    return n;
  }

  /* ---------- Números grandes ---------- */
  function pintarKpis() {
    var cont = document.getElementById('panel-kpis');
    cont.innerHTML = D.kpis.map(function (k) {
      return '<div class="tarjeta kpi' + (k.destacado ? ' destacado' : '') + '">' +
        '<div class="kpi-etq">' + esc(k.etiqueta) + '</div>' +
        '<div class="kpi-num" data-valor="' + k.valor + '">0' + (k.unidad ? '<small>' + esc(k.unidad) + '</small>' : '') + '</div>' +
        '<div class="kpi-nota' + (k.destacado ? ' bien' : '') + '">' + esc(k.nota || '') + '</div>' +
      '</div>';
    }).join('');
  }

  function contar() {
    Array.prototype.forEach.call(document.querySelectorAll('.kpi-num'), function (n) {
      var fin = Number(n.getAttribute('data-valor'));
      var sufijo = n.querySelector('small');
      var sufijoHtml = sufijo ? sufijo.outerHTML : '';
      var t0 = null, dur = 900;
      function paso(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        var v = Math.round(fin * (1 - Math.pow(1 - p, 3)));
        n.innerHTML = v + sufijoHtml;
        if (p < 1) requestAnimationFrame(paso);
      }
      requestAnimationFrame(paso);
    });
  }

  /* ---------- Barras mes a mes ---------- */
  function pintarBarras() {
    var cont = document.getElementById('panel-barras');
    cont.innerHTML = '';
    // Se dibuja al ancho real para que los textos salgan siempre a su tamaño
    var W = Math.max(300, Math.round(cont.clientWidth - 20) || 640);
    var H = W < 520 ? 250 : 380, izq = 34, der = 6, arr = 18, abajo = 30;
    var ancho = W - izq - der, alto = H - arr - abajo;
    var max = Math.max.apply(null, D.meses.map(function (m) { return m.interesados; }));
    var tope = Math.ceil(max / 50) * 50;
    var svg = nodo('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Interesados y reservas por mes' }, cont);

    // rejilla
    for (var v = 0; v <= tope; v += 50) {
      var y = arr + alto - (v / tope) * alto;
      nodo('line', { x1: izq, x2: W - der, y1: y, y2: y, 'class': 'rejilla' }, svg);
      var t = nodo('text', { x: izq - 8, y: y + 4, 'text-anchor': 'end', 'class': 'eje' }, svg);
      t.textContent = v;
    }

    var grupo = ancho / D.meses.length;
    var bw = Math.min(26, grupo * 0.32);
    D.meses.forEach(function (m, i) {
      var x0 = izq + i * grupo;
      var cx = x0 + grupo / 2;
      if (m.actual) nodo('rect', { x: x0 + 3, y: arr - 8, width: grupo - 6, height: alto + 8, rx: 8, 'class': 'fondo-mes' }, svg);

      [['interesados', '#13233F', -1], ['reservas', '#D99A2B', 1]].forEach(function (s, j) {
        var val = m[s[0]];
        var h = (val / tope) * alto;
        var x = cx + (s[2] < 0 ? -bw - 2 : 2);
        var r = nodo('rect', { x: x, y: arr + alto - h, width: bw, height: h, rx: 4, fill: s[1], 'class': 'barra' }, svg);
        r.style.transitionDelay = (i * 70 + j * 40) + 'ms';
        var tt = nodo('title', {}, r); tt.textContent = m.mes + ': ' + val + ' ' + s[0];
        var lbl = nodo('text', { x: x + bw / 2, y: arr + alto - h - 5, 'text-anchor': 'middle', 'class': 'valor', fill: s[1] === '#D99A2B' ? '#b07a18' : '#13233F' }, svg);
        lbl.textContent = val;
      });

      var tm = nodo('text', { x: cx, y: H - 8, 'text-anchor': 'middle', 'class': 'mes' }, svg);
      tm.textContent = m.mes;
      if (m.actual) tm.setAttribute('font-weight', '700');
    });
  }

  /* ---------- Anillo por canal ---------- */
  function pintarAnillo() {
    var cont = document.getElementById('panel-anillo');
    cont.innerHTML = '';
    var R = 52, C = 2 * Math.PI * R, grosor = 16;
    var svg = nodo('svg', { viewBox: '0 0 132 132', role: 'img', 'aria-label': 'Reparto por canal' }, cont);
    nodo('circle', { cx: 66, cy: 66, r: R, fill: 'none', stroke: '#eef1f5', 'stroke-width': grosor }, svg);
    var acumulado = 0;
    var hueco = 2;
    D.canales.forEach(function (c) {
      var largo = C * c.porcentaje / 100;
      var seg = nodo('circle', {
        cx: 66, cy: 66, r: R, fill: 'none', stroke: c.color, 'stroke-width': grosor,
        'stroke-dasharray': '0 ' + C, 'stroke-dashoffset': -acumulado,
        transform: 'rotate(-90 66 66)', 'class': 'seg'
      }, svg);
      seg.setAttribute('data-largo', Math.max(0, largo - hueco));
      acumulado += largo;
    });
    var total = D.meses.filter(function (m) { return m.actual; })[0];
    var n = nodo('text', { x: 66, y: 66, 'text-anchor': 'middle', 'class': 'anillo-centro-num' }, svg);
    n.textContent = total ? total.interesados : '';
    var t = nodo('text', { x: 66, y: 82, 'text-anchor': 'middle', 'class': 'anillo-centro-txt' }, svg);
    t.textContent = 'en ' + D.mesActual;

    var ul = document.createElement('ul');
    ul.className = 'anillo-lista';
    ul.innerHTML = D.canales.map(function (c) {
      return '<li><i style="background:' + c.color + '"></i><span>' + esc(c.nombre) + '</span><b>' + c.porcentaje + ' %</b></li>';
    }).join('');
    cont.appendChild(ul);
  }

  /* ---------- Fuera de horario ---------- */
  function pintarNoche() {
    var f = D.fueraDeHorario;
    document.getElementById('panel-noche').innerHTML =
      '<svg class="luna" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>' +
      '<p class="noche-etq">' + esc(f.etiqueta) + '</p>' +
      '<div class="noche-num">' + f.porcentaje + ' %</div>' +
      '<p class="noche-frase">' + esc(f.frase) + '</p>' +
      '<div class="noche-barra"><i data-ancho="' + f.porcentaje + '"></i></div>';
  }

  /* ---------- Tabla de leads ---------- */
  var COLOR_CANAL = {};
  D.canales.forEach(function (c) { COLOR_CANAL[c.nombre] = c.color; });

  function pintarTabla() {
    var filas = D.leads.map(function (l) {
      return '<tr>' +
        '<td class="nombre">' + esc(l.nombre) + '</td>' +
        '<td class="c-canal"><span class="canal"><i style="background:' + (COLOR_CANAL[l.canal] || '#9fb0c8') + '"></i>' + esc(l.canal) + '</span></td>' +
        '<td class="c-fecha" data-l="Fecha:">' + esc(l.fecha) + '</td>' +
        '<td class="c-pers" data-l="Personas:">' + esc(l.personas) + '</td>' +
        '<td class="c-exp">' + esc(l.experiencia) + '</td>' +
        '<td class="c-estado"><span class="estado ' + esc(l.estado) + '">' + esc(D.estados[l.estado] || l.estado) + '</span></td>' +
        '<td class="c-movil">' + esc(l.experiencia) + ' · ' + esc(l.fecha) + ' · ' + esc(l.personas) + ' personas<br><span class="canal"><i style="background:' + (COLOR_CANAL[l.canal] || '#9fb0c8') + '"></i>' + esc(l.canal) + '</span></td>' +
      '</tr>';
    }).join('');
    document.getElementById('panel-tabla').innerHTML =
      '<table class="tabla"><thead><tr><th>Nombre</th><th>Canal</th><th>Fecha pedida</th><th>Personas</th><th>Experiencia</th><th>Estado</th></tr></thead><tbody>' + filas + '</tbody></table>';
  }

  /* ---------- Animación al entrar ---------- */
  function animar() {
    var barras = document.getElementById('panel-barras');
    barras.classList.remove('visto');
    Array.prototype.forEach.call(document.querySelectorAll('#panel-anillo .seg'), function (s) {
      s.style.strokeDasharray = '0 1000';
    });
    var barra = document.querySelector('.noche-barra i');
    if (barra) barra.style.width = '0';
    // doble frame para que el navegador registre el estado inicial
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        barras.classList.add('visto');
        var C = 2 * Math.PI * 52;
        Array.prototype.forEach.call(document.querySelectorAll('#panel-anillo .seg'), function (s) {
          s.style.strokeDasharray = s.getAttribute('data-largo') + ' ' + C;
        });
        if (barra) barra.style.width = barra.getAttribute('data-ancho') + '%';
        contar();
      });
    });
  }

  var anchoAnterior = 0;
  window.addEventListener('resize', function () {
    var cont = document.getElementById('panel-barras');
    if (!pintado || !cont.offsetParent) return;
    if (Math.abs(cont.clientWidth - anchoAnterior) < 30) return;
    anchoAnterior = cont.clientWidth;
    pintarBarras();
    cont.classList.add('visto');
  });

  window.PanelDemo = {
    mostrar: function () {
      if (!pintado) {
        document.getElementById('panel-aviso').textContent = D.aviso;
        pintarKpis();
        pintarBarras();
        anchoAnterior = document.getElementById('panel-barras').clientWidth;
        pintarAnillo();
        pintarNoche();
        pintarTabla();
        pintado = true;
      }
      animar();
    }
  };
})();
