// Garantías de ConectaOCTG: vigencia, elegibilidad, plazos de respuesta y soluciones.
// Los parámetros vienen de la configuración (política informada por la gerencia el 2026-10-11).

export const POLITICA_BASE = {
  garantiaMesesNuevo: 12,
  garantiaMesesUsado: 6,
  garantiaMesesReacondicionado: null, // no definido por la gerencia: confirmar
  garantiaDiasRespuesta: 3,           // días calendario (interpretación a confirmar)
  garantiaDiasProveedor: 60           // "dos meses" cuando el equipo nuevo tiene garantía directa con proveedor
};

// Causas que la política NO cubre (no son defectos de fábrica).
export const CAUSAS = {
  fabrica: 'Falla o defecto de fábrica verificable',
  golpe: 'Golpe, caída o presión',
  liquido: 'Contacto con líquido',
  manipulacion: 'Abierto o reparado por terceros',
  software: 'Modificación de software no autorizada',
  desconocida: 'Aún no se sabe (requiere diagnóstico)'
};

export const SOLUCIONES = {
  reparacion: 'Reparación sin costo',
  cambio: 'Cambio por equipo de igual o mayor valor',
  devolucion: 'Devolución del dinero',
  rechazada: 'No procede (no es defecto de fábrica)'
};

/** Suma meses a una fecha ISO; si el día no existe en el mes destino usa el último día. */
export function sumarMeses(fechaISO, meses) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const total = (m - 1) + meses;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ny, nm, Math.min(d, ultimo))).toISOString().slice(0, 10);
}

export function sumarDias(fechaISO, dias) {
  return new Date(Date.parse(fechaISO + 'T00:00:00Z') + dias * 86400000).toISOString().slice(0, 10);
}

export function diasEntre(desdeISO, hastaISO) {
  return Math.round((Date.parse(hastaISO + 'T00:00:00Z') - Date.parse(desdeISO + 'T00:00:00Z')) / 86400000);
}

const fechaValida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || '') && !Number.isNaN(Date.parse(f));

/** Meses de garantía según la condición del equipo y la política. null = no definido. */
export function mesesGarantia(condicion, politica = POLITICA_BASE) {
  return { nuevo: politica.garantiaMesesNuevo, usado: politica.garantiaMesesUsado, reacondicionado: politica.garantiaMesesReacondicionado }[condicion] ?? null;
}

/**
 * Evalúa una solicitud de garantía.
 * @returns {{ok, errors, vigente, vence, diasRestantes, elegible, motivo, plazoRespuestaDias, limiteRespuesta, avisos}}
 */
export function evaluarGarantia({ condicion, fechaCompra, fechaSolicitud, causa = 'desconocida', proveedorDirecto = false }, politica = POLITICA_BASE) {
  const errors = [];
  if (!['nuevo', 'usado', 'reacondicionado'].includes(condicion)) errors.push('Indica si el equipo se vendió nuevo, usado o reacondicionado.');
  if (!fechaValida(fechaCompra)) errors.push('Indica la fecha de compra (está en la factura).');
  if (!fechaValida(fechaSolicitud)) errors.push('Fecha de solicitud no válida.');
  if (!CAUSAS[causa]) errors.push('Causa no válida.');
  if (!errors.length && fechaCompra > fechaSolicitud) errors.push('La fecha de compra no puede ser posterior a hoy.');
  if (errors.length) return { ok: false, errors };

  const avisos = [];
  const meses = mesesGarantia(condicion, politica);
  if (meses == null) {
    return { ok: true, errors, vigente: null, vence: null, diasRestantes: null, elegible: null,
      motivo: 'La gerencia no ha definido la garantía para equipos de esta condición. Consulta antes de responder al cliente.', avisos };
  }
  const vence = sumarMeses(fechaCompra, meses);
  const vigente = fechaSolicitud <= vence;
  const diasRestantes = diasEntre(fechaSolicitud, vence);

  const usaProveedor = proveedorDirecto && condicion === 'nuevo';
  if (proveedorDirecto && condicion !== 'nuevo') avisos.push('La garantía directa con proveedor solo aplica a equipos nuevos según la política.');
  const plazoRespuestaDias = usaProveedor ? politica.garantiaDiasProveedor : politica.garantiaDiasRespuesta;
  if (usaProveedor) avisos.push('Proceso con proveedor: informa al cliente el plazo por escrito y mantenlo al tanto del avance.');

  let elegible;
  let motivo;
  if (!vigente) { elegible = false; motivo = `La garantía venció el ${vence}. Se puede ofrecer reparación con costo.`; }
  else if (causa === 'fabrica') { elegible = true; motivo = 'Dentro del término y con falla de fábrica: procede la garantía, una vez el técnico la verifique.'; }
  else if (causa === 'desconocida') { elegible = null; motivo = 'Dentro del término. El técnico debe verificar si es defecto de fábrica antes de decidir.'; }
  else { elegible = false; motivo = `${CAUSAS[causa]} no es un defecto de fábrica: no está cubierto por la garantía. Debe quedar sustentado por el técnico y explicado al cliente.`; }

  return { ok: true, errors, vigente, vence, diasRestantes, elegible, motivo, plazoRespuestaDias, limiteRespuesta: sumarDias(fechaSolicitud, plazoRespuestaDias), avisos };
}

/** Estado del plazo de respuesta: a tiempo, vence hoy o vencido. */
export function estadoPlazo(limiteRespuesta, hoyISO, respondidoISO = null) {
  if (!limiteRespuesta) return null;
  const ref = respondidoISO || hoyISO;
  const d = diasEntre(ref, limiteRespuesta);
  if (respondidoISO) return d >= 0 ? 'cumplido' : 'incumplido';
  if (d < 0) return 'vencido';
  if (d === 0) return 'vence_hoy';
  return 'a_tiempo';
}

/**
 * Valida la solución dada a una garantía.
 * Para cambio: el equipo nuevo debe valer igual o más; el cliente paga solo el excedente.
 * Para devolución o cambio debe constar que la falla no es reparable.
 */
export function resolverGarantia({ tipo, valorPagado, valorEquipoNuevo, reparable, motivo = '' }) {
  const errors = [];
  if (!SOLUCIONES[tipo]) errors.push('Elige una solución.');
  const monto = (v) => Number.isInteger(v) && v > 0;
  if (tipo === 'cambio' || tipo === 'devolucion') {
    if (reparable !== false) errors.push('El cambio o la devolución aplican cuando el técnico determinó que la falla no es reparable.');
    if (!monto(valorPagado)) errors.push('Indica el valor que pagó el cliente (según factura).');
  }
  if (tipo === 'cambio') {
    if (!monto(valorEquipoNuevo)) errors.push('Indica el valor del equipo que se lleva el cliente.');
    else if (monto(valorPagado) && valorEquipoNuevo < valorPagado) errors.push('Según la política, el cambio es por un equipo de igual o mayor valor.');
  }
  if (tipo === 'reparacion' && reparable === false) errors.push('Si la falla no es reparable, las opciones son cambio o devolución.');
  if (tipo === 'rechazada' && String(motivo).trim().length < 10) errors.push('Explica por qué no procede (qué prueba hizo el técnico).');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors,
    tipo,
    excedente: tipo === 'cambio' ? valorEquipoNuevo - valorPagado : 0,
    devolver: tipo === 'devolucion' ? valorPagado : 0
  };
}
