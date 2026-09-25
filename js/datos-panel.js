/*
  DATOS DEL PANEL — todo de ejemplo, para la demostración.
  Se pueden cambiar aquí sin tocar js/panel.js.
*/
window.DEMO = window.DEMO || {};

window.DEMO.panel = {
  aviso: 'Datos de ejemplo para la demostración, pensados como una temporada normal en Mallorca.',
  mesActual: 'agosto',

  kpis: [
    { etiqueta: 'Interesados en agosto', valor: 214, nota: '+14 % que julio' },
    { etiqueta: 'Reservas cerradas', valor: 53, nota: '1 de cada 4 interesados' },
    { etiqueta: 'Pendientes de contestar', valor: 0, nota: 'nadie esperando', destacado: true },
    { etiqueta: 'Tiempo medio de respuesta', valor: 12, unidad: 's', nota: 'de día y de noche' }
  ],

  // Temporada: flojo en abril y octubre, fuerte en julio y agosto
  meses: [
    { mes: 'Abr', interesados: 38, reservas: 7 },
    { mes: 'May', interesados: 76, reservas: 15 },
    { mes: 'Jun', interesados: 121, reservas: 29 },
    { mes: 'Jul', interesados: 188, reservas: 47 },
    { mes: 'Ago', interesados: 214, reservas: 53, actual: true },
    { mes: 'Sep', interesados: 129, reservas: 30 },
    { mes: 'Oct', interesados: 44, reservas: 8 }
  ],

  canales: [
    { nombre: 'WhatsApp', porcentaje: 62, color: '#13233F' },
    { nombre: 'Correo', porcentaje: 24, color: '#D99A2B' },
    { nombre: 'Formulario web', porcentaje: 14, color: '#9fb0c8' }
  ],

  fueraDeHorario: {
    etiqueta: 'Mensajes atendidos fuera de horario (21:00-09:00)',
    porcentaje: 38,
    frase: 'Conversaciones que antes se quedaban sin contestar hasta el día siguiente.'
  },

  // estado: 'reservado' | 'pendiente' | 'david'
  leads: [
    { nombre: 'Sarah Mitchell', canal: 'WhatsApp', fecha: '2 sep', personas: 4, experiencia: 'Full Day', estado: 'reservado' },
    { nombre: 'Javier Morales', canal: 'Correo', fecha: '22 ago', personas: 6, experiencia: 'Full Day', estado: 'reservado' },
    { nombre: 'Marc Vidal', canal: 'WhatsApp', fecha: '10 ago', personas: 6, experiencia: 'Half Day', estado: 'david' },
    { nombre: 'Carmen Ruiz', canal: 'Formulario web', fecha: '6 ago', personas: 4, experiencia: 'Half Day + Sunset', estado: 'pendiente' },
    { nombre: 'Lukas Weber', canal: 'WhatsApp', fecha: '30 ago', personas: 2, experiencia: 'Sunset', estado: 'reservado' },
    { nombre: 'Olivia Brown', canal: 'Correo', fecha: '12 sep', personas: 4, experiencia: 'Full Day', estado: 'reservado' },
    { nombre: 'Lucía Ferrer', canal: 'WhatsApp', fecha: '28 ago', personas: 10, experiencia: 'Complete', estado: 'david' },
    { nombre: 'Tom Hughes', canal: 'WhatsApp', fecha: '5 sep', personas: 3, experiencia: 'Half Day', estado: 'pendiente' }
  ],

  estados: {
    reservado: 'Reservado',
    pendiente: 'Pendiente de reservar',
    david: 'Pasado a David'
  }
};
