/*
  Flota: lo que el bot lee del CRM (fichas, precios y calendario)
  y quién atiende cada barco. Los datos están en js/datos.js.
*/
(function () {
  'use strict';

  var D = window.DEMO || {};
  if (!D.flota) return;
  var quien = (D.marca || {}).responsable || 'el equipo';

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var pintado = false;
  var NOMBRE_ESTADO = { l: 'libre', o: 'ocupado', n: 'noche a bordo' };

  function pintarReglas() {
    var r = D.reglas;
    function lista(items) { return '<ul>' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; }
    document.getElementById('flota-reglas').innerHTML =
      '<div class="regla-col bot"><h3><span class="lleva bot"><i></i>Lo contesta el bot</span></h3>' + lista(r.bot) + '</div>' +
      '<div class="regla-col equipo"><h3><span class="lleva persona"><i></i>Os lo pasa a vosotros</span></h3>' + lista(r.equipo) + '</div>';
  }

  function etiquetaQuien(b) {
    return b.quien === 'bot'
      ? '<span class="lleva bot"><i></i>Lo contesta el bot</span>'
      : '<span class="lleva persona"><i></i>Pasa a ' + esc(quien) + '</span>';
  }

  function semana(b) {
    var dias = D.semana.dias;
    return '<div class="sem" role="img" aria-label="Disponibilidad de ' + esc(b.nombre) + ': ' +
      b.semana.map(function (d, i) { return dias[i] + ' mañana ' + NOMBRE_ESTADO[d[0]] + ', tarde ' + NOMBRE_ESTADO[d[1]]; }).join('; ') + '">' +
      b.semana.map(function (d, i) {
        return '<span class="sem-dia"><span class="sem-casillas"><i class="' + d[0] + '"></i><i class="' + d[1] + '"></i></span><small>' + esc(dias[i].split(' ')[0]) + '</small></span>';
      }).join('') + '</div>';
  }

  function pintarFlota() {
    var cont = document.getElementById('flota-lista');
    cont.innerHTML = D.flota.map(function (b, i) {
      return '<article class="tarjeta barco ' + b.quien + '" data-i="' + i + '">' +
        '<div class="barco-cabeza">' +
          '<div><h3>' + esc(b.nombre) + '</h3><p>' + esc(b.tipo) + ' · ' + esc(b.medida) + ' · hasta ' + b.personas + '</p></div>' +
          '<span class="barco-quien">' + etiquetaQuien(b) + '</span>' +
        '</div>' +
        '<dl class="barco-datos">' +
          '<div><dt>Precio</dt><dd>' + esc(b.precio) + '</dd></div>' +
          '<div><dt>Base</dt><dd>' + esc(b.base) + '</dd></div>' +
          '<div><dt>Ficha</dt><dd>' + esc(b.extra) + '</dd></div>' +
        '</dl>' +
        semana(b) +
        '<button type="button" class="barco-cambio" aria-label="Cambiar quién atiende ' + esc(b.nombre) + '">' +
          '<span class="interruptor" aria-hidden="true"><i></i></span><span class="barco-cambio-txt"></span>' +
        '</button>' +
      '</article>';
    }).join('');
    Array.prototype.forEach.call(cont.querySelectorAll('.barco'), actualizarInterruptor);
  }

  function actualizarInterruptor(art) {
    var b = D.flota[Number(art.getAttribute('data-i'))];
    var boton = art.querySelector('.barco-cambio');
    boton.setAttribute('aria-pressed', b.quien === 'bot' ? 'true' : 'false');
    art.querySelector('.barco-cambio-txt').textContent = b.quien === 'bot' ? 'Bot activado para este barco' : 'Bot desactivado: lo lleváis vosotros';
  }

  document.getElementById('flota-lista').addEventListener('click', function (e) {
    var boton = e.target.closest('.barco-cambio');
    if (!boton) return;
    var art = boton.closest('.barco');
    var b = D.flota[Number(art.getAttribute('data-i'))];
    b.quien = b.quien === 'bot' ? 'equipo' : 'bot';
    art.classList.toggle('bot', b.quien === 'bot');
    art.classList.toggle('equipo', b.quien === 'equipo');
    art.querySelector('.barco-quien').innerHTML = etiquetaQuien(b);
    actualizarInterruptor(art);
    art.classList.remove('cambia'); void art.offsetWidth; art.classList.add('cambia');
  });

  window.FlotaDemo = {
    mostrar: function () {
      if (pintado) return;
      pintado = true;
      document.getElementById('flota-semana').textContent = D.semana.titulo;
      pintarReglas();
      pintarFlota();
    }
  };
})();
