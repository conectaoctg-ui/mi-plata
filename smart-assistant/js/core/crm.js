// Gestión comercial de clientes potenciales (embudo) con reglas de contacto.
// Recolección mínima: no se pide cédula ni dirección en esta etapa.

export const ETAPAS = [
  { id: 'nuevo', nombre: 'Primer contacto' },
  { id: 'calificado', nombre: 'Necesidad identificada' },
  { id: 'propuesta', nombre: 'Propuesta presentada' },
  { id: 'negociacion', nombre: 'Resolviendo objeciones' },
  { id: 'ganado', nombre: 'Venta cerrada' },
  { id: 'perdido', nombre: 'Venta perdida' }
];

export const MOTIVOS_PERDIDA = [
  'Precio', 'No había el modelo o capacidad', 'Compró en otro lugar', 'Financiación no aprobada',
  'Decidió no comprar por ahora', 'No respondió', 'Otro'
];

export const CANALES = ['Tienda', 'WhatsApp', 'Llamada', 'Redes sociales', 'Referido', 'Otro'];

const ETAPA_IDS = ETAPAS.map((e) => e.id);
const CERRADAS = ['ganado', 'perdido'];

// Siguiente acción sugerida para cada etapa (entrenamiento comercial).
export const ACCION_SUGERIDA = {
  nuevo: 'Hacer preguntas de descubrimiento: uso, equipo actual, capacidad, presupuesto.',
  calificado: 'Presentar 2 o 3 opciones que encajen, con estado y garantía por escrito.',
  propuesta: 'Preguntar qué le genera duda y resolverlo con datos verificados.',
  negociacion: 'Confirmar disponibilidad y condiciones vigentes; proponer un siguiente paso concreto.',
  ganado: 'Entregar con checklist, explicar garantía y ofrecer ayuda para pasar datos.',
  perdido: 'Registrar el motivo. Solo contactar de nuevo si el cliente lo autorizó.'
};

/** Valida y normaliza un cliente potencial. Devuelve { ok, errors, value }. */
export function validarLead(input) {
  const errors = [];
  const nombre = String(input.nombre || '').trim();
  const telefono = String(input.telefono || '').replace(/[^\d+]/g, '');
  if (nombre.length < 2 || nombre.length > 60) errors.push('Escribe un nombre de 2 a 60 caracteres.');
  if (telefono && !/^\+?\d{7,13}$/.test(telefono)) errors.push('El teléfono debe tener entre 7 y 13 dígitos.');
  const etapa = input.etapa || 'nuevo';
  if (!ETAPA_IDS.includes(etapa)) errors.push('Etapa no válida.');
  if (etapa === 'perdido' && !MOTIVOS_PERDIDA.includes(input.motivoPerdida)) errors.push('Para marcar la venta como perdida, indica el motivo.');
  const autorizaContacto = input.autorizaContacto === true;
  const noContactar = input.noContactar === true;
  const proximaFecha = input.proximaFecha || '';
  if (proximaFecha && !/^\d{4}-\d{2}-\d{2}$/.test(proximaFecha)) errors.push('La fecha de seguimiento no es válida.');
  if (proximaFecha && (!autorizaContacto || noContactar)) {
    errors.push('No se puede programar seguimiento: el cliente no autorizó ser contactado o pidió no ser contactado.');
  }
  if (telefono && noContactar) {
    errors.push('El cliente pidió no ser contactado: no se guarda su teléfono.');
  } else if (telefono && !autorizaContacto) {
    errors.push('Para guardar el teléfono se necesita la autorización del cliente para tratar sus datos (Ley 1581 de 2012).');
  }
  return {
    ok: errors.length === 0,
    errors,
    value: {
      nombre,
      telefono,
      canal: CANALES.includes(input.canal) ? input.canal : 'Tienda',
      etapa,
      interes: String(input.interes || '').trim().slice(0, 200),
      presupuesto: Number.isInteger(input.presupuesto) && input.presupuesto > 0 ? input.presupuesto : null,
      objeciones: String(input.objeciones || '').trim().slice(0, 300),
      proximaAccion: String(input.proximaAccion || '').trim().slice(0, 200),
      proximaFecha: noContactar ? '' : proximaFecha,
      motivoPerdida: etapa === 'perdido' ? input.motivoPerdida : '',
      autorizaContacto,
      noContactar
    }
  };
}

/** Aplica la solicitud de no contacto: borra teléfono y seguimiento pendientes. */
export function aplicarNoContactar(lead) {
  return { ...lead, noContactar: true, telefono: '', proximaFecha: '', proximaAccion: 'No contactar (solicitud del cliente).' };
}

export function estaCerrado(lead) {
  return CERRADAS.includes(lead.etapa);
}

/** Seguimientos vencidos o de hoy, respetando no contacto. */
export function seguimientosPendientes(leads, hoyISO) {
  return leads
    .filter((l) => !estaCerrado(l) && !l.noContactar && l.autorizaContacto && l.proximaFecha && l.proximaFecha <= hoyISO)
    .sort((a, b) => a.proximaFecha.localeCompare(b.proximaFecha));
}

/** Métricas del embudo: cantidad por etapa, conversión y motivos de pérdida. */
export function metricasEmbudo(leads) {
  const porEtapa = Object.fromEntries(ETAPA_IDS.map((id) => [id, 0]));
  const motivos = {};
  for (const l of leads) {
    porEtapa[l.etapa] = (porEtapa[l.etapa] || 0) + 1;
    if (l.etapa === 'perdido') motivos[l.motivoPerdida] = (motivos[l.motivoPerdida] || 0) + 1;
  }
  const cerrados = porEtapa.ganado + porEtapa.perdido;
  return {
    total: leads.length,
    porEtapa,
    motivosPerdida: motivos,
    conversion: cerrados ? porEtapa.ganado / cerrados : null
  };
}
