// Casos de servicio técnico: estados, reglas de transición y control de calidad.
import { can } from './permissions.js';

export const ESTADOS = {
  recibido: 'Recibido',
  diagnostico: 'En diagnóstico',
  escalado: 'Escalado a técnico autorizado',
  cotizado: 'Cotizado (esperando respuesta del cliente)',
  reparacion: 'En reparación',
  calidad: 'Control de calidad',
  listo: 'Listo para entregar',
  entregado: 'Entregado',
  cancelado: 'Cancelado / devuelto sin reparar'
};

const TRANSICIONES = {
  recibido: ['diagnostico', 'escalado', 'cancelado'],
  diagnostico: ['cotizado', 'escalado', 'cancelado'],
  escalado: ['diagnostico', 'cotizado', 'cancelado'],
  cotizado: ['reparacion', 'cancelado'],
  reparacion: ['calidad', 'escalado'],
  calidad: ['listo', 'reparacion'],
  listo: ['entregado'],
  entregado: [],
  cancelado: []
};

export const CONTROLES_CALIDAD = [
  'Pantalla y táctil en todos los bordes',
  'Face ID / Touch ID',
  'Cámara trasera (foto y video) y flash',
  'Cámara frontal',
  'Auricular, altavoz y micrófono en llamada',
  'Carga por cable',
  'Señal, WiFi y Bluetooth',
  'Botones físicos',
  'Sensor de proximidad',
  'Sin avisos nuevos en Ajustes (piezas / batería)',
  'Tornillos y adhesivo correctamente instalados',
  'Equipo limpio'
];

// Tipos de hallazgo: se separa lo que dice el cliente, lo que se sospecha y lo confirmado.
export const TIPOS_HALLAZGO = {
  sintoma: 'Síntoma reportado',
  probable: 'Causa probable (sin confirmar)',
  confirmada: 'Falla confirmada'
};

export function transicionesPosibles(estado) {
  return TRANSICIONES[estado] || [];
}

/** Detecta si un texto parece contener una contraseña o código (no deben registrarse). */
export function pareceDatoSensible(texto) {
  return /(contrase(ñ|n)a|clave|password|passcode|c(ó|o)digo( de desbloqueo| de verificaci(ó|o)n)?|pin|apple ?id)\s*[:=]?\s*\S+/i.test(String(texto || ''))
    && /\d{4,}|[:=]/.test(String(texto || ''));
}

/** Valida los datos de recepción de un caso. */
export function validarCaso(input) {
  const errors = [];
  const modelo = String(input.modelo || '').trim();
  const sintomas = String(input.sintomas || '').trim();
  if (!/iphone/i.test(modelo)) errors.push('Escribe el modelo del iPhone (por ejemplo: iPhone 13 Pro). Solo atendemos iPhone.');
  if (sintomas.length < 5) errors.push('Describe el síntoma con las palabras del cliente.');
  for (const [campo, valor] of Object.entries(input)) {
    if (typeof valor === 'string' && pareceDatoSensible(valor)) {
      errors.push(`El campo "${campo}" parece tener una contraseña o código. No se deben registrar contraseñas ni códigos del cliente.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    value: {
      modelo: modelo.slice(0, 60),
      sintomas: sintomas.slice(0, 500),
      antecedentes: String(input.antecedentes || '').trim().slice(0, 500),
      pruebas: String(input.pruebas || '').trim().slice(0, 500),
      estadoFisico: String(input.estadoFisico || '').trim().slice(0, 500),
      humedad: ['normal', 'activado', 'no_revisado'].includes(input.humedad) ? input.humedad : 'no_revisado'
    }
  };
}

/** Agrega un hallazgo respetando quién puede confirmar fallas. */
export function agregarHallazgo(caso, user, { tipo, texto, evidencia = '' }) {
  if (!TIPOS_HALLAZGO[tipo]) return { ok: false, error: 'Tipo de hallazgo no válido.' };
  if (!String(texto || '').trim()) return { ok: false, error: 'Describe el hallazgo.' };
  if (tipo === 'confirmada') {
    if (!can(user, 'tecnico.confirmarFalla')) return { ok: false, error: 'Solo un técnico puede marcar una falla como confirmada.' };
    if (String(evidencia).trim().length < 5) return { ok: false, error: 'Para confirmar una falla, describe la prueba o medición que la confirma.' };
  }
  const hallazgo = { tipo, texto: String(texto).trim().slice(0, 300), evidencia: String(evidencia).trim().slice(0, 300), por: user.id, fecha: new Date().toISOString() };
  return { ok: true, caso: { ...caso, hallazgos: [...(caso.hallazgos || []), hallazgo] } };
}

/** Cambia el estado del caso validando la transición y las reglas de calidad. */
export function cambiarEstado(caso, user, nuevo) {
  if (!transicionesPosibles(caso.estado).includes(nuevo)) {
    return { ok: false, error: `No se puede pasar de "${ESTADOS[caso.estado]}" a "${ESTADOS[nuevo] || nuevo}".` };
  }
  if (['reparacion', 'calidad', 'listo'].includes(nuevo) && !can(user, 'tecnico.diagnosticar')) {
    return { ok: false, error: 'Este cambio de estado lo hace un técnico.' };
  }
  if (nuevo === 'reparacion' && !(caso.hallazgos || []).some((h) => h.tipo === 'confirmada')) {
    return { ok: false, error: 'Antes de reparar debe existir al menos una falla confirmada por un técnico.' };
  }
  if (nuevo === 'reparacion' && !caso.clienteAprobo) {
    return { ok: false, error: 'Registra que el cliente aprobó la cotización antes de reparar.' };
  }
  if (nuevo === 'listo') {
    const qc = caso.calidad || {};
    const pendientes = CONTROLES_CALIDAD.filter((c) => !['ok', 'na'].includes(qc[c]));
    if (pendientes.length) return { ok: false, error: `Faltan ${pendientes.length} controles de calidad por aprobar.`, pendientes };
  }
  if (nuevo === 'entregado' && !can(user, 'tecnico.entregar')) {
    return { ok: false, error: 'La entrega la registra un técnico o el administrador.' };
  }
  const historial = [...(caso.historial || []), { de: caso.estado, a: nuevo, por: user.id, fecha: new Date().toISOString() }];
  return { ok: true, caso: { ...caso, estado: nuevo, historial } };
}
