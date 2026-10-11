import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalStore, MemoryStorage } from '../js/data/store.js';
import { Repo, AppError } from '../js/data/repo.js';
import { PermissionError } from '../js/core/permissions.js';
import { CONTROLES_CALIDAD } from '../js/core/service.js';

let t0 = Date.parse('2026-10-11T12:00:00Z');
async function montar() {
  const storage = new MemoryStorage();
  const store = new LocalStore(storage);
  store.load();
  let ahora = t0;
  const repo = new Repo(store, () => ahora);
  const admin = await repo.crearPrimerAdmin({ nombre: 'Admin', usuario: 'admin', clave: 'Tienda.2026' });
  const vend = await repo.crearUsuario(admin, { nombre: 'Vera', usuario: 'vera', clave: 'Ventas.2026', rol: 'vendedor' });
  const vend2 = await repo.crearUsuario(admin, { nombre: 'Victor', usuario: 'victor', clave: 'Ventas.2027', rol: 'vendedor' });
  const tec = await repo.crearUsuario(admin, { nombre: 'Tomás', usuario: 'tomas', clave: 'Taller.2026', rol: 'tecnico' });
  const sup = await repo.crearUsuario(admin, { nombre: 'Sara', usuario: 'sara', clave: 'Super.2026', rol: 'supervisor' });
  return { repo, store, storage, admin, vend, vend2, tec, sup, avanzar: (ms) => { ahora += ms; } };
}

const rechaza = (fn, Tipo = PermissionError) => assert.throws(fn, Tipo);
const rechazaAsync = (fn, Tipo = PermissionError) => assert.rejects(fn, Tipo);

test('configuración inicial solo una vez y persistencia', async () => {
  const { repo, store, storage } = await montar();
  await assert.rejects(() => repo.crearPrimerAdmin({ nombre: 'Otro', usuario: 'otro', clave: 'Tienda.2026' }), AppError);
  // Recargar desde el almacenamiento conserva los datos
  const s2 = new LocalStore(storage); s2.load();
  assert.equal(s2.data.usuarios.length, 5);
  // La clave no se guarda en texto plano
  assert.ok(!JSON.stringify(store.data).includes('Tienda.2026'));
});

test('inicio de sesión, mensaje genérico y bloqueo', async () => {
  const { repo, avanzar } = await montar();
  const u = await repo.iniciarSesion('VERA', 'Ventas.2026');
  assert.equal(u.usuario, 'vera');
  await assert.rejects(() => repo.iniciarSesion('vera', 'mal'), /Usuario o clave incorrectos/);
  await assert.rejects(() => repo.iniciarSesion('noexiste', 'mal'), /Usuario o clave incorrectos/);
  for (let i = 0; i < 4; i++) await assert.rejects(() => repo.iniciarSesion('vera', 'mal'));
  // Bloqueado incluso con la clave correcta
  await assert.rejects(() => repo.iniciarSesion('vera', 'Ventas.2026'), /Demasiados intentos/);
  avanzar(5 * 60 * 1000 + 1);
  assert.ok(await repo.iniciarSesion('vera', 'Ventas.2026'));
});

test('usuario desactivado no puede entrar ni operar', async () => {
  const { repo, admin, vend } = await montar();
  repo.actualizarUsuario(admin, vend.id, { activo: false });
  await assert.rejects(() => repo.iniciarSesion('vera', 'Ventas.2026'), AppError);
  rechaza(() => repo.listarCatalogo(vend));
});

test('no se puede dejar la tienda sin administrador', async () => {
  const { repo, admin } = await montar();
  assert.throws(() => repo.actualizarUsuario(admin, admin.id, { rol: 'vendedor' }), /administrador/);
  assert.throws(() => repo.actualizarUsuario(admin, admin.id, { activo: false }), /administrador/);
});

test('un actor falsificado (rol cambiado en memoria) no obtiene permisos', async () => {
  const { repo, vend } = await montar();
  const falso = { ...vend, rol: 'admin' };
  // El repo vuelve a leer el rol desde los datos guardados
  rechaza(() => repo.listarUsuarios(falso));
  rechaza(() => repo.auditoria({ id: 'inventado', rol: 'admin', activo: true }));
});

test('accesos indebidos por rol', async () => {
  const { repo, vend, tec, sup } = await montar();
  await rechazaAsync(() => repo.crearUsuario(vend, { nombre: 'X', usuario: 'xxx', clave: 'Clave.2026', rol: 'admin' }));
  await rechazaAsync(() => repo.crearUsuario(sup, { nombre: 'X', usuario: 'xxx', clave: 'Clave.2026', rol: 'admin' }));
  rechaza(() => repo.guardarEquipo(vend, {}));
  rechaza(() => repo.guardarArticulo(tec, {}));
  rechaza(() => repo.guardarConfig(sup, { margenMinimo: 0.1 }));
  rechaza(() => repo.listarLeads(tec));
  rechaza(() => repo.auditoria(sup));
  rechaza(() => repo.exportar(sup));
  rechaza(() => repo.metricas(vend));
  rechaza(() => repo.asignar(vend, {}));
  rechaza(() => repo.progreso(vend, tec.id));
  await rechazaAsync(() => repo.cambiarClave(vend, tec.id, 'Nueva.2026'));
});

