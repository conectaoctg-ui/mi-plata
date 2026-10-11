// Academia: lecciones, evaluaciones con retroalimentación, progreso y asignaciones.

export const APROBACION = 0.8;

export const AREAS = {
  general: 'General',
  ventas: 'Ventas iPhone',
  clientes: 'Atención y clientes',
  financiacion: 'Financiación E-Credit',
  tecnico: 'Servicio técnico'
};

export const NIVELES = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };

/** Lecciones que corresponden a un rol (admin y supervisor ven todas). */
export function leccionesParaRol(lecciones, rol) {
  if (rol === 'admin' || rol === 'supervisor') return lecciones;
  return lecciones.filter((l) => !l.roles || l.roles.includes(rol));
}

/** Califica un quiz y explica cada error. respuestas: array de índices elegidos. */
export function calificarQuiz(leccion, respuestas) {
  const preguntas = leccion.quiz || [];
  if (!preguntas.length) return { ok: false, error: 'Esta lección no tiene evaluación.' };
  if (!Array.isArray(respuestas) || respuestas.length !== preguntas.length) {
    return { ok: false, error: 'Responde todas las preguntas.' };
  }
  const detalle = preguntas.map((q, i) => {
    const elegida = respuestas[i];
    const correcta = elegida === q.r;
    return {
      pregunta: q.p,
      elegida: q.o[elegida] ?? '(sin respuesta)',
      respuestaCorrecta: q.o[q.r],
      correcta,
      explicacion: q.explica || ''
    };
  });
  const correctas = detalle.filter((d) => d.correcta).length;
  const nota = correctas / preguntas.length;
  return { ok: true, correctas, total: preguntas.length, nota, aprobado: nota >= APROBACION, detalle };
}

/** Registra un intento sobre el progreso existente (inmutable). */
export function registrarIntento(progreso = {}, leccionId, resultado, fechaISO) {
  const prev = progreso[leccionId] || { intentos: 0, mejorNota: 0 };
  return {
    ...progreso,
    [leccionId]: {
      ...prev,
      leida: true,
      intentos: prev.intentos + 1,
      mejorNota: Math.max(prev.mejorNota || 0, resultado.nota),
      ultimaNota: resultado.nota,
      ultimoIntento: fechaISO,
      aprobadaEn: prev.aprobadaEn || (resultado.aprobado ? fechaISO : null)
    }
  };
}

/** Resumen del avance de una persona sobre sus lecciones. */
export function resumenProgreso(lecciones, progreso = {}) {
  const total = lecciones.length;
  const aprobadas = lecciones.filter((l) => (progreso[l.id]?.mejorNota || 0) >= APROBACION);
  const pendientes = lecciones.filter((l) => (progreso[l.id]?.mejorNota || 0) < APROBACION);
  const notas = lecciones.map((l) => progreso[l.id]?.mejorNota).filter((n) => typeof n === 'number');
  return {
    total,
    aprobadas: aprobadas.length,
    pendientes,
    avance: total ? aprobadas.length / total : 0,
    promedio: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null
  };
}

/** Estado de una asignación según el progreso y la fecha límite. */
export function estadoAsignacion(asignacion, progreso = {}, hoyISO) {
  const p = progreso[asignacion.leccionId];
  if (p && p.mejorNota >= APROBACION) return 'completada';
  if (asignacion.fechaLimite && asignacion.fechaLimite < hoyISO) return 'vencida';
  return p ? 'en_curso' : 'pendiente';
}

/** Días transcurridos desde el ingreso hasta aprobar todo lo asignado (métrica de tiempo de capacitación). */
export function diasHastaCompletar(fechaIngresoISO, lecciones, progreso = {}) {
  const fechas = lecciones.map((l) => progreso[l.id]?.aprobadaEn);
  if (!lecciones.length || fechas.some((f) => !f)) return null;
  const fin = fechas.sort().at(-1);
  return Math.round((Date.parse(fin) - Date.parse(fechaIngresoISO)) / 86400000);
}
