// Simulador EDUCATIVO de financiación y calculadora de márgenes.
// IMPORTANTE: nada de este archivo representa una oferta de E-Credit. Las tasas,
// cargos y plazos los escribe la persona usuaria o la administración, con su fuente.

import { roundPeso, MAX_COP } from './money.js';

export const ETIQUETA_SIMULACION = 'SIMULACIÓN EDUCATIVA · No es una oferta de E-Credit ni de ninguna entidad';

/** Tasa efectiva anual -> tasa mensual vencida equivalente. */
export function eaToMonthly(ea) {
  return Math.pow(1 + ea, 1 / 12) - 1;
}

/** Tasa mensual vencida -> efectiva anual equivalente. */
export function monthlyToEa(mv) {
  return Math.pow(1 + mv, 12) - 1;
}

/** Cuota fija (sistema francés) sin redondear. */
export function cuotaFija(saldo, tasaMensual, n) {
  if (tasaMensual === 0) return saldo / n;
  return (saldo * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -n));
}

const esEntero = (v) => Number.isInteger(v);

/**
 * Simula un crédito de cuota fija mensual.
 * @param {object} p
 * @param {number} p.precio          precio de contado en COP (entero)
 * @param {number} p.cuotaInicial    COP (entero, >= 0)
 * @param {number} p.tasa            fracción (0.02 = 2 %)
 * @param {'EA'|'MV'} p.tipoTasa     efectiva anual o mensual vencida
 * @param {number} p.plazoMeses      entero 1..120
 * @param {number} [p.cargoInicial]  cargos cobrados al inicio (estudio, etc.) COP
 * @param {number} [p.cargoMensual]  cargos fijos sumados a cada cuota (seguro, etc.) COP
 * @param {number} [p.tasaUsuraEA]   tope legal vigente ingresado por administración (fracción EA)
 */
export function simularCredito(p) {
  const errors = [];
  const warnings = [];
  const {
    precio, cuotaInicial = 0, tasa, tipoTasa = 'EA', plazoMeses,
    cargoInicial = 0, cargoMensual = 0, tasaUsuraEA = null
  } = p || {};

  const montoValido = (v) => esEntero(v) && v >= 0 && v <= MAX_COP;
  if (!montoValido(precio) || precio <= 0) errors.push('El precio de contado debe ser un valor en pesos mayor que cero.');
  if (!montoValido(cuotaInicial)) errors.push('La cuota inicial debe ser un valor en pesos igual o mayor que cero.');
  if (!montoValido(cargoInicial)) errors.push('Los cargos iniciales deben ser un valor en pesos igual o mayor que cero.');
  if (!montoValido(cargoMensual)) errors.push('Los cargos mensuales deben ser un valor en pesos igual o mayor que cero.');
  if (!esEntero(plazoMeses) || plazoMeses < 1 || plazoMeses > 120) errors.push('El plazo debe ser un número entero de meses entre 1 y 120.');
  if (!['EA', 'MV'].includes(tipoTasa)) errors.push('Indica si la tasa es efectiva anual (EA) o mensual vencida (MV).');
  if (!Number.isFinite(tasa) || tasa < 0) errors.push('La tasa debe ser un número igual o mayor que cero.');
  else if ((tipoTasa === 'EA' && tasa > 3) || (tipoTasa === 'MV' && tasa > 0.15)) errors.push('La tasa ingresada es demasiado alta. Revisa que esté bien escrita.');
  if (errors.length === 0 && cuotaInicial >= precio) errors.push('La cuota inicial no puede ser igual o mayor que el precio: no habría saldo para financiar.');
  if (errors.length) return { ok: false, errors, warnings, etiqueta: ETIQUETA_SIMULACION };

  const tasaMensual = tipoTasa === 'EA' ? eaToMonthly(tasa) : tasa;
  const tasaEA = tipoTasa === 'EA' ? tasa : monthlyToEa(tasa);

  if (Number.isFinite(tasaUsuraEA) && tasaUsuraEA > 0 && tasaEA > tasaUsuraEA) {
    warnings.push('La tasa efectiva anual supera la tasa de usura registrada por la administración. Verifica los datos.');
  }
  if (!Number.isFinite(tasaUsuraEA)) {
    warnings.push('No hay tasa de usura vigente registrada por la administración: no se pudo comparar contra el tope legal.');
  }

  const saldoFinanciado = precio - cuotaInicial;
  const base = roundPeso(cuotaFija(saldoFinanciado, tasaMensual, plazoMeses));
  const tabla = [];
  let saldo = saldoFinanciado;
  let totalIntereses = 0;
  for (let n = 1; n <= plazoMeses; n++) {
    const interes = roundPeso(saldo * tasaMensual);
    // La última cuota ajusta el redondeo para que el capital pagado sea exacto.
    const abonoCapital = n === plazoMeses ? saldo : Math.min(saldo, base - interes);
    const cuotaBase = abonoCapital + interes;
    tabla.push({
      n,
      saldoInicial: saldo,
      interes,
      abonoCapital,
      cargo: cargoMensual,
      cuota: cuotaBase + cargoMensual,
      saldoFinal: saldo - abonoCapital
    });
    saldo -= abonoCapital;
    totalIntereses += interes;
  }

  const totalCargos = cargoInicial + cargoMensual * plazoMeses;
  const totalCuotas = tabla.reduce((s, f) => s + f.cuota, 0);
  return {
    ok: true,
    errors,
    warnings,
    etiqueta: ETIQUETA_SIMULACION,
    resumen: {
      precio,
      cuotaInicial,
      saldoFinanciado,
      tasaMensual,
      tasaEA,
      plazoMeses,
      cuotaPeriodica: base + cargoMensual,
      cuotaSinCargos: base,
      totalIntereses,
      totalCargos,
      // Lo que paga el cliente en total: inicial + todas las cuotas + cargos iniciales
      totalPagado: cuotaInicial + totalCuotas + cargoInicial,
      costoFinanciacion: totalIntereses + totalCargos
    },
    tabla
  };
}

/**
 * Margen de una venta con datos autorizados.
 * @param {object} p
 * @param {number} p.precioLista   COP
 * @param {number} p.costo         COP
 * @param {number} [p.descuento]   COP
 */
export function calcularMargen({ precioLista, costo, descuento = 0 }) {
  const errors = [];
  const ok = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_COP;
  if (!ok(precioLista) || precioLista === 0) errors.push('El precio de lista debe ser mayor que cero.');
  if (!ok(costo)) errors.push('El costo debe ser un valor en pesos igual o mayor que cero.');
  if (!ok(descuento)) errors.push('El descuento debe ser un valor en pesos igual o mayor que cero.');
  if (!errors.length && descuento >= precioLista) errors.push('El descuento no puede ser igual o mayor que el precio.');
  if (errors.length) return { ok: false, errors };
  const precioVenta = precioLista - descuento;
  const utilidad = precioVenta - costo;
  return {
    ok: true,
    errors,
    precioVenta,
    utilidad,
    margenSobreVenta: utilidad / precioVenta,
    descuentoPct: descuento / precioLista,
    perdida: utilidad < 0
  };
}

/** Descuento máximo (COP, entero) que conserva un margen mínimo sobre el precio de venta. */
export function descuentoMaximo({ precioLista, costo, margenMinimo }) {
  if (!(margenMinimo >= 0 && margenMinimo < 1)) return 0;
  // precioVenta mínimo tal que (pv - costo)/pv >= m  =>  pv >= costo / (1 - m)
  const pvMin = Math.ceil(costo / (1 - margenMinimo));
  return Math.max(0, precioLista - pvMin);
}
