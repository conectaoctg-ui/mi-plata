import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarGarantia, resolverGarantia, sumarMeses, estadoPlazo, mesesGarantia, POLITICA_BASE } from '../js/core/garantia.js';
import { LocalStore, MemoryStorage, migrar, estadoInicial } from '../js/data/store.js';
import { Repo, AppError } from '../js/data/repo.js';
import { PermissionError } from '../js/core/permissions.js';

test('suma de meses respeta fin de mes', () => {
  assert.equal(sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(sumarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(sumarMeses('2026-08-31', 6), '2027-02-28');
  assert.equal(sumarMeses('2026-10-11', 12), '2027-10-11');
});

test('términos de la política: nuevos 12, usados 6, reacondicionados sin definir', () => {
  assert.equal(mesesGarantia('nuevo'), 12);
  assert.equal(mesesGarantia('usado'), 6);
  assert.equal(mesesGarantia('reacondicionado'), null);
  const r = evaluarGarantia({ condicion: 'reacondicionado', fechaCompra: '2026-09-01', fechaSolicitud: '2026-10-11' });
  assert.equal(r.elegible, null);
  assert.match(r.motivo, /no ha definido/);
});

test('usado dentro y fuera de los 6 meses (límite exacto)', () => {
  const base = { condicion: 'usado', fechaCompra: '2026-04-11', causa: 'fabrica' };
  const dentro = evaluarGarantia({ ...base, fechaSolicitud: '2026-10-11' });
  assert.equal(dentro.vence, '2026-10-11');
  assert.equal(dentro.vigente, true);
  assert.equal(dentro.elegible, true);
  assert.equal(dentro.limiteRespuesta, '2026-10-14');
  const fuera = evaluarGarantia({ ...base, fechaSolicitud: '2026-10-12' });
  assert.equal(fuera.vigente, false);
  assert.equal(fuera.elegible, false);
});

test('causas que no son de fábrica no proceden; desconocida espera diagnóstico', () => {
  for (const causa of ['golpe', 'liquido', 'manipulacion', 'software']) {
    assert.equal(evaluarGarantia({ condicion: 'nuevo', fechaCompra: '2026-10-01', fechaSolicitud: '2026-10-11', causa }).elegible, false);
  }
  assert.equal(evaluarGarantia({ condicion: 'nuevo', fechaCompra: '2026-10-01', fechaSolicitud: '2026-10-11' }).elegible, null);
});

test('garantía directa con proveedor: hasta 60 días y solo para nuevos', () => {
  const n = evaluarGarantia({ condicion: 'nuevo', fechaCompra: '2026-10-01', fechaSolicitud: '2026-10-11', proveedorDirecto: true });
  assert.equal(n.plazoRespuestaDias, 60);
  assert.equal(n.limiteRespuesta, '2026-12-10');
  const u = evaluarGarantia({ condicion: 'usado', fechaCompra: '2026-10-01', fechaSolicitud: '2026-10-11', proveedorDirecto: true });
  assert.equal(u.plazoRespuestaDias, 3);
  assert.ok(u.avisos.some((a) => /solo aplica a equipos nuevos/.test(a)));
});

test('entradas inválidas', () => {
  assert.equal(evaluarGarantia({}).ok, false);
  assert.equal(evaluarGarantia({ condicion: 'nuevo', fechaCompra: '2026-12-01', fechaSolicitud: '2026-10-11' }).ok, false);
  assert.equal(evaluarGarantia({ condicion: 'nuevo', fechaCompra: 'ayer', fechaSolicitud: '2026-10-11' }).ok, false);
});

test('plazo de respuesta', () => {
  assert.equal(estadoPlazo('2026-10-14', '2026-10-12'), 'a_tiempo');
  assert.equal(estadoPlazo('2026-10-14', '2026-10-14'), 'vence_hoy');
  assert.equal(estadoPlazo('2026-10-14', '2026-10-15'), 'vencido');
  assert.equal(estadoPlazo('2026-10-14', '2026-10-20', '2026-10-14'), 'cumplido');
  assert.equal(estadoPlazo('2026-10-14', '2026-10-20', '2026-10-15'), 'incumplido');
});

test('soluciones: cambio igual o mayor con excedente, devolución, rechazo sustentado', () => {
  const c = resolverGarantia({ tipo: 'cambio', reparable: false, valorPagado: 2000000, valorEquipoNuevo: 2300000 });
  assert.equal(c.excedente, 300000);
  assert.equal(resolverGarantia({ tipo: 'cambio', reparable: false, valorPagado: 2000000, valorEquipoNuevo: 2000000 }).excedente, 0);
  assert.equal(resolverGarantia({ tipo: 'cambio', reparable: false, valorPagado: 2000000, valorEquipoNuevo: 1500000 }).ok, false);
  assert.equal(resolverGarantia({ tipo: 'cambio', reparable: true, valorPagado: 2000000, valorEquipoNuevo: 2000000 }).ok, false);
  assert.equal(resolverGarantia({ tipo: 'devolucion', reparable: false, valorPagado: 2000000 }).devolver, 2000000);
  assert.equal(resolverGarantia({ tipo: 'devolucion', reparable: false }).ok, false);
  assert.equal(resolverGarantia({ tipo: 'reparacion', reparable: false }).ok, false);
  assert.equal(resolverGarantia({ tipo: 'reparacion', reparable: true }).ok, true);
  assert.equal(resolverGarantia({ tipo: 'rechazada', motivo: 'corto' }).ok, false);
  assert.equal(resolverGarantia({ tipo: 'rechazada', motivo: 'Golpe visible en marco y pantalla, verificado con fotos' }).ok, true);
});

test('la política queda cargada como verificada por la gerencia', () => {
  const s = estadoInicial();
  assert.match(s.config.garantias, /12 meses/);
  assert.equal(s.config.garantiaMesesUsado, POLITICA_BASE.garantiaMesesUsado);
  const kb = s.conocimiento.find((k) => k.id === 'kb-garantia');
  assert.equal(kb.estado, 'verificado');
  assert.equal(kb.responsable, 'Gerencia ConectaOCTG');
});

test('migración: datos v1 reciben la política sin perder lo editado', () => {
  const v1 = estadoInicial();
  v1.version = 1;
  v1.config.garantias = '';
  v1.lecciones = v1.lecciones.filter((l) => l.id !== 'gar-1').map((l) => (l.id === 'gen-1' ? { ...l, v: 1, titulo: 'Viejo' } : l));
  v1.conocimiento = v1.conocimiento.map((k) => (k.id === 'kb-garantia-ley' ? { ...k, v: 0, texto: 'Editado por admin', responsable: 'Ana' } : k));
  const m = migrar(JSON.parse(JSON.stringify(v1)));
  assert.match(m.config.garantias, /6 meses/);
  assert.ok(m.lecciones.some((l) => l.id === 'gar-1'));
  assert.notEqual(m.lecciones.find((l) => l.id === 'gen-1').titulo, 'Viejo');
  assert.equal(m.conocimiento.find((k) => k.id === 'kb-garantia-ley').texto, 'Editado por admin');
  // Una política escrita por la administración no se reemplaza
  const propia = migrar({ ...v1, config: { ...v1.config, garantias: 'Política propia' } });
  assert.equal(propia.config.garantias, 'Política propia');
});

test('flujo de garantía en la capa de servicio', async () => {
  const store = new LocalStore(new MemoryStorage()); store.load();
  const repo = new Repo(store, () => Date.parse('2026-10-11T15:00:00Z'));
  const admin = await repo.crearPrimerAdmin({ nombre: 'Admin', usuario: 'admin', clave: 'Tienda.2026' });
  const vend = await repo.crearUsuario(admin, { nombre: 'Vera', usuario: 'vera', clave: 'Ventas.2026', rol: 'vendedor' });
  const tec = await repo.crearUsuario(admin, { nombre: 'Tomás', usuario: 'tomas', clave: 'Taller.2026', rol: 'tecnico' });
  assert.throws(() => repo.crearCaso(vend, { modelo: 'iPhone 12', sintomas: 'No carga', garantia: { condicion: 'usado' } }), AppError);
  const c = repo.crearCaso(vend, { modelo: 'iPhone 12', sintomas: 'No carga con ningún cable', garantia: { condicion: 'usado', fechaCompra: '2026-06-11', causa: 'desconocida' } });
  assert.equal(c.tipo, 'garantia');
  assert.equal(c.garantia.vigente, true);
  assert.equal(c.garantia.limiteRespuesta, '2026-10-14');
  assert.throws(() => repo.resolverGarantiaCaso(vend, c.id, { tipo: 'reparacion', reparable: true }), PermissionError);
  assert.throws(() => repo.resolverGarantiaCaso(tec, c.id, { tipo: 'reparacion', reparable: true }), /falla confirmada/);
  repo.agregarHallazgo(tec, c.id, { tipo: 'confirmada', texto: 'Placa de carga defectuosa', evidencia: 'Medición con amperímetro: no consume' });
  const r = repo.resolverGarantiaCaso(tec, c.id, { tipo: 'cambio', reparable: false, valorPagado: 1800000, valorEquipoNuevo: 2000000 });
  assert.equal(r.excedente, 200000);
  assert.equal(r.cumplioPlazo, true);
  assert.throws(() => repo.resolverGarantiaCaso(tec, c.id, { tipo: 'devolucion', reparable: false, valorPagado: 1800000 }), /ya tiene/);
  // Garantía vencida: solo puede registrarse que no procede
  const v = repo.crearCaso(vend, { modelo: 'iPhone 11', sintomas: 'Se apaga solo', garantia: { condicion: 'usado', fechaCompra: '2025-01-01' } });
  assert.equal(v.garantia.vigente, false);
  repo.agregarHallazgo(tec, v.id, { tipo: 'confirmada', texto: 'Batería desgastada', evidencia: 'Salud de batería 70 %' });
  assert.throws(() => repo.resolverGarantiaCaso(tec, v.id, { tipo: 'reparacion', reparable: true }), /vencida/);
  const m = repo.metricas(admin).garantias;
  assert.equal(m.total, 2);
  assert.equal(m.aTiempo, 1);
  assert.equal(m.porSolucion.cambio, 1);
  // Parámetros de la política editables y validados
  assert.throws(() => repo.guardarConfig(admin, { garantiaMesesUsado: 0 }), AppError);
  repo.guardarConfig(admin, { garantiaMesesReacondicionado: 6 });
  assert.equal(repo.politicaGarantia().garantiaMesesReacondicionado, 6);
});
