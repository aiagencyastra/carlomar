/*
  Montaje: las dos formas de trabajar y el plan por semanas.
  El esquema del servidor está en index.html; los textos, en js/datos.js.
*/
(function () {
  'use strict';

  var M = (window.DEMO || {}).montaje;
  if (!M) return;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var pintado = false;
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function pintar() {
    document.getElementById('montaje-opciones').innerHTML = M.opciones.map(function (o) {
      return '<article class="tarjeta opcion-trabajo' + (o.recomendada ? ' recomendada' : '') + '">' +
        (o.recomendada ? '<span class="sello">La que recomendamos</span>' : '') +
        '<h3>' + esc(o.titulo) + '</h3><p class="opcion-sub">' + esc(o.sub) + '</p>' +
        '<ul>' + o.puntos.map(function (p) { return '<li>' + CHECK + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul>' +
        (o.precio ? '<p class="opcion-precio">' + esc(o.precio) + '</p>' : '<p class="opcion-precio pendiente">Precio en el presupuesto</p>') +
      '</article>';
    }).join('');

    document.getElementById('montaje-plan').innerHTML = M.plan.map(function (p, i) {
      return '<li><span class="plan-n">' + (i + 1) + '</span><span><b>' + esc(p.cuando) + '</b>' + esc(p.que) + '</span></li>';
    }).join('');
  }

  window.MontajeDemo = {
    mostrar: function () { if (!pintado) { pintado = true; pintar(); } }
  };
})();