test('el costo solo lo ven admin y supervisor', async () => {
  const { repo, admin, vend, sup } = await montar();
  repo.guardarEquipo(admin, { modelo: 'iPhone 13', capacidadGB: 128, condicion: 'usado', precio: 1800000, costo: 1500000, stock: 1, fuente: 'Lista', actualizado: '2026-10-11', responsable: 'Admin' });
  assert.equal(repo.listarCatalogo(vend)[0].costo, undefined);
  assert.equal(repo.listarCatalogo(sup)[0].costo, 1500000);
  assert.throws(() => repo.guardarEquipo(admin, { modelo: 'iPhone 13', capacidadGB: 128, condicion: 'usado', precio: 1800000, stock: 1 }), AppError);
});

test('asesores solo ven sus propios clientes; no contactar es definitivo', async () => {
  const { repo, vend, vend2, sup, admin } = await montar();
  const l = repo.guardarLead(vend, { nombre: 'Cliente Uno', telefono: '3001234567', autorizaContacto: true, proximaFecha: '2026-10-12' });
  repo.guardarLead(vend2, { nombre: 'Cliente Dos' });
  assert.equal(repo.listarLeads(vend).length, 1);
  assert.equal(repo.listarLeads(vend2).length, 1);
  assert.equal(repo.listarLeads(sup).length, 2);
  rechaza(() => repo.guardarLead(vend2, { ...l, nombre: 'Cambiado' }));
  rechaza(() => repo.marcarNoContactar(vend2, l.id));
  repo.marcarNoContactar(vend, l.id);
  const tras = repo.listarLeads(vend)[0];
  assert.equal(tras.noContactar, true);
  assert.equal(tras.telefono, '');
  // Intentar revertir no funciona y no se puede programar seguimiento
  assert.throws(() => repo.guardarLead(vend, { ...tras, noContactar: false, telefono: '3001234567', autorizaContacto: true }), AppError);
  const r = repo.guardarLead(vend, { ...tras, noContactar: false, proximaFecha: '2026-10-20' });
  assert.equal(r.noContactar, true);
  assert.equal(r.proximaFecha, '');
  rechaza(() => repo.eliminarLead(vend, l.id));
  repo.eliminarLead(admin, l.id);
});

test('flujo técnico completo con reglas', async () => {
  const { repo, vend, tec } = await montar();
  assert.throws(() => repo.crearCaso(vend, { modelo: 'iPhone 12', sintomas: 'No carga', antecedentes: 'clave: 4455' }), (e) => e.errores.some((x) => /contraseña/.test(x)));
  const c = repo.crearCaso(vend, { modelo: 'iPhone 12', sintomas: 'No carga con ningún cable', humedad: 'normal' });
  assert.equal(c.numero, 1);
  assert.throws(() => repo.agregarHallazgo(vend, c.id, { tipo: 'confirmada', texto: 'Puerto', evidencia: 'medición con lupa' }), /técnico/);
  repo.cambiarEstadoCaso(tec, c.id, 'diagnostico');
  repo.agregarHallazgo(tec, c.id, { tipo: 'confirmada', texto: 'Pines doblados', evidencia: 'Revisión con lupa' });
  repo.cambiarEstadoCaso(tec, c.id, 'cotizado');
  assert.throws(() => repo.cambiarEstadoCaso(tec, c.id, 'reparacion'), /aprob/);
  repo.marcarAprobacionCliente(vend, c.id, true);
  repo.cambiarEstadoCaso(tec, c.id, 'reparacion');
  repo.cambiarEstadoCaso(tec, c.id, 'calidad');
  assert.throws(() => repo.cambiarEstadoCaso(tec, c.id, 'listo'), /controles/);
  rechaza(() => repo.marcarControl(vend, c.id, CONTROLES_CALIDAD[0], 'ok'));
  for (const ctl of CONTROLES_CALIDAD) repo.marcarControl(tec, c.id, ctl, 'ok');
  repo.cambiarEstadoCaso(tec, c.id, 'listo');
  assert.throws(() => repo.cambiarEstadoCaso(vend, c.id, 'entregado'), AppError);
  repo.cambiarEstadoCaso(tec, c.id, 'entregado');
  assert.equal(repo.listarCasos(vend)[0].estado, 'entregado');
});

