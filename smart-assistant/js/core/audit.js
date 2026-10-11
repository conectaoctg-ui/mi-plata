// Registro de auditoría: quién hizo qué y cuándo, SIN guardar valores sensibles.

const CAMPOS_PROHIBIDOS = /clave|contrase|password|hash|sal|telefono|cedula|documento|token/i;

export function entradaAuditoria({ usuario, accion, entidad, entidadId = '', detalle = {} }, ahoraISO) {
  // Solo se conservan detalles no sensibles y de tipo simple.
  const limpio = {};
  for (const [k, v] of Object.entries(detalle)) {
    if (CAMPOS_PROHIBIDOS.test(k)) continue;
    if (['string', 'number', 'boolean'].includes(typeof v)) limpio[k] = typeof v === 'string' ? v.slice(0, 80) : v;
  }
  return {
    fecha: ahoraISO,
    usuarioId: usuario?.id || 'sistema',
    usuarioNombre: usuario?.nombre || 'Sistema',
    accion,
    entidad,
    entidadId: String(entidadId),
    detalle: limpio
  };
}

export const MAX_AUDITORIA = 2000; // en modo local se conservan las últimas N entradas
