import { test } from 'node:test';
import assert from 'node:assert/strict';

import { formatCOP, parseCOP, roundPeso, formatPct, parsePct } from '../js/core/money.js';
import { simularCredito, eaToMonthly, monthlyToEa, calcularMargen, descuentoMaximo, ETIQUETA_SIMULACION } from '../js/core/finance.js';
import { can, assertCan, PERMISOS, ROLES, PermissionError } from '../js/core/permissions.js';
import { validarLead, aplicarNoContactar, seguimientosPendientes, metricasEmbudo } from '../js/core/crm.js';
import { validarCaso, agregarHallazgo, cambiarEstado, CONTROLES_CALIDAD, pareceDatoSensible } from '../js/core/service.js';
import { buscar, normalizar } from '../js/core/search.js';
import { calificarQuiz, registrarIntento, resumenProgreso, estadoAsignacion, leccionesParaRol, diasHastaCompletar } from '../js/core/academy.js';
import * as rp from '../js/core/roleplay.js';
import { validarEquipo, vigencia, recomendar, comparar } from '../js/core/catalog.js';
import { hashClave, verificarClave, validarClave, registrarFallo, estaBloqueado, MAX_INTENTOS, sesionVigente, SESION_INACTIVA_MS } from '../js/core/auth.js';
import { entradaAuditoria } from '../js/core/audit.js';

const u = (rol, extra = {}) => ({ id: 'u-' + rol, nombre: rol, rol, activo: true, ...extra });

// ---------------- Dinero ----------------
test('formatCOP usa formato colombiano', () => {
  assert.equal(formatCOP(1800000), '$ 1.800.000 COP');
  assert.equal(formatCOP(0), '$ 0 COP');
  assert.equal(formatCOP(999), '$ 999 COP');
  assert.equal(formatCOP(1000), '$ 1.000 COP');
  assert.equal(formatCOP(-25000), '-$ 25.000 COP');
  assert.equal(formatCOP(1234567.5), '$ 1.234.568 COP');
  assert.equal(formatCOP(1500, { suffix: false }), '$ 1.500');
});

test('parseCOP acepta formatos comunes y rechaza basura', () => {
  assert.equal(parseCOP('1800000'), 1800000);
  assert.equal(parseCOP('1.800.000'), 1800000);
  assert.equal(parseCOP('$ 1.800.000 COP'), 1800000);
  assert.equal(parseCOP('1.800.000,60'), 1800001);
  assert.equal(parseCOP(''), null);
  assert.equal(parseCOP('abc'), null);
  assert.equal(parseCOP('1,800,000'), null); // formato EE. UU. no se acepta para evitar confusiones
  assert.equal(parseCOP('18.00.000'), null);
  assert.equal(parseCOP('99999999999999'), null);
});

test('roundPeso y porcentajes', () => {
  assert.equal(roundPeso(2.5), 3);
  assert.equal(roundPeso(-2.5), -3);
  assert.throws(() => roundPeso(NaN));
  assert.equal(formatPct(0.0215), '2,15 %');
  assert.equal(parsePct('2,5'), 0.025);
  assert.equal(parsePct('2.5 %'), 0.025);
  assert.equal(parsePct('x'), null);
});

// ---------------- Financiación ----------------
test('conversión de tasas EA <-> MV es consistente', () => {
  const mv = 0.02;
  const ea = monthlyToEa(mv);
  assert.ok(Math.abs(ea - 0.268241794562545) < 1e-12);
  assert.ok(Math.abs(eaToMonthly(ea) - mv) < 1e-12);
});