test('academia: quiz, asignación, competencia y métricas', async () => {
  const { repo, vend, sup, admin, tec } = await montar();
  const lecs = repo.lecciones(vend);
  assert.ok(lecs.every((l) => !l.roles || l.roles.includes('vendedor')));
  const l = lecs.find((x) => x.id === 'gen-1');
  const r = repo.responderQuiz(vend, 'gen-1', l.quiz.map((q) => q.r));
  assert.equal(r.aprobado, true);
  assert.equal(repo.progreso(vend)['gen-1'].mejorNota, 1);
  assert.equal(repo.progreso(sup, vend.id)['gen-1'].intentos, 1);
  repo.asignar(sup, { userId: vend.id, leccionId: 'fin-2', fechaLimite: '2026-10-01' });
  assert.throws(() => repo.asignar(sup, { userId: vend.id, leccionId: 'fin-2' }), /ya está asignada/);
  assert.equal(repo.asignacionesDe(vend)[0].estado, 'vencida');
  assert.throws(() => repo.validarCompetencia(sup, { userId: sup.id, competencia: 'Ventas' }), /propias/);
  repo.validarCompetencia(sup, { userId: vend.id, competencia: 'Recepción de clientes' });
  assert.equal(repo.competenciasDe(vend).length, 1);
  repo.guardarRoleplay(vend, 'esc-credito', { nota: 0.5, faltasEticas: 1 });
  const m = repo.metricas(admin);
  const fila = m.equipo.find((x) => x.id === vend.id);
  assert.equal(fila.aprobadas, 1);
  assert.equal(fila.faltasEticas, 1);
  assert.equal(m.conocimiento.verificados, 1); // la política de garantía de la gerencia
  assert.ok(m.equipo.find((x) => x.id === tec.id));
});

test('artículos verificados exigen fuente, fecha y responsable', async () => {
  const { repo, admin } = await montar();
  assert.throws(() => repo.guardarArticulo(admin, { titulo: 'Garantía', texto: 'Doce meses en equipos nuevos', estado: 'verificado' }), AppError);
  const a = repo.guardarArticulo(admin, { titulo: 'Garantía', texto: 'Texto de la política oficial', estado: 'verificado', fuente: 'Manual interno v1', actualizado: '2026-10-11', responsable: 'Gerencia' });
  assert.equal(a.estado, 'verificado');
});

test('configuración de usura y etapas E-Credit exige fuente', async () => {
  const { repo, admin } = await montar();
  assert.throws(() => repo.guardarConfig(admin, { tasaUsuraEA: 0.25 }), AppError);
  assert.throws(() => repo.guardarConfig(admin, { ecreditUrl: 'http://inseguro' }), AppError);
  repo.guardarConfig(admin, { tasaUsuraEA: 0.25, tasaUsuraFuente: 'Superintendencia Financiera', tasaUsuraFecha: '2026-10-01' });
  assert.equal(repo.config().tasaUsuraEA, 0.25);
  assert.throws(() => repo.guardarEtapaEcredit(admin, 'consulta', { procedimientoOficial: 'Paso 1...' }), AppError);
  repo.guardarEtapaEcredit(admin, 'consulta', { procedimientoOficial: 'Paso 1...', fuente: 'Manual E-Credit', actualizado: '2026-10-11', responsable: 'Gerencia' });
});

test('auditoría registra acciones sin datos sensibles', async () => {
  const { repo, admin, vend } = await montar();
  repo.guardarLead(vend, { nombre: 'Cliente', telefono: '3009998877', autorizaContacto: true });
  await assert.rejects(() => repo.iniciarSesion('vera', 'claveMala1'));
  const log = repo.auditoria(admin);
  assert.ok(log.some((e) => e.accion === 'crear' && e.entidad === 'cliente'));
  assert.ok(log.some((e) => e.accion === 'inicio_sesion_fallido'));
  const txt = JSON.stringify(log);
  assert.ok(!txt.includes('3009998877'));
  assert.ok(!txt.includes('claveMala1'));
});

test('respaldo: exportar e importar, rechaza archivos inválidos', async () => {
  const { repo, admin } = await montar();
  const json = repo.exportar(admin);
  assert.throws(() => repo.importar(admin, 'no es json'), AppError);
  assert.throws(() => repo.importar(admin, JSON.stringify({ app: 'otra' })), AppError);
  assert.throws(() => repo.importar(admin, JSON.stringify({ app: 'conectaoctg-smart-assistant', datos: { usuarios: [] } })), /administrador/);
  repo.importar(admin, json);
  assert.equal(repo.listarUsuarios(admin).length, 5);
});

test('datos corruptos en el almacenamiento no rompen la app', () => {
  const storage = new MemoryStorage();
  storage.setItem('conectaoctg-smart-assistant', '{corrupto');
  const s = new LocalStore(storage);
  s.load();
  assert.equal(s.data.usuarios.length, 0);
  assert.ok([...storage.m.keys()].some((k) => k.includes('corrupto')));
});
