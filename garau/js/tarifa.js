/*
  Garau · Presupuestador — datos
  Tarifa DE EJEMPLO con la forma del Excel del proveedor (medidas disponibles
  por tipo de módulo) y las reglas con las que piensa el asistente.
  Cuando llegue la tarifa real y los condicionantes de Javi, solo cambia este archivo.
*/
window.GARAU = (function () {
  'use strict';

  var MARGEN = 0.35;      // 35 % sobre coste
  var IVA = 0.21;
  var PUERTA_M2 = 74.5;   // € / m² de frente (laminado, ejemplo)
  var GUIA_CAJON = 14.2;  // € por guía de cajón

  // Medidas que existen en la tarifa del proveedor (cm)
  var MODULOS = {
    bajo: {
      nombre: 'Módulo bajo', corto: 'bajo',
      altos: [70, 80], anchos: [30, 40, 45, 50, 60, 80, 90, 100, 120], fondos: [58],
      defecto: { alto: 80, fondo: 58 },
      coste: function (al, an) { return 62 + an * 1.15 + (al - 70) * 0.6 + an * 0.0731; }
    },
    fregadero: {
      nombre: 'Módulo fregadero', corto: 'fregadero',
      altos: [70, 80], anchos: [60, 80, 90, 100, 120], fondos: [58],
      defecto: { alto: 80, fondo: 58 },
      coste: function (al, an) { return 54 + an * 1.05 + (al - 70) * 0.55 + an * 0.0613; }
    },
    cajonero: {
      nombre: 'Cajonero (3 cajones)', corto: 'cajonero',
      altos: [70, 80], anchos: [40, 45, 50, 60, 80, 90, 100, 120], fondos: [58],
      defecto: { alto: 80, fondo: 58 },
      coste: function (al, an) { return 110 + an * 1.6 + (al - 70) * 0.6 + an * 0.0417; }
    },
    alto: {
      nombre: 'Módulo alto (colgado)', corto: 'alto',
      altos: [35, 60, 70, 90], anchos: [30, 40, 45, 50, 60, 80, 90, 100], fondos: [35],
      defecto: { alto: 70, fondo: 35 },
      coste: function (al, an) { return 40 + an * 0.9 + al * 0.35 + an * 0.0389; }
    },
    campana: {
      nombre: 'Módulo campana', corto: 'campana',
      altos: [35, 60], anchos: [60, 90, 100, 120], fondos: [35],
      defecto: { alto: 60, fondo: 35 },
      coste: function (al, an) { return 45 + an * 0.85 + al * 0.3 + an * 0.0571; }
    },
    columna: {
      nombre: 'Columna', corto: 'columna',
      altos: [200, 220], anchos: [45, 60], fondos: [58],
      defecto: { alto: 220, fondo: 58 },
      coste: function (al, an) { return 120 + an * 1.9 + (al - 200) * 0.8 + an * 0.0533; }
    }
  };

  var EXTRAS = {
    tapeta:   { nombre: 'Tapeta lateral', unidad: 'ud', precio: 38.9 },
    tapetaCol:{ nombre: 'Tapeta lateral columna', unidad: 'ud', precio: 72.4 },
    zocalo:   { nombre: 'Zócalo', unidad: 'm', precio: 9.6 },
    encimera: { nombre: 'Encimera laminada', unidad: 'm', precio: 64 },
    tirador:  { nombre: 'Tirador', unidad: 'ud', precio: 4.8 }
  };

  /*
    Reglas. estado: 'confirmada' = dicha en la reunión;
    'supuesto' = puesta de ejemplo, pendiente de que Javi la confirme o la cambie.
  */
  var REGLAS = [
    { id: 'redondeo', estado: 'confirmada', titulo: 'Si la medida no existe, se redondea hacia arriba',
      texto: 'Pides 57 de ancho y en tarifa hay 50 y 60: se coge el de 60. Igual con el alto y el fondo.' },
    { id: 'fondo', estado: 'confirmada', titulo: 'Fondo de los bajos: 58',
      texto: 'Si no se dice el fondo, los bajos, cajoneros, fregaderos y columnas van a 58.' },
    { id: 'margen', estado: 'confirmada', titulo: 'Margen del 35 % sobre el precio del proveedor',
      texto: 'Se enseña siempre el coste y el precio de venta al público.' },
    { id: 'puerta', estado: 'confirmada', titulo: 'Cada módulo lleva su puerta a medida',
      texto: 'Un módulo de 80 × 60 lleva una puerta de 80 × 60, y se suma su precio.' },
    { id: 'dosPuertas', estado: 'confirmada', titulo: 'Fregadero o campana de más de 90 de ancho: dos puertas',
      texto: 'Se reparte el ancho entre dos puertas iguales.' },
    { id: 'dosPuertasGeneral', estado: 'supuesto', titulo: 'Cualquier módulo de más de 60 de ancho: dos puertas',
      texto: 'Supuesto de ejemplo. Pendiente de que Javi diga el corte real.' },
    { id: 'tapeta', estado: 'supuesto', titulo: 'Donde la cocina acaba contra pared, tapeta',
      texto: 'Se añade sola una tapeta en cada extremo marcado como “contra pared”.' },
    { id: 'tiradores', estado: 'supuesto', titulo: 'Un tirador por puerta y por cajón',
      texto: 'Se cuentan solos al ir añadiendo módulos.' },
    { id: 'zocalo', estado: 'supuesto', titulo: 'Zócalo y encimera por metro lineal de bajos',
      texto: 'Se calcula con la suma de anchos de los módulos bajos.' },
    { id: 'escala', estado: 'confirmada', titulo: 'Si algo no está en la tarifa, no se lo inventa',
      texto: 'Una medida más grande que la mayor de la tarifa se marca para que la mire Javi.' }
  ];

  function redondear2(n) { return Math.round(n * 100) / 100; }

  // Primera medida de la lista que sea >= pedida. null si se pasa de la mayor.
  function haciaArriba(lista, valor) {
    for (var i = 0; i < lista.length; i++) if (lista[i] >= valor) return lista[i];
    return null;
  }

  /*
    Calcula un módulo: devuelve medidas usadas, puertas, coste, pvp y los pasos
    de razonamiento ("lo que pasa por detrás").
  */
  function calcularModulo(tipo, pedido) {
    var m = MODULOS[tipo];
    var pasos = [];
    var al = pedido.alto || m.defecto.alto;
    var fo = pedido.fondo || m.defecto.fondo;
    var an = pedido.ancho;

    if (!pedido.alto) pasos.push({ ico: 'regla', t: 'Alto no indicado', r: 'Uso el alto habitual del ' + m.corto + ': ' + al + ' cm' });
    if (!pedido.fondo) pasos.push({ ico: 'regla', t: 'Fondo no indicado', r: 'Regla: fondo ' + fo + ' cm' });

    var usado = {
      alto: haciaArriba(m.altos, al),
      ancho: haciaArriba(m.anchos, an),
      fondo: haciaArriba(m.fondos, fo)
    };

    var fuera = [];
    [['alto', al], ['ancho', an], ['fondo', fo]].forEach(function (p) {
      var dim = p[0], v = p[1], u = usado[dim];
      var lista = m[dim + 's'];
      if (u === null) fuera.push(dim + ' ' + v + ' (máx. ' + lista[lista.length - 1] + ')');
      else if (u !== v) pasos.push({ ico: 'redondeo', t: 'No hay ' + dim + ' de ' + v, r: 'En tarifa hay ' + lista.join(', ') + ' → redondeo hacia arriba a ' + u });
      else pasos.push({ ico: 'ok', t: dim.charAt(0).toUpperCase() + dim.slice(1) + ' ' + v + ' existe en tarifa', r: '' });
    });

    if (fuera.length) {
      pasos.push({ ico: 'aviso', t: 'Fuera de tarifa', r: fuera.join(' · ') + '. No me lo invento: lo marco para que lo mire Javi.' });
      return { ok: false, tipo: tipo, pedido: { alto: al, ancho: an, fondo: fo }, pasos: pasos, fuera: fuera };
    }

    var costeModulo = redondear2(m.coste(usado.alto, usado.ancho));
    pasos.push({ ico: 'tabla', t: 'Tarifa proveedor: ' + m.nombre.toLowerCase() + ' ' + usado.alto + '×' + usado.ancho + '×' + usado.fondo, r: 'Coste módulo ' + euros(costeModulo) });

    // Frentes
    var frentes = [];
    if (tipo === 'cajonero') {
      var hC = redondear2(usado.alto / 3);
      for (var i = 0; i < 3; i++) frentes.push({ alto: hC, ancho: usado.ancho, cajon: true });
    } else if (tipo === 'columna') {
      frentes.push({ alto: 140, ancho: usado.ancho }, { alto: usado.alto - 140, ancho: usado.ancho });
    } else {
      var dos = false, porQue = '';
      if ((tipo === 'fregadero' || tipo === 'campana') && usado.ancho > 90) { dos = true; porQue = 'regla: ' + m.corto + ' de más de 90 → dos puertas'; }
      else if (usado.ancho > 60) { dos = true; porQue = 'supuesto: más de 60 de ancho → dos puertas'; }
      if (dos) {
        frentes.push({ alto: usado.alto, ancho: usado.ancho / 2 }, { alto: usado.alto, ancho: usado.ancho / 2 });
        pasos.push({ ico: 'regla', t: 'Dos puertas de ' + usado.alto + '×' + fmt(usado.ancho / 2), r: porQue });
      } else {
        frentes.push({ alto: usado.alto, ancho: usado.ancho });
        pasos.push({ ico: 'regla', t: 'Una puerta de ' + usado.alto + '×' + usado.ancho, r: 'regla: la puerta va a la medida del módulo' });
      }
    }

    var costeFrentes = 0;
    frentes.forEach(function (f) {
      costeFrentes += Math.max(0.1, (f.alto * f.ancho) / 10000) * PUERTA_M2 + (f.cajon ? GUIA_CAJON : 0);
    });
    costeFrentes = redondear2(costeFrentes);
    var esCajon = tipo === 'cajonero';
    pasos.push({ ico: 'tabla', t: esCajon ? 'Tres frentes de cajón con guías' : (frentes.length > 1 ? 'Tarifa de puertas (×2)' : 'Tarifa de puertas'), r: 'Coste ' + euros(costeFrentes) });

    var coste = redondear2(costeModulo + costeFrentes);
    var pvp = redondear2(coste * (1 + MARGEN));
    pasos.push({ ico: 'euro', t: 'Coste ' + euros(coste) + ' + 35 % de margen', r: 'Precio venta público ' + euros(pvp) + ' (sin IVA)' });

    return {
      ok: true, tipo: tipo, nombre: m.nombre, pedido: { alto: al, ancho: an, fondo: fo }, usado: usado,
      frentes: frentes, tiradores: frentes.length, costeModulo: costeModulo, costeFrentes: costeFrentes,
      coste: coste, pvp: pvp, pasos: pasos
    };
  }

  function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }

  function euros(n) {
    var p = Math.abs(n).toFixed(2).split('.');
    var ent = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '−' : '') + ent + ',' + p[1] + ' €';
  }

  return {
    MARGEN: MARGEN, IVA: IVA, MODULOS: MODULOS, EXTRAS: EXTRAS, REGLAS: REGLAS,
    calcularModulo: calcularModulo, euros: euros, fmt: fmt, redondear2: redondear2
  };
})();
