// Dinero en pesos colombianos (COP).
// Los valores se manejan como ENTEROS de pesos para evitar errores de coma flotante
// al sumar. Los cálculos intermedios con tasas usan número de punto flotante y se
// redondean al peso al final de cada paso (ver finance.js).

export const MAX_COP = 10_000_000_000; // tope de validación: 10 mil millones

/** Redondeo al peso más cercano (mitad hacia arriba, simétrico para negativos). */
export function roundPeso(x) {
  if (!Number.isFinite(x)) throw new RangeError('Valor no numérico');
  return Math.sign(x) * Math.round(Math.abs(x));
}

/** Agrupa miles con punto: 1800000 -> "1.800.000". */
function groupThousands(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formato colombiano: $ 1.800.000 COP. No depende de la configuración regional del navegador. */
export function formatCOP(value, { suffix = true } = {}) {
  const n = roundPeso(Number(value));
  const s = '$ ' + groupThousands(String(Math.abs(n)));
  return (n < 0 ? '-' : '') + s + (suffix ? ' COP' : '');
}

/**
 * Convierte texto escrito por una persona a pesos enteros.
 * Acepta: "1800000", "1.800.000", "$ 1.800.000 COP", "1.800.000,50".
 * Devuelve null si el texto no es un monto válido.
 */
export function parseCOP(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? roundPeso(text) : null;
  if (typeof text !== 'string') return null;
  let t = text.trim().replace(/cop/i, '').replace(/\$/g, '').replace(/\s/g, '');
  if (!t) return null;
  const neg = t.startsWith('-');
  if (neg) t = t.slice(1);
  // Formato colombiano: punto = miles, coma = decimales
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return null;
  const [ent, dec = ''] = t.split(',');
  const num = Number(ent.replace(/\./g, '') + (dec ? '.' + dec : ''));
  if (!Number.isFinite(num) || num > MAX_COP) return null;
  return roundPeso(neg ? -num : num);
}

/** Porcentaje con coma decimal: 0.0215 -> "2,15 %". */
export function formatPct(fraction, decimals = 2) {
  if (!Number.isFinite(fraction)) return '—';
  return (fraction * 100).toFixed(decimals).replace('.', ',') + ' %';
}

/** Lee un porcentaje escrito por una persona ("2,5", "2.5", "2,5 %") y lo devuelve como fracción (0.025). */
export function parsePct(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text / 100 : null;
  if (typeof text !== 'string') return null;
  const t = text.trim().replace('%', '').replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t) / 100;
}
