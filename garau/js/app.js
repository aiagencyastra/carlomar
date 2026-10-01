/*
  Garau · Presupuestador — funcionamiento
  Pestañas, chat que entiende medidas, constructor de cocina, reglas y tarifa.
  Los datos y las reglas están en js/tarifa.js.
*/
(function () {
  'use strict';

  var G = window.GARAU;
  var euros = G.euros;

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function el(tag, clase, html) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function escapar(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONOS = {
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lee: '<path d="M4 5h16v11H9l-5 4z"/>',
    redondeo: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    regla: '<path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z"/>',
    tabla: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>',
    euro: '<path d="M17 6.5a6.5 6.5 0 1 0 0 11M5 10.5h8M5 13.5h8"/>',
    aviso: '<path d="M12 4l9 16H3zM12 10v4M12 17h.01"/>',
    quitar: '<path d="M6 6l12 12M18 6L6 18"/>'
  };
  function icono(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONOS[n] || ICONOS.ok) + '</svg>'; }

  /* ---------------- Pestañas ---------------- */

  function irA(id, sinHash) {
    $$('.pestana').forEach(function (b) {
      var on = b.dataset.seccion === id;
      b.classList.toggle('activa', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.seccion').forEach(function (s) {
      var on = s.id === 'sec-' + id;
      s.hidden = !on;
      s.classList.toggle('activa', on);
    });
    if (!sinHash && history.replaceState) history.replaceState(null, '', '#' + id);
  }
  $$('.pestana').forEach(function (b) {
    b.addEventListener('click', function () {
      irA(b.dataset.seccion);
      var nav = $('.pestanas');
      if (window.scrollY > nav.offsetTop) window.scrollTo({ top: nav.offsetTop, behavior: reducido ? 'auto' : 'smooth' });
    });
  });
  var inicial = (location.hash || '').slice(1);
  if (['preguntar', 'cocina', 'reglas', 'pasos'].indexOf(inicial) >= 0) irA(inicial, true);

  /* ---------------- Entender el mensaje ---------------- */

  var PALABRAS_TIPO = [
    ['fregadero', /fregader|pica|lavaplatos/],
    ['campana', /campana|extractor/],
    ['columna', /columna|torre|horno/],
    ['cajonero', /cajon|cajón/],
    ['alto', /colgad|superior|altillo|mural/],
    ['bajo', /\bbajo|inferior|base/]
  ];

  function entender(texto) {
    var t = texto.toLowerCase().replace(/,/g, '.');
    var r = { tipo: null, alto: null, ancho: null, fondo: null };

    // "un alto", "módulo alto", "en altos": es el tipo de módulo, no la medida
    var tipoAlto = /\b(un|el|los|m[oó]dulos?|muebles?|en)\s+altos?\b/.exec(t);
    if (tipoAlto) { r.tipo = 'alto'; t = t.replace(tipoAlto[0], ' '); }

    // Medidas con nombre: "90 de ancho", "ancho 90", "fondo: 58"
    ['alto', 'ancho', 'fondo'].forEach(function (dim) {
      var a = new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:cm\\s*)?(?:de\\s+)?' + dim).exec(t);
      var b = new RegExp(dim + '\\s*(?:de|:|=)?\\s*(\\d+(?:\\.\\d+)?)').exec(t);
      var m = a || b;
      if (m) { r[dim] = parseFloat(m[1]); t = t.replace(m[0], ' '); }
    });

    // Tipo (después de quitar "alto 80" para no confundir "alto" de medida con módulo alto)
    for (var i = 0; i < PALABRAS_TIPO.length && !r.tipo; i++) {
      if (PALABRAS_TIPO[i][1].test(t)) { r.tipo = PALABRAS_TIPO[i][0]; break; }
    }

    // El resto de números, en orden: alto × ancho × fondo
    var nums = (t.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat).filter(function (n) { return n >= 10 && n <= 400; });
    var libres = ['alto', 'ancho', 'fondo'].filter(function (d) { return r[d] === null; });
    if (nums.length === 1 && libres.indexOf('ancho') >= 0) { r.ancho = nums[0]; }
    else nums.forEach(function (n, k) { if (libres[k]) r[libres[k]] = n; });

    return r;
  }

  /* ---------------- Chat ---------------- */

  var chat = $('#chat-mensajes');
  var lista = $('#detras-lista');
  var estado = $('#chat-estado');
  var ultimo = null;   // último módulo calculado, para "añadir a la cocina"
  var ocupado = false;

  function hora() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function burbuja(quien, html) {
    var b = el('div', 'burbuja ' + quien, html + '<span class="hora">' + hora() + '</span>');
    chat.appendChild(b);
    chat.scrollTop = chat.scrollHeight;
    return b;
  }

  function escribiendo(on) {
    var e = $('.escribiendo', chat);
    if (on && !e) { chat.appendChild(el('div', 'escribiendo', '<i></i><i></i><i></i>')); chat.scrollTop = chat.scrollHeight; }
    if (!on && e) e.remove();
    estado.textContent = on ? 'pensando…' : 'en línea';
    estado.classList.toggle('pensando', on);
  }

  function nombreTipo(tipo) { return G.MODULOS[tipo].nombre.toLowerCase().replace(/ \(.*\)/, ''); }

  async function pintarPasos(pasos) {
    lista.innerHTML = '';
    for (var i = 0; i < pasos.length; i++) {
      var p = pasos[i];
      var li = el('li', 'paso p-' + p.ico, '<span class="paso-ico">' + icono(p.ico) + '</span><span class="paso-txt"><b>' + escapar(p.t) + '</b><span class="paso-res">' + escapar(p.r || '') + '</span></span>');
      lista.appendChild(li);
      if (!reducido) await esperar(380);
    }
  }

  async function responder(texto) {
    if (ocupado) return;
    ocupado = true;
    burbuja('mia', escapar(texto));
    escribiendo(true);

    var t = texto.toLowerCase();
    var pasos = [{ ico: 'lee', t: 'Lee el mensaje', r: '“' + texto + '”' }];
    var respuesta, boton = false;

    if (/margen|beneficio/.test(t) && !/\d/.test(t)) {
      pasos.push({ ico: 'regla', t: 'Pregunta por el margen', r: 'Regla: 35 % sobre el coste del proveedor' });
      respuesta = 'El margen que aplico es del <b>35 %</b> sobre el precio del proveedor. Si para algún producto es otro, me lo decís y lo cambio.';
    } else if (/qu[eé] (medidas|anchos)|medidas (hay|tienes|disponibles)|anchos (hay|tienes)/.test(t)) {
      var e0 = entender(texto);
      var tp = e0.tipo || 'bajo';
      var m = G.MODULOS[tp];
      pasos.push({ ico: 'tabla', t: 'Mira la tarifa del ' + m.corto, r: 'Anchos ' + m.anchos.join(', ') + ' · altos ' + m.altos.join(', ') });
      respuesta = 'En ' + nombreTipo(tp) + ' el proveedor tiene anchos de <b>' + m.anchos.join(', ') + '</b> y altos de <b>' + m.altos.join(', ') + '</b> (fondo ' + m.fondos.join(', ') + ').';
    } else {
      var e = entender(texto);
      if (!e.tipo) { e.tipo = 'bajo'; }
      pasos.push({ ico: 'lee', t: 'Entiende: ' + nombreTipo(e.tipo), r: [e.alto ? 'alto ' + e.alto : null, e.ancho ? 'ancho ' + e.ancho : null, e.fondo ? 'fondo ' + e.fondo : null].filter(Boolean).join(' · ') || 'sin medidas' });

      if (!e.ancho) {
        pasos.push({ ico: 'aviso', t: 'Falta el ancho', r: 'Sin el ancho no puedo buscar en la tarifa: lo pregunto' });
        respuesta = 'Vale, ' + nombreTipo(e.tipo) + '. ¿De qué ancho lo quieres? Si me das alto × ancho × fondo, mejor.';
      } else {
        var c = G.calcularModulo(e.tipo, e);
        pasos = pasos.concat(c.pasos);
        if (!c.ok) {
          respuesta = 'Uf, eso no lo tengo en la tarifa del proveedor: ' + escapar(c.fuera.join(', ')) + '. No me lo invento; lo dejo marcado para que lo mire Javi.';
        } else {
          ultimo = c;
          var red = (c.usado.ancho !== c.pedido.ancho || c.usado.alto !== c.pedido.alto || c.usado.fondo !== c.pedido.fondo);
          var puertas = e.tipo === 'cajonero' ? 'tres frentes de cajón' : (c.frentes.length === 2 ? 'dos puertas' : 'una puerta de ' + c.usado.alto + ' × ' + c.usado.ancho);
          respuesta =
            (red ? 'De ' + c.pedido.alto + ' × ' + c.pedido.ancho + ' × ' + c.pedido.fondo + ' no hay, así que cojo el de <b>' + c.usado.alto + ' × ' + c.usado.ancho + ' × ' + c.usado.fondo + '</b>. '
                 : 'Tengo el de <b>' + c.usado.alto + ' × ' + c.usado.ancho + ' × ' + c.usado.fondo + '</b>. ') +
            'Lleva ' + puertas + '.' +
            '<span class="cifras"><span>Módulo<b>' + euros(c.costeModulo) + '</b></span><span>' + (e.tipo === 'cajonero' ? 'Frentes' : 'Puertas') + '<b>' + euros(c.costeFrentes) + '</b></span><span>Coste proveedor<b>' + euros(c.coste) + '</b></span><span class="pvp">PVP (+35 %)<b>' + euros(c.pvp) + '</b></span></span>';
          boton = true;
        }
      }
    }

    var pintando = pintarPasos(pasos);
    if (!reducido) await esperar(700 + pasos.length * 200);
    escribiendo(false);
    var b = burbuja('suya', respuesta);
    if (boton) {
      var a = el('button', 'burbuja-accion', 'Añadir a “Nueva cocina”');
      a.type = 'button';
      var mod = ultimo;
      a.addEventListener('click', function () {
        cocina.push({ tipo: mod.tipo, alto: mod.pedido.alto, ancho: mod.pedido.ancho, fondo: mod.pedido.fondo });
        pintarCocina();
        a.textContent = 'Añadido ✓';
        a.disabled = true;
      });
      b.insertBefore(a, b.querySelector('.hora'));
    }
    chat.scrollTop = chat.scrollHeight;
    await pintando;
    ocupado = false;
  }

  var EJEMPLOS = [
    'un bajo de 80 por 57 por 58',
    'fregadero de 100 de ancho',
    'campana 60 x 90',
    'columna de 60',
    'cajonero 80 x 45',
    'un alto de 70 x 130',
    '¿qué anchos hay en altos?'
  ];
  var sug = $('#chat-sugerencias');
  EJEMPLOS.forEach(function (txt) {
    var b = el('button', 'sugerencia', escapar(txt));
    b.type = 'button';
    b.addEventListener('click', function () { responder(txt); });
    sug.appendChild(b);
  });

  $('#chat-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var i = $('#chat-input');
    var v = i.value.trim();
    if (!v || ocupado) return;
    i.value = '';
    responder(v);
  });

  burbuja('suya', 'Hola 👋 Dime qué mueble necesitas y sus medidas (alto × ancho × fondo) y te digo el precio del proveedor y el de venta. Si no existe la medida, redondeo hacia arriba.');

  /* ---------------- Nueva cocina ---------------- */

  var cocina = [
    { tipo: 'columna', ancho: 60 },
    { tipo: 'bajo', alto: 80, ancho: 57, fondo: 58 },
    { tipo: 'fregadero', ancho: 100 },
    { tipo: 'cajonero', ancho: 60 },
    { tipo: 'alto', alto: 70, ancho: 60 },
    { tipo: 'campana', alto: 60, ancho: 90 },
    { tipo: 'alto', alto: 70, ancho: 80 }
  ];

  var selTipo = $('#m-tipo');
  Object.keys(G.MODULOS).forEach(function (k) {
    var o = el('option', null, G.MODULOS[k].nombre);
    o.value = k;
    selTipo.appendChild(o);
  });
  function notaTipo() {
    var m = G.MODULOS[selTipo.value];
    $('#m-alto').placeholder = m.defecto.alto;
    $('#m-fondo').placeholder = m.defecto.fondo;
    $('#m-nota').textContent = 'En tarifa: anchos ' + m.anchos.join(', ') + ' · altos ' + m.altos.join(', ') + '. Si ponéis otra medida, se redondea hacia arriba.';
  }
  selTipo.addEventListener('change', notaTipo);
  notaTipo();

  $('#anadir-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var n = function (id) { var v = parseFloat($(id).value); return isNaN(v) ? null : v; };
    var ancho = n('#m-ancho');
    if (!ancho) { $('#m-ancho').focus(); return; }
    cocina.push({ tipo: selTipo.value, alto: n('#m-alto'), ancho: ancho, fondo: n('#m-fondo') });
    $('#m-alto').value = ''; $('#m-ancho').value = ''; $('#m-fondo').value = '';
    pintarCocina(true);
  });

  ['#x-pared-izq', '#x-pared-der', '#x-zocalo', '#x-encimera', '#x-tiradores'].forEach(function (id) {
    $(id).addEventListener('change', function () { pintarCocina(); });
  });
  $('#p-vaciar').addEventListener('click', function () { cocina = []; pintarCocina(); });

  var calculo = null;

  function calcularCocina() {
    var lineas = [], avisos = [];
    var tiradores = 0, linealBajos = 0;
    var bajos = ['bajo', 'fregadero', 'cajonero', 'columna'];

    cocina.forEach(function (p, idx) {
      var c = G.calcularModulo(p.tipo, p);
      if (!c.ok) {
        lineas.push({ idx: idx, fuera: true, texto: G.MODULOS[p.tipo].nombre + ' ' + c.pedido.alto + '×' + c.pedido.ancho + '×' + c.pedido.fondo, nota: 'Fuera de tarifa: ' + c.fuera.join(', ') + '. Lo mira Javi.' });
        avisos.push({ t: 'aviso', x: G.MODULOS[p.tipo].nombre + ' de ' + c.pedido.ancho + ' de ancho no está en tarifa: no se suma al total.' });
        return;
      }
      var red = c.usado.ancho !== c.pedido.ancho || c.usado.alto !== c.pedido.alto || c.usado.fondo !== c.pedido.fondo;
      var frentes = p.tipo === 'cajonero' ? '3 frentes de cajón' : (c.frentes.length === 2 ? '2 puertas' : '1 puerta');
      lineas.push({
        idx: idx, texto: c.nombre + ' ' + c.usado.alto + '×' + c.usado.ancho + '×' + c.usado.fondo,
        nota: frentes + (red ? ' · pedido ' + c.pedido.alto + '×' + c.pedido.ancho + '×' + c.pedido.fondo + ', redondeado' : ''),
        coste: c.coste, pvp: c.pvp
      });
      tiradores += c.tiradores;
      if (bajos.indexOf(p.tipo) >= 0 && p.tipo !== 'columna') linealBajos += c.usado.ancho;
    });

    function extra(clave, cant, nota) {
      var e = G.EXTRAS[clave];
      var coste = G.redondear2(e.precio * cant);
      lineas.push({ extra: true, texto: e.nombre + (cant !== 1 ? ' × ' + G.fmt(cant) + ' ' + e.unidad : ''), nota: nota, coste: coste, pvp: G.redondear2(coste * (1 + G.MARGEN)) });
    }

    if (cocina.length) {
      var extremos = [];
      if ($('#x-pared-izq').checked) extremos.push(cocina[0]);
      if ($('#x-pared-der').checked) extremos.push(cocina[cocina.length - 1]);
      extremos.forEach(function (m, k) {
        var col = m.tipo === 'columna';
        extra(col ? 'tapetaCol' : 'tapeta', 1, 'Regla: extremo ' + (k === 0 && $('#x-pared-izq').checked ? 'izquierdo' : 'derecho') + ' contra pared');
      });
      if (!$('#x-pared-izq').checked && !$('#x-pared-der').checked) {
        avisos.push({ t: 'pista', x: '¿Ningún extremo acaba contra pared? Si alguno sí, marcadlo y se añade su tapeta.' });
      }
      if (linealBajos) {
        var ml = linealBajos / 100;
        if ($('#x-zocalo').checked) extra('zocalo', ml, 'Regla: metros lineales de bajos (' + G.fmt(ml) + ' m)');
        if ($('#x-encimera').checked) extra('encimera', ml, 'Regla: metros lineales de bajos (' + G.fmt(ml) + ' m)');
      }
      if ($('#x-tiradores').checked && tiradores) extra('tirador', tiradores, 'Regla: uno por puerta y cajón (' + tiradores + ')');

      var hayFreg = cocina.some(function (m) { return m.tipo === 'fregadero'; });
      if (!hayFreg) avisos.push({ t: 'pista', x: 'No hay módulo de fregadero. ¿Es a propósito?' });
    }

    var coste = 0, base = 0;
    lineas.forEach(function (l) { if (!l.fuera) { coste += l.coste; base += l.pvp; } });
    coste = G.redondear2(coste); base = G.redondear2(base);
    var iva = G.redondear2(base * G.IVA);
    return { lineas: lineas, avisos: avisos, coste: coste, base: base, iva: iva, total: G.redondear2(base + iva) };
  }

  function pintarCocina(destacarUltima) {
    calculo = calcularCocina();
    var tb = $('#p-lineas');
    tb.innerHTML = '';
    if (!calculo.lineas.length) {
      tb.appendChild(el('tr', 'vacia', '<td colspan="4">Todavía no hay módulos. Añadid el primero.</td>'));
    }
    calculo.lineas.forEach(function (l) {
      var tr = el('tr', (l.extra ? 'extra' : '') + (l.fuera ? ' fuera' : ''));
      tr.innerHTML = '<td><b>' + escapar(l.texto) + '</b><small>' + escapar(l.nota || '') + '</small></td>' +
        '<td class="num">' + (l.fuera ? '—' : euros(l.coste)) + '</td>' +
        '<td class="num">' + (l.fuera ? '—' : euros(l.pvp)) + '</td>' +
        '<td class="quitar-celda"></td>';
      if (l.idx != null) {
        var q = el('button', 'quitar', icono('quitar'));
        q.type = 'button';
        q.setAttribute('aria-label', 'Quitar ' + l.texto);
        q.addEventListener('click', function () { cocina.splice(l.idx, 1); pintarCocina(); });
        tr.lastChild.appendChild(q);
      }
      tb.appendChild(tr);
    });
    if (destacarUltima) {
      var filas = $$('tr:not(.extra)', tb);
      var f = filas[filas.length - 1];
      if (f) f.classList.add('nueva');
    }

    var av = $('#p-avisos');
    av.innerHTML = '';
    calculo.avisos.forEach(function (a) {
      av.appendChild(el('li', 'aviso-' + a.t, icono(a.t === 'aviso' ? 'aviso' : 'regla') + '<span>' + escapar(a.x) + '</span>'));
    });

    $('#p-totales').innerHTML =
      '<div class="tot-fila tot-coste"><span>Coste proveedor</span><b>' + euros(calculo.coste) + '</b></div>' +
      '<div class="tot-fila"><span>Margen (35 %)</span><b>' + euros(G.redondear2(calculo.base - calculo.coste)) + '</b></div>' +
      '<div class="tot-fila"><span>Base imponible</span><b>' + euros(calculo.base) + '</b></div>' +
      '<div class="tot-fila"><span>IVA 21 %</span><b>' + euros(calculo.iva) + '</b></div>' +
      '<div class="tot-fila tot-final"><span>Precio venta público</span><b>' + euros(calculo.total) + '</b></div>';
    $('#p-generar').disabled = !calculo.base;
  }
  pintarCocina();

  /* ---------------- Presupuesto para el cliente ---------------- */

  var hoja = $('#hoja');
  function abrirHoja() {
    var c = calculo;
    var hoy = new Date();
    var fecha = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    var valido = new Date(hoy.getTime() + 30 * 864e5).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    var filas = c.lineas.filter(function (l) { return !l.fuera; }).map(function (l) {
      return '<tr><td>' + escapar(l.texto) + '</td><td class="num">' + euros(l.pvp) + '</td></tr>';
    }).join('');
    $('#hoja-papel').innerHTML =
      '<div class="doc-cabeza"><div><div class="doc-marca">GARAU</div><div class="doc-sub">Cocinas y mobiliario</div></div>' +
      '<div class="doc-num"><b id="hoja-titulo">Presupuesto</b><span>Nº P-' + hoy.getFullYear() + '-0' + (40 + cocina.length) + '</span><span>' + fecha + '</span></div></div>' +
      '<div class="doc-cliente"><span>Para</span><b>' + escapar($('#p-cliente').value || 'Cliente') + '</b></div>' +
      '<table class="doc-tabla"><thead><tr><th>Concepto</th><th class="num">Importe</th></tr></thead><tbody>' + filas + '</tbody></table>' +
      '<div class="doc-totales"><div><span>Base imponible</span><b>' + euros(c.base) + '</b></div><div><span>IVA 21 %</span><b>' + euros(c.iva) + '</b></div><div class="doc-total"><span>Total</span><b>' + euros(c.total) + '</b></div></div>' +
      '<p class="doc-nota">Presupuesto válido hasta el ' + valido + '. Medidas sujetas a la toma de medidas definitiva en obra.</p>';
    hoja.hidden = false;
    document.body.classList.add('sin-scroll');
    $('#hoja-cerrar').focus();
  }
  function cerrarHoja() { hoja.hidden = true; document.body.classList.remove('sin-scroll'); }
  $('#p-generar').addEventListener('click', abrirHoja);
  $('#hoja-cerrar').addEventListener('click', cerrarHoja);
  $('#hoja-imprimir').addEventListener('click', function () { window.print(); });
  hoja.addEventListener('click', function (ev) { if (ev.target === hoja) cerrarHoja(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !hoja.hidden) cerrarHoja(); });

  /* ---------------- Reglas y tarifa ---------------- */

  var rl = $('#reglas-lista');
  G.REGLAS.forEach(function (r) {
    rl.appendChild(el('li', 'regla-item tarjeta ' + r.estado,
      '<span class="regla-estado">' + (r.estado === 'confirmada' ? 'De la reunión' : 'Supuesto, a confirmar') + '</span>' +
      '<b>' + escapar(r.titulo) + '</b><span>' + escapar(r.texto) + '</span>'));
  });

  var filtro = $('#tarifa-filtro');
  function pintarTarifa(tipo) {
    $$('button', filtro).forEach(function (b) {
      var on = b.dataset.tipo === tipo;
      b.classList.toggle('activo', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var m = G.MODULOS[tipo];
    var h = '<table class="tarifa-t"><thead><tr><th>Alto \\ Ancho</th>' + m.anchos.map(function (a) { return '<th class="num">' + a + '</th>'; }).join('') + '</tr></thead><tbody>';
    m.altos.forEach(function (al) {
      h += '<tr><th>' + al + ' <small>fondo ' + m.fondos[0] + '</small></th>' + m.anchos.map(function (an) {
        return '<td class="num">' + euros(G.redondear2(m.coste(al, an))) + '</td>';
      }).join('') + '</tr>';
    });
    h += '</tbody></table>';
    $('#tarifa-tabla').innerHTML = h;
  }
  Object.keys(G.MODULOS).forEach(function (k) {
    var b = el('button', 'filtro', escapar(G.MODULOS[k].corto));
    b.type = 'button';
    b.dataset.tipo = k;
    b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { pintarTarifa(k); });
    filtro.appendChild(b);
  });
  pintarTarifa('bajo');
})();