test('simulación francesa coincide con valor de referencia', () => {
  // 1.000.000 a 2 % MV, 12 meses: cuota = 94.559,60 -> 94.560
  const r = simularCredito({ precio: 1200000, cuotaInicial: 200000, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 12, tasaUsuraEA: 0.5 });
  assert.equal(r.ok, true);
  assert.equal(r.resumen.saldoFinanciado, 1000000);
  assert.equal(r.resumen.cuotaSinCargos, 94560);
  assert.equal(r.tabla.length, 12);
  // El capital abonado suma exactamente el saldo financiado
  assert.equal(r.tabla.reduce((s, f) => s + f.abonoCapital, 0), 1000000);
  assert.equal(r.tabla.at(-1).saldoFinal, 0);
  // Todos los valores son enteros (pesos)
  for (const f of r.tabla) for (const v of [f.interes, f.abonoCapital, f.cuota, f.saldoFinal]) assert.ok(Number.isInteger(v));
  // Intereses totales ~ 134.715 (12 * 94.559,6 - 1.000.000), tolerancia de redondeo de pocos pesos
  assert.ok(Math.abs(r.resumen.totalIntereses - 134715) <= 6, String(r.resumen.totalIntereses));
  assert.equal(r.resumen.totalPagado, 200000 + r.tabla.reduce((s, f) => s + f.cuota, 0));
  assert.equal(r.etiqueta, ETIQUETA_SIMULACION);
  assert.deepEqual(r.warnings, []);
});

