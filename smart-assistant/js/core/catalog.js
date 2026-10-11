// Catálogo de equipos: validación, vigencia de la información, comparación y recomendación.
// Ningún precio, especificación o disponibilidad viene de este código: todo lo carga la administración.
import { MAX_COP } from './money.js';

export const CONDICIONES = {
  nuevo: 'Nuevo',
  reacondicionado: 'Reacondicionado',
  usado: 'Usado'
};

export const DIAS_VIGENCIA_PRECIO = 7; // después de esto el precio se marca "por confirmar"

export const USOS = {
  fotos: 'Fotos y video',
  redes: 'Redes sociales y mensajería',
  trabajo: 'Trabajo',
  juegos: 'Juegos',
  basico: 'Uso básico'
};

/** Valida un equipo del catálogo. Exige fuente, fecha y responsable del dato. */
export function validarEquipo(input) {
  const errors = [];
  const modelo = String(input.modelo || '').trim();
  if (!/^iphone\b/i.test(modelo)) errors.push('El modelo debe empezar por "iPhone".');
  if (!Number.isInteger(input.capacidadGB) || input.capacidadGB <= 0) errors.push('Indica la capacidad en GB.');
  if (!CONDICIONES[input.condicion]) errors.push('Indica la condición: nuevo, reacondicionado o usado.');
  if (!Number.isInteger(input.precio) || input.precio <= 0 || input.precio > MAX_COP) errors.push('El precio debe ser un valor en pesos mayor que cero.');
  if (input.costo != null && (!Number.isInteger(input.costo) || input.costo < 0)) errors.push('El costo debe ser un valor en pesos.');
  if (!Number.isInteger(input.stock) || input.stock < 0) errors.push('El inventario debe ser un número entero igual o mayor que cero.');
  if (input.condicion !== 'nuevo') {
    if (input.saludBateria != null && (!Number.isInteger(input.saludBateria) || input.saludBateria < 1 || input.saludBateria > 100)) {
      errors.push('La salud de batería debe estar entre 1 y 100.');
    }
  }
  if (!String(input.fuente || '').trim()) errors.push('Indica la fuente del precio y la disponibilidad.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.actualizado || '')) errors.push('Indica la fecha de actualización.');
  if (!String(input.responsable || '').trim()) errors.push('Indica el responsable de la información.');
  return { ok: errors.length === 0, errors };
}

/** Estado de la información de precio/stock según su fecha. */
export function vigencia(equipo, hoyISO) {
  if (equipo.demo) return { estado: 'demo', texto: 'Dato ficticio de demostración' };
  if (!equipo.actualizado) return { estado: 'desconocido', texto: 'Sin fecha: confirmar' };
  const dias = Math.floor((Date.parse(hoyISO) - Date.parse(equipo.actualizado)) / 86400000);
  if (dias > DIAS_VIGENCIA_PRECIO) return { estado: 'vencido', texto: `Actualizado hace ${dias} días: confirmar antes de ofrecer` };
  return { estado: 'vigente', texto: `Verificado ${dias === 0 ? 'hoy' : `hace ${dias} día(s)`}` };
}

/** Diferencias entre equipos para la tabla comparativa (solo campos con datos). */
export function comparar(equipos) {
  const campos = [
    ['modelo', 'Modelo'], ['capacidadGB', 'Capacidad (GB)'], ['condicion', 'Condición'], ['color', 'Color'],
    ['precio', 'Precio de contado'], ['saludBateria', 'Salud de batería (%)'], ['garantiaMeses', 'Garantía (meses)'],
    ['stock', 'Unidades disponibles'], ['notas', 'Características / estado']
  ];
  return campos
    .filter(([k]) => equipos.some((e) => e[k] != null && e[k] !== ''))
    .map(([k, nombre]) => ({ campo: k, nombre, valores: equipos.map((e) => e[k] ?? null), distinto: new Set(equipos.map((e) => String(e[k] ?? ''))).size > 1 }));
}

/**
 * Recomienda hasta 3 equipos con stock según presupuesto, usos, capacidad mínima y condición aceptada.
 * Explica por qué se recomienda cada uno. No sugiere equipos sin stock.
 */
export function recomendar(catalogo, { presupuesto, usos = [], capacidadMinGB = 0, condiciones = Object.keys(CONDICIONES) }, hoyISO) {
  const candidatos = catalogo.filter((e) => e.stock > 0 && e.capacidadGB >= capacidadMinGB && condiciones.includes(e.condicion));
  const dentro = presupuesto ? candidatos.filter((e) => e.precio <= presupuesto) : candidatos;
  const puntuados = dentro.map((e) => {
    const razones = [];
    let score = 0;
    const etiquetas = e.usos || [];
    const coincide = usos.filter((u) => etiquetas.includes(u));
    if (coincide.length) { score += coincide.length * 3; razones.push('Encaja con: ' + coincide.map((u) => USOS[u]).join(', ')); }
    if (presupuesto) {
      const uso = e.precio / presupuesto; // aprovechar el presupuesto sin pasarse
      score += uso * 2;
      razones.push('Dentro del presupuesto');
    }
    if (e.condicion !== 'nuevo' && e.saludBateria) razones.push(`Batería al ${e.saludBateria} %`);
    const v = vigencia(e, hoyISO);
    if (v.estado !== 'vigente') razones.push('⚠ ' + v.texto);
    return { equipo: e, score, razones };
  });
  puntuados.sort((a, b) => b.score - a.score || a.equipo.precio - b.equipo.precio);
  const top = puntuados.slice(0, 3);
  let alternativa = null;
  if (!top.length && presupuesto) {
    const masBarato = candidatos.slice().sort((a, b) => a.precio - b.precio)[0];
    if (masBarato) alternativa = { equipo: masBarato, diferencia: masBarato.precio - presupuesto };
  }
  return { recomendaciones: top, alternativa };
}