test('tasa cero divide el saldo y cargos se suman aparte', () => {
  const r = simularCredito({ precio: 1000000, cuotaInicial: 0, tasa: 0, tipoTasa: 'EA', plazoMeses: 3, cargoMensual: 5000, cargoInicial: 20000, tasaUsuraEA: 0.3 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.tabla.map((f) => f.abonoCapital), [333333, 333333, 333334]);
  assert.equal(r.resumen.totalIntereses, 0);
  assert.equal(r.resumen.totalCargos, 35000);
  assert.equal(r.resumen.cuotaPeriodica, 338333);
  assert.equal(r.resumen.totalPagado, 1035000);
});

test('plazo de 1 mes y plazo máximo', () => {
  const r1 = simularCredito({ precio: 500000, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 1, tasaUsuraEA: 0.5 });
  assert.equal(r1.tabla[0].abonoCapital, 500000);
  assert.equal(r1.tabla[0].interes, 10000);
  const r120 = simularCredito({ precio: 5000000, tasa: 0.25, tipoTasa: 'EA', plazoMeses: 120, tasaUsuraEA: 0.5 });
  assert.equal(r120.ok, true);
  assert.equal(r120.tabla.at(-1).saldoFinal, 0);
  assert.ok(r120.tabla.every((f) => f.abonoCapital >= 0));
});

test('simulador rechaza entradas inválidas con mensajes claros', () => {
  const casos = [
    {},
    { precio: 0, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 12 },
    { precio: 1000.5, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 12 },
    { precio: 1000000, cuotaInicial: 1000000, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 12 },
    { precio: 1000000, tasa: -0.01, tipoTasa: 'MV', plazoMeses: 12 },
    { precio: 1000000, tasa: 0.5, tipoTasa: 'MV', plazoMeses: 12 },
    { precio: 1000000, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 0 },
    { precio: 1000000, tasa: 0.02, tipoTasa: 'MV', plazoMeses: 12.5 },
    { precio: 1000000, tasa: 0.02, tipoTasa: 'XX', plazoMeses: 12 },
    { precio: 1000000, tasa: NaN, tipoTasa: 'MV', plazoMeses: 12 }
  ];
  for (const c of casos) {
    const r = simularCredito(c);
    assert.equal(r.ok, false, JSON.stringify(c));
    assert.ok(r.errors.length > 0);
  }
});

test('simulador advierte por usura y por falta de tasa de usura', () => {
  const sobre = simularCredito({ precio: 1000000, tasa: 0.6, tipoTasa: 'EA', plazoMeses: 12, tasaUsuraEA: 0.3 });
  assert.ok(sobre.warnings.some((w) => /usura/.test(w)));
  const sinDato = simularCredito({ precio: 1000000, tasa: 0.2, tipoTasa: 'EA', plazoMeses: 12 });
  assert.ok(sinDato.warnings.some((w) => /No hay tasa de usura/.test(w)));
});

test('márgenes y descuento máximo', () => {
  const m = calcularMargen({ precioLista: 2000000, costo: 1600000, descuento: 100000 });
  assert.equal(m.ok, true);
  assert.equal(m.precioVenta, 1900000);
  assert.equal(m.utilidad, 300000);
  assert.ok(Math.abs(m.margenSobreVenta - 300000 / 1900000) < 1e-12);
  assert.equal(calcularMargen({ precioLista: 1000, costo: 2000 }).perdida, true);
  assert.equal(calcularMargen({ precioLista: 1000, costo: 10, descuento: 1000 }).ok, false);
  const max = descuentoMaximo({ precioLista: 2000000, costo: 1600000, margenMinimo: 0.1 });
  const conMax = calcularMargen({ precioLista: 2000000, costo: 1600000, descuento: max });
  assert.ok(conMax.margenSobreVenta >= 0.1);
  const pasado = calcularMargen({ precioLista: 2000000, costo: 1600000, descuento: max + 1 });
  assert.ok(pasado.margenSobreVenta < 0.1);
});

// ---------------- Permisos ----------------
test('matriz de permisos aplica mínimo privilegio', () => {
  assert.equal(can(u('vendedor'), 'catalogo.ver'), true);
  assert.equal(can(u('vendedor'), 'catalogo.verCosto'), false);
  assert.equal(can(u('vendedor'), 'catalogo.editar'), false);
  assert.equal(can(u('vendedor'), 'usuarios.gestionar'), false);
  assert.equal(can(u('vendedor'), 'tecnico.confirmarFalla'), false);
  assert.equal(can(u('tecnico'), 'clientes.verPropios'), false);
  assert.equal(can(u('tecnico'), 'financiacion.simular'), false);
  assert.equal(can(u('supervisor'), 'usuarios.gestionar'), false);
  assert.equal(can(u('supervisor'), 'academia.asignar'), true);
  assert.equal(can(u('admin'), 'usuarios.gestionar'), true);
  assert.equal(can(u('admin', { activo: false }), 'catalogo.ver'), false);
  assert.equal(can(null, 'catalogo.ver'), false);
  assert.equal(can(u('admin'), 'accion.inexistente'), false);
  assert.equal(can(u('hacker'), 'catalogo.ver'), false);
  assert.throws(() => assertCan(u('vendedor'), 'datos.respaldo'), PermissionError);
  // Toda acción referencia roles existentes
  for (const roles of Object.values(PERMISOS)) for (const r of roles) assert.ok(ROLES[r]);
});

// ---------------- Clientes ----------------
test('lead: datos mínimos y consentimiento', () => {
  assert.equal(validarLead({ nombre: 'A' }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana' }).ok, true);
  const sinAut = validarLead({ nombre: 'Ana', telefono: '3001234567' });
  assert.equal(sinAut.ok, false);
  assert.ok(sinAut.errors.some((e) => /1581/.test(e)));
  assert.equal(validarLead({ nombre: 'Ana', telefono: '300 123 4567', autorizaContacto: true }).value.telefono, '3001234567');
  assert.equal(validarLead({ nombre: 'Ana', telefono: '12', autorizaContacto: true }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana', proximaFecha: '2026-10-20' }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana', proximaFecha: '2026-10-20', autorizaContacto: true, noContactar: true }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana', etapa: 'perdido' }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana', etapa: 'perdido', motivoPerdida: 'Precio' }).ok, true);
  assert.equal(validarLead({ nombre: 'Ana', etapa: 'inventada' }).ok, false);
  assert.equal(validarLead({ nombre: 'Ana', telefono: '3001234567', autorizaContacto: true, noContactar: true }).ok, false);
});

test('no contactar borra seguimiento y teléfono', () => {
  const l = aplicarNoContactar({ nombre: 'Ana', telefono: '3001234567', proximaFecha: '2026-10-01', autorizaContacto: true, etapa: 'propuesta' });
  assert.equal(l.telefono, '');
  assert.equal(l.proximaFecha, '');
  assert.equal(seguimientosPendientes([l], '2026-12-31').length, 0);
});

test('seguimientos y métricas del embudo', () => {
  const leads = [
    { etapa: 'propuesta', autorizaContacto: true, proximaFecha: '2026-10-10' },
    { etapa: 'propuesta', autorizaContacto: true, proximaFecha: '2026-10-30' },
    { etapa: 'ganado', autorizaContacto: true, proximaFecha: '2026-10-01' },
    { etapa: 'perdido', motivoPerdida: 'Precio' },
    { etapa: 'perdido', motivoPerdida: 'Precio' },
    { etapa: 'ganado' }
  ];
  assert.equal(seguimientosPendientes(leads, '2026-10-11').length, 1);
  const m = metricasEmbudo(leads);
  assert.equal(m.total, 6);
  assert.equal(m.conversion, 0.5);
  assert.equal(m.motivosPerdida.Precio, 2);
  assert.equal(metricasEmbudo([]).conversion, null);
});

// ---------------- Servicio técnico ----------------
test('caso técnico: solo iPhone y sin contraseñas', () => {
  assert.equal(validarCaso({ modelo: 'Samsung S23', sintomas: 'no enciende' }).ok, false);
  assert.equal(validarCaso({ modelo: 'iPhone 13', sintomas: 'no carga con ningún cable' }).ok, true);
  const conClave = validarCaso({ modelo: 'iPhone 13', sintomas: 'no carga', antecedentes: 'código: 123456' });
  assert.equal(conClave.ok, false);
  assert.equal(pareceDatoSensible('contraseña 4455'), true);
  assert.equal(pareceDatoSensible('se probó con otro pin de carga'), false);
  assert.equal(pareceDatoSensible('clave del wifi de la tienda funciona'), false);
});

test('flujo de estados con falla confirmada y control de calidad', () => {
  const vend = u('vendedor');
  const tec = u('tecnico');
  let caso = { estado: 'recibido', hallazgos: [] };
  // Un vendedor no puede confirmar fallas
  assert.equal(agregarHallazgo(caso, vend, { tipo: 'confirmada', texto: 'Puerto dañado', evidencia: 'medición' }).ok, false);
  // Un técnico sí, pero con evidencia
  assert.equal(agregarHallazgo(caso, tec, { tipo: 'confirmada', texto: 'Puerto dañado' }).ok, false);
  caso = agregarHallazgo(caso, vend, { tipo: 'probable', texto: 'Puerto sucio' }).caso;
  // Transición inválida
  assert.equal(cambiarEstado(caso, tec, 'entregado').ok, false);
  caso = cambiarEstado(caso, tec, 'diagnostico').caso;
  caso = cambiarEstado(caso, tec, 'cotizado').caso;
  // No se repara sin falla confirmada ni aprobación del cliente
  assert.match(cambiarEstado(caso, tec, 'reparacion').error, /confirmada/);
  caso = agregarHallazgo(caso, tec, { tipo: 'confirmada', texto: 'Pines del puerto doblados', evidencia: 'Inspección con lupa y prueba con cable' }).caso;
  assert.match(cambiarEstado(caso, tec, 'reparacion').error, /aprob/);
  caso = { ...caso, clienteAprobo: true };
  assert.equal(cambiarEstado(caso, vend, 'reparacion').ok, false);
  caso = cambiarEstado(caso, tec, 'reparacion').caso;
  caso = cambiarEstado(caso, tec, 'calidad').caso;
  const sinQC = cambiarEstado(caso, tec, 'listo');
  assert.equal(sinQC.ok, false);
  assert.equal(sinQC.pendientes.length, CONTROLES_CALIDAD.length);
  caso = { ...caso, calidad: Object.fromEntries(CONTROLES_CALIDAD.map((c) => [c, 'ok'])) };
  caso = cambiarEstado(caso, tec, 'listo').caso;
  assert.equal(cambiarEstado(caso, vend, 'entregado').ok, false);
  caso = cambiarEstado(caso, tec, 'entregado').caso;
  assert.equal(caso.estado, 'entregado');
  assert.equal(caso.historial.length, 6);
});

// ---------------- Buscador ----------------
test('buscador ignora tildes y usa sinónimos', () => {
  const docs = [
    { id: 1, titulo: 'Salud de la batería', texto: 'Ajustes > Batería' },
    { id: 2, titulo: 'Equipo mojado', texto: 'Indicador de humedad en la bandeja SIM' },
    { id: 3, titulo: 'Proceso E-Credit', texto: 'Consulta de cupo y simulación' }
  ];
  assert.equal(buscar(docs, 'BATERIA')[0].id, 1);
  assert.equal(buscar(docs, 'se mojó con líquido')[0].id, 2);
  assert.equal(buscar(docs, 'credito')[0].id, 3);
  assert.equal(buscar(docs, 'xyz').length, 0);
  assert.equal(buscar(docs, '').length, 0);
  assert.equal(normalizar('Ñandú Á'), 'nandu a');
  assert.equal(buscar([{ id: 9, titulo: 'Diseño', texto: '' }], 'diseno')[0].id, 9);
});

// ---------------- Academia ----------------
const leccion = { id: 'l1', roles: ['vendedor'], quiz: [
  { p: 'a', o: ['x', 'y'], r: 1, explica: 'porque y' },
  { p: 'b', o: ['x', 'y'], r: 0, explica: 'porque x' },
  { p: 'c', o: ['x', 'y'], r: 0 },
  { p: 'd', o: ['x', 'y'], r: 0 },
  { p: 'e', o: ['x', 'y'], r: 0 }
] };

test('quiz califica y explica errores', () => {
  const r = calificarQuiz(leccion, [0, 0, 0, 0, 0]);
  assert.equal(r.correctas, 4);
  assert.equal(r.nota, 0.8);
  assert.equal(r.aprobado, true);
  assert.equal(r.detalle[0].correcta, false);
  assert.equal(r.detalle[0].explicacion, 'porque y');
  assert.equal(calificarQuiz(leccion, [0]).ok, false);
  assert.equal(calificarQuiz({ quiz: [] }, []).ok, false);
});

test('progreso, asignaciones y tiempo de capacitación', () => {
  let p = registrarIntento({}, 'l1', { nota: 0.6, aprobado: false }, '2026-10-02');
  p = registrarIntento(p, 'l1', { nota: 1, aprobado: true }, '2026-10-05');
  p = registrarIntento(p, 'l1', { nota: 0.4, aprobado: false }, '2026-10-06');
  assert.equal(p.l1.intentos, 3);
  assert.equal(p.l1.mejorNota, 1);
  assert.equal(p.l1.aprobadaEn, '2026-10-05');
  const res = resumenProgreso([leccion, { id: 'l2' }], p);
  assert.equal(res.aprobadas, 1);
  assert.equal(res.avance, 0.5);
  assert.equal(estadoAsignacion({ leccionId: 'l1' }, p, '2026-10-11'), 'completada');
  assert.equal(estadoAsignacion({ leccionId: 'l2', fechaLimite: '2026-10-01' }, p, '2026-10-11'), 'vencida');
  assert.equal(estadoAsignacion({ leccionId: 'l2', fechaLimite: '2026-12-01' }, p, '2026-10-11'), 'pendiente');
  assert.equal(diasHastaCompletar('2026-10-01', [leccion], p), 4);
  assert.equal(diasHastaCompletar('2026-10-01', [leccion, { id: 'l2' }], p), null);
  assert.equal(leccionesParaRol([leccion, { id: 'l3', roles: ['tecnico'] }, { id: 'l4' }], 'vendedor').length, 2);
  assert.equal(leccionesParaRol([leccion, { id: 'l3', roles: ['tecnico'] }], 'supervisor').length, 2);
});

// ---------------- Simulador de conversaciones ----------------
test('roleplay puntúa y penaliza respuestas no éticas', () => {
  const esc = { id: 'e', inicio: 'a', nodos: {
    a: { cliente: 'Hola', opciones: [
      { texto: 'bien', puntos: 2, feedback: 'ok', siguiente: 'b' },
      { texto: 'mentira', puntos: -1, feedback: 'no mientas', siguiente: 'b' }
    ] },
    b: { cliente: 'Gracias', opciones: [{ texto: 'fin', puntos: 2, feedback: '' }, { texto: 'regular', puntos: 1, feedback: 'mejorable' }] }
  } };
  let s = rp.iniciar(esc);
  s = rp.elegir(esc, s, 0);
  s = rp.elegir(esc, s, 0);
  assert.equal(s.terminado, true);
  assert.equal(rp.evaluar(s).nota, 1);
  let s2 = rp.elegir(esc, rp.iniciar(esc), 1);
  s2 = rp.elegir(esc, s2, 1);
  const ev = rp.evaluar(s2);
  assert.equal(ev.faltasEticas, 1);
  assert.ok(ev.nota <= 0.5);
  assert.match(ev.nivel, /corrección/);
  assert.throws(() => rp.elegir(esc, s, 0));
});

// ---------------- Catálogo ----------------
const equipo = (x) => ({ modelo: 'iPhone 13', capacidadGB: 128, condicion: 'usado', precio: 1800000, stock: 1, fuente: 'Lista interna', actualizado: '2026-10-10', responsable: 'Admin', ...x });

test('catálogo exige fuente, fecha y responsable', () => {
  assert.equal(validarEquipo(equipo()).ok, true);
  assert.equal(validarEquipo(equipo({ fuente: '' })).ok, false);
  assert.equal(validarEquipo(equipo({ responsable: '' })).ok, false);
  assert.equal(validarEquipo(equipo({ actualizado: 'ayer' })).ok, false);
  assert.equal(validarEquipo(equipo({ modelo: 'Galaxy' })).ok, false);
  assert.equal(validarEquipo(equipo({ precio: -5 })).ok, false);
  assert.equal(validarEquipo(equipo({ saludBateria: 120 })).ok, false);
});

test('vigencia del precio', () => {
  assert.equal(vigencia(equipo(), '2026-10-11').estado, 'vigente');
  assert.equal(vigencia(equipo({ actualizado: '2026-09-01' }), '2026-10-11').estado, 'vencido');
  assert.equal(vigencia(equipo({ demo: true }), '2026-10-11').estado, 'demo');
});

test('recomendación respeta stock y presupuesto', () => {
  const cat = [
    equipo({ id: 'a', precio: 1500000, usos: ['redes'] }),
    equipo({ id: 'b', precio: 2500000, usos: ['fotos'] }),
    equipo({ id: 'c', precio: 1000000, stock: 0, usos: ['fotos'] }),
    equipo({ id: 'd', precio: 1900000, usos: ['fotos'], capacidadGB: 256 })
  ];
  const r = recomendar(cat, { presupuesto: 2000000, usos: ['fotos'] }, '2026-10-11');
  assert.deepEqual(r.recomendaciones.map((x) => x.equipo.id), ['d', 'a']);
  const cap = recomendar(cat, { presupuesto: 3000000, capacidadMinGB: 256 }, '2026-10-11');
  assert.deepEqual(cap.recomendaciones.map((x) => x.equipo.id), ['d']);
  const sinNada = recomendar(cat, { presupuesto: 500000 }, '2026-10-11');
  assert.equal(sinNada.recomendaciones.length, 0);
  assert.equal(sinNada.alternativa.equipo.id, 'a');
  assert.equal(sinNada.alternativa.diferencia, 1000000);
  const cmp = comparar([cat[0], cat[3]]);
  assert.ok(cmp.find((f) => f.campo === 'precio').distinto);
  assert.ok(!cmp.find((f) => f.campo === 'modelo').distinto);
});

// ---------------- Autenticación y auditoría ----------------
test('hash de clave y verificación', async () => {
  assert.ok(validarClave('123'));
  assert.ok(validarClave('123456'));
  assert.ok(validarClave('999999'));
  assert.equal(validarClave('Tienda.2026'), null);
  const c = await hashClave('Tienda.2026');
  assert.equal(c.hash.length, 64);
  assert.notEqual(c.hash, 'Tienda.2026');
  assert.equal(await verificarClave('Tienda.2026', c), true);
  assert.equal(await verificarClave('tienda.2026', c), false);
  assert.equal(await verificarClave('x', null), false);
  const c2 = await hashClave('Tienda.2026');
  assert.notEqual(c.sal, c2.sal);
});

test('bloqueo por intentos y expiración de sesión', () => {
  let reg;
  for (let i = 0; i < MAX_INTENTOS - 1; i++) reg = registrarFallo(reg, 1000);
  assert.equal(estaBloqueado(reg, 1000), false);
  reg = registrarFallo(reg, 1000);
  assert.equal(estaBloqueado(reg, 1001), true);
  assert.equal(estaBloqueado(reg, 1000 + 5 * 60 * 1000 + 1), false);
  assert.equal(sesionVigente({ ultimaActividad: 0 }, SESION_INACTIVA_MS - 1), true);
  assert.equal(sesionVigente({ ultimaActividad: 0 }, SESION_INACTIVA_MS), false);
});

test('auditoría no guarda datos sensibles', () => {
  const e = entradaAuditoria({ usuario: u('admin'), accion: 'crear', entidad: 'usuario', entidadId: 7, detalle: { rol: 'vendedor', clave: 'x', telefono: '300', hash: 'h', objeto: { a: 1 } } }, '2026-10-11T00:00:00Z');
  assert.deepEqual(e.detalle, { rol: 'vendedor' });
  assert.equal(e.entidadId, '7');
});
