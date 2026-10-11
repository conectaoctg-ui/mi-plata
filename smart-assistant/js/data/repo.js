// Capa de servicio: TODA operación pasa por aquí, se valida el permiso del actor y se audita.
// En modo servidor estas mismas comprobaciones deben repetirse en el backend / reglas de Firestore.

import { assertCan, can, ROLES, PermissionError } from '../core/permissions.js';
import { hashClave, verificarClave, validarClave, registrarFallo, estaBloqueado } from '../core/auth.js';
import { entradaAuditoria, MAX_AUDITORIA } from '../core/audit.js';
import { validarEquipo } from '../core/catalog.js';
import { validarLead, aplicarNoContactar, metricasEmbudo } from '../core/crm.js';
import { validarCaso, agregarHallazgo, cambiarEstado, CONTROLES_CALIDAD, pareceDatoSensible } from '../core/service.js';
import { calificarQuiz, registrarIntento, resumenProgreso, leccionesParaRol, estadoAsignacion, diasHastaCompletar } from '../core/academy.js';
import { CATALOGO_DEMO } from './seed.js';
import { migrar, SCHEMA_VERSION } from './store.js';

const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
const hoy = (ahora) => new Date(ahora).toISOString().slice(0, 10);

export class AppError extends Error {
  constructor(mensaje, errores = []) { super(mensaje); this.name = 'AppError'; this.errores = errores; }
}

export class Repo {
  /** @param {import('./store.js').LocalStore} store  @param {() => number} reloj */
  constructor(store, reloj = () => Date.now()) {
    this.store = store;
    this.reloj = reloj;
    if (!store.data) store.load();
  }

  get d() { return this.store.data; }
  ahoraISO() { return new Date(this.reloj()).toISOString(); }
  hoyISO() { return hoy(this.reloj()); }

  auditar(actor, accion, entidad, entidadId, detalle) {
    this.d.auditoria.push(entradaAuditoria({ usuario: actor, accion, entidad, entidadId, detalle }, this.ahoraISO()));
    if (this.d.auditoria.length > MAX_AUDITORIA) this.d.auditoria.splice(0, this.d.auditoria.length - MAX_AUDITORIA);
  }

  guardar() { this.store.save(); }

  /** Re-lee al usuario desde los datos para no confiar en un objeto en memoria desactualizado. */
  actor(a) {
    const u = a && this.d.usuarios.find((x) => x.id === a.id);
    if (!u || !u.activo) throw new PermissionError('sesion');
    return u;
  }

  // ------------------------------------------------------------ Usuarios y sesión
  necesitaConfiguracion() { return this.d.usuarios.length === 0; }

  async crearPrimerAdmin({ nombre, usuario, clave }) {
    if (!this.necesitaConfiguracion()) throw new AppError('La configuración inicial ya se hizo.');
    const u = await this._crearUsuario({ nombre, usuario, clave, rol: 'admin' });
    this.auditar(u, 'configuracion_inicial', 'usuario', u.id, { rol: 'admin' });
    this.guardar();
    return u;
  }

  async _crearUsuario({ nombre, usuario, clave, rol }) {
    const errores = [];
    nombre = String(nombre || '').trim();
    usuario = String(usuario || '').trim().toLowerCase();
    if (nombre.length < 2 || nombre.length > 50) errores.push('El nombre debe tener entre 2 y 50 caracteres.');
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) errores.push('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion.');
    if (this.d.usuarios.some((x) => x.usuario === usuario)) errores.push('Ese nombre de usuario ya existe.');
    if (!ROLES[rol]) errores.push('Rol no válido.');
    const errClave = validarClave(clave);
    if (errClave) errores.push(errClave);
    if (errores.length) throw new AppError('Revisa los datos del usuario.', errores);
    const u = { id: uid(), nombre, usuario, rol, activo: true, creado: this.hoyISO() };
    this.d.usuarios.push(u);
    this.d.credenciales[u.id] = await hashClave(clave);
    return u;
  }

  async iniciarSesion(usuario, clave) {
    usuario = String(usuario || '').trim().toLowerCase();
    const ahora = this.reloj();
    const reg = this.d.intentos[usuario];
    if (estaBloqueado(reg, ahora)) {
      const min = Math.ceil((reg.bloqueadoHasta - ahora) / 60000);
      throw new AppError(`Demasiados intentos fallidos. Espera ${min} minuto(s) e inténtalo de nuevo.`);
    }
    const u = this.d.usuarios.find((x) => x.usuario === usuario);
    const ok = u && u.activo && (await verificarClave(clave, this.d.credenciales[u.id]));
    if (!ok) {
      this.d.intentos[usuario] = registrarFallo(reg, ahora);
      this.auditar(null, 'inicio_sesion_fallido', 'sesion', '', { usuario: usuario.slice(0, 30) });
      this.guardar();
      // Mismo mensaje para usuario inexistente y clave incorrecta (no revela cuál falló)
      throw new AppError('Usuario o clave incorrectos.');
    }
    delete this.d.intentos[usuario];
    this.auditar(u, 'inicio_sesion', 'sesion', u.id);
    this.guardar();
    return u;
  }

  cerrarSesion(actor) {
    if (actor) { this.auditar(actor, 'cierre_sesion', 'sesion', actor.id); this.guardar(); }
  }

  listarUsuarios(actor) {
    actor = this.actor(actor);
    if (!can(actor, 'usuarios.gestionar') && !can(actor, 'academia.verProgresoEquipo')) throw new PermissionError('usuarios.ver');
    return this.d.usuarios.map((u) => ({ ...u }));
  }

  async crearUsuario(actor, datos) {
    actor = this.actor(actor);
    assertCan(actor, 'usuarios.gestionar');
    const u = await this._crearUsuario(datos);
    this.auditar(actor, 'crear', 'usuario', u.id, { rol: u.rol });
    this.guardar();
    return u;
  }

  actualizarUsuario(actor, id, { rol, activo }) {
    actor = this.actor(actor);
    assertCan(actor, 'usuarios.gestionar');
    const u = this.d.usuarios.find((x) => x.id === id);
    if (!u) throw new AppError('Usuario no encontrado.');
    const admins = this.d.usuarios.filter((x) => x.rol === 'admin' && x.activo);
    const quitaAdmin = u.rol === 'admin' && ((rol && rol !== 'admin') || activo === false);
    if (quitaAdmin && admins.length <= 1) throw new AppError('Debe quedar al menos un administrador activo.');
    if (rol !== undefined) { if (!ROLES[rol]) throw new AppError('Rol no válido.'); u.rol = rol; }
    if (activo !== undefined) u.activo = !!activo;
    this.auditar(actor, 'actualizar', 'usuario', id, { rol: u.rol, activo: u.activo });
    this.guardar();
    return { ...u };
  }

  async cambiarClave(actor, id, nueva) {
    actor = this.actor(actor);
    if (actor.id !== id) assertCan(actor, 'usuarios.gestionar');
    const err = validarClave(nueva);
    if (err) throw new AppError(err);
    if (!this.d.usuarios.some((u) => u.id === id)) throw new AppError('Usuario no encontrado.');
    this.d.credenciales[id] = await hashClave(nueva);
    this.auditar(actor, 'cambiar_clave', 'usuario', id);
    this.guardar();
  }

  // ------------------------------------------------------------ Configuración
  config() { return { ...this.d.config }; }

  guardarConfig(actor, cambios) {
    actor = this.actor(actor);
    assertCan(actor, 'financiacion.configurar');
    const c = { ...this.d.config };
    const errores = [];
    if ('tasaUsuraEA' in cambios) {
      const t = cambios.tasaUsuraEA;
      if (t !== null && !(Number.isFinite(t) && t > 0 && t < 3)) errores.push('La tasa de usura debe ser un porcentaje efectivo anual válido.');
      if (t !== null && (!String(cambios.tasaUsuraFuente || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(cambios.tasaUsuraFecha || ''))) {
        errores.push('Indica la fuente y la fecha de vigencia de la tasa de usura.');
      }
    }
    if ('margenMinimo' in cambios && cambios.margenMinimo !== null && !(cambios.margenMinimo >= 0 && cambios.margenMinimo < 1)) {
      errores.push('El margen mínimo debe estar entre 0 % y 99 %.');
    }
    if ('ecreditUrl' in cambios && cambios.ecreditUrl && !/^https:\/\/[^\s]+$/.test(cambios.ecreditUrl)) errores.push('El enlace de E-Credit debe empezar por https://');
    if (errores.length) throw new AppError('Revisa la configuración.', errores);
    const permitidos = Object.keys(c);
    for (const [k, v] of Object.entries(cambios)) if (permitidos.includes(k)) c[k] = typeof v === 'string' ? v.trim().slice(0, 2000) : v;
    this.d.config = c;
    this.auditar(actor, 'actualizar', 'config', '', { campos: Object.keys(cambios).join(',') });
    this.guardar();
    return { ...c };
  }

  guardarEtapaEcredit(actor, id, { procedimientoOficial, fuente, actualizado, responsable }) {
    actor = this.actor(actor);
    assertCan(actor, 'financiacion.configurar');
    const e = this.d.ecreditEtapas.find((x) => x.id === id);
    if (!e) throw new AppError('Etapa no encontrada.');
    const texto = String(procedimientoOficial || '').trim();
    if (texto && (!String(fuente || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(actualizado || '') || !String(responsable || '').trim())) {
      throw new AppError('Para registrar el procedimiento oficial indica fuente, fecha y responsable.');
    }
    Object.assign(e, { procedimientoOficial: texto.slice(0, 3000), fuente: String(fuente || '').trim(), actualizado: actualizado || '', responsable: String(responsable || '').trim() });
    this.auditar(actor, 'actualizar', 'ecredit_etapa', id);
    this.guardar();
    return { ...e };
  }

  // ------------------------------------------------------------ Catálogo
  listarCatalogo(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'catalogo.ver');
    const verCosto = can(actor, 'catalogo.verCosto');
    return this.d.catalogo.map((e) => { const c = { ...e }; if (!verCosto) delete c.costo; return c; });
  }

  guardarEquipo(actor, equipo) {
    actor = this.actor(actor);
    assertCan(actor, 'catalogo.editar');
    const v = validarEquipo(equipo);
    if (!v.ok) throw new AppError('Revisa los datos del equipo.', v.errors);
    const limpio = {
      id: equipo.id || uid(), modelo: equipo.modelo.trim().slice(0, 60), capacidadGB: equipo.capacidadGB, condicion: equipo.condicion,
      color: String(equipo.color || '').trim().slice(0, 30), precio: equipo.precio, costo: equipo.costo ?? null, stock: equipo.stock,
      saludBateria: equipo.condicion === 'nuevo' ? null : (equipo.saludBateria ?? null), garantiaMeses: Number.isInteger(equipo.garantiaMeses) ? equipo.garantiaMeses : null,
      usos: Array.isArray(equipo.usos) ? equipo.usos.slice(0, 5) : [], notas: String(equipo.notas || '').trim().slice(0, 300),
      fuente: equipo.fuente.trim().slice(0, 120), actualizado: equipo.actualizado, responsable: equipo.responsable.trim().slice(0, 60), demo: false
    };
    const i = this.d.catalogo.findIndex((x) => x.id === limpio.id);
    const antes = i >= 0 ? this.d.catalogo[i] : null;
    if (i >= 0) this.d.catalogo[i] = limpio; else this.d.catalogo.push(limpio);
    this.auditar(actor, i >= 0 ? 'actualizar' : 'crear', 'equipo', limpio.id, { modelo: limpio.modelo, precioAnterior: antes?.precio ?? '', precio: limpio.precio, stock: limpio.stock });
    this.guardar();
    return limpio;
  }

  eliminarEquipo(actor, id) {
    actor = this.actor(actor);
    assertCan(actor, 'catalogo.editar');
    const i = this.d.catalogo.findIndex((x) => x.id === id);
    if (i < 0) throw new AppError('Equipo no encontrado.');
    const [e] = this.d.catalogo.splice(i, 1);
    this.auditar(actor, 'eliminar', 'equipo', id, { modelo: e.modelo });
    this.guardar();
  }

  cargarDemo(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'catalogo.editar');
    this.d.catalogo = this.d.catalogo.filter((e) => !e.demo).concat(structuredClone(CATALOGO_DEMO));
    this.auditar(actor, 'cargar_demo', 'catalogo', '');
    this.guardar();
  }

  quitarDemo(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'catalogo.editar');
    this.d.catalogo = this.d.catalogo.filter((e) => !e.demo);
    this.auditar(actor, 'quitar_demo', 'catalogo', '');
    this.guardar();
  }

  // ------------------------------------------------------------ Conocimiento
  listarConocimiento(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'conocimiento.ver');
    return this.d.conocimiento.map((k) => ({ ...k }));
  }

  guardarArticulo(actor, art) {
    actor = this.actor(actor);
    assertCan(actor, 'conocimiento.editar');
    const errores = [];
    const titulo = String(art.titulo || '').trim();
    const texto = String(art.texto || '').trim();
    if (titulo.length < 3) errores.push('Escribe un título.');
    if (texto.length < 10) errores.push('Escribe el contenido.');
    if (!['pendiente', 'verificado'].includes(art.estado)) errores.push('Estado no válido.');
    if (art.estado === 'verificado' && (!String(art.fuente || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(art.actualizado || '') || !String(art.responsable || '').trim())) {
      errores.push('Para marcar como verificado indica fuente, fecha y responsable.');
    }
    if (errores.length) throw new AppError('Revisa el artículo.', errores);
    const limpio = { id: art.id || uid(), area: art.area || 'general', titulo: titulo.slice(0, 120), texto: texto.slice(0, 5000), estado: art.estado, fuente: String(art.fuente || '').trim().slice(0, 200), actualizado: art.actualizado || '', responsable: String(art.responsable || '').trim().slice(0, 60) };
    const i = this.d.conocimiento.findIndex((x) => x.id === limpio.id);
    if (i >= 0) this.d.conocimiento[i] = limpio; else this.d.conocimiento.push(limpio);
    this.auditar(actor, i >= 0 ? 'actualizar' : 'crear', 'articulo', limpio.id, { titulo: limpio.titulo, estado: limpio.estado });
    this.guardar();
    return limpio;
  }

  eliminarArticulo(actor, id) {
    actor = this.actor(actor);
    assertCan(actor, 'conocimiento.editar');
    const i = this.d.conocimiento.findIndex((x) => x.id === id);
    if (i < 0) throw new AppError('Artículo no encontrado.');
    this.d.conocimiento.splice(i, 1);
    this.auditar(actor, 'eliminar', 'articulo', id);
    this.guardar();
  }

  // ------------------------------------------------------------ Clientes
  listarLeads(actor) {
    actor = this.actor(actor);
    if (can(actor, 'clientes.verTodos')) return this.d.leads.map((l) => ({ ...l }));
    assertCan(actor, 'clientes.verPropios');
    return this.d.leads.filter((l) => l.asesorId === actor.id).map((l) => ({ ...l }));
  }

  guardarLead(actor, input) {
    actor = this.actor(actor);
    assertCan(actor, 'clientes.editar');
    const existente = input.id ? this.d.leads.find((x) => x.id === input.id) : null;
    if (input.id && !existente) throw new AppError('Cliente no encontrado.');
    if (existente && existente.asesorId !== actor.id && !can(actor, 'clientes.verTodos')) throw new PermissionError('clientes.editar');
    // Una vez marcado "no contactar" no se puede revertir desde la edición normal
    const noContactar = existente?.noContactar || input.noContactar === true;
    const v = validarLead({ ...input, noContactar, proximaFecha: noContactar ? '' : input.proximaFecha });
    if (!v.ok) throw new AppError('Revisa los datos del cliente.', v.errors);
    let lead = { ...v.value, id: existente?.id || uid(), asesorId: existente?.asesorId || actor.id, creado: existente?.creado || this.hoyISO(), actualizado: this.ahoraISO() };
    if (noContactar) lead = aplicarNoContactar(lead);
    if (existente) Object.assign(existente, lead); else this.d.leads.push(lead);
    this.auditar(actor, existente ? 'actualizar' : 'crear', 'cliente', lead.id, { etapa: lead.etapa, noContactar: lead.noContactar });
    this.guardar();
    return { ...lead };
  }

  marcarNoContactar(actor, id) {
    actor = this.actor(actor);
    assertCan(actor, 'clientes.editar');
    const l = this.d.leads.find((x) => x.id === id);
    if (!l) throw new AppError('Cliente no encontrado.');
    if (l.asesorId !== actor.id && !can(actor, 'clientes.verTodos')) throw new PermissionError('clientes.editar');
    Object.assign(l, aplicarNoContactar(l));
    this.auditar(actor, 'no_contactar', 'cliente', id);
    this.guardar();
  }

  eliminarLead(actor, id) {
    actor = this.actor(actor);
    assertCan(actor, 'clientes.eliminar');
    const i = this.d.leads.findIndex((x) => x.id === id);
    if (i < 0) throw new AppError('Cliente no encontrado.');
    this.d.leads.splice(i, 1);
    this.auditar(actor, 'eliminar', 'cliente', id);
    this.guardar();
  }

  // ------------------------------------------------------------ Servicio técnico
  listarCasos(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.verCasos');
    return this.d.casos.map((c) => structuredClone(c));
  }

  crearCaso(actor, input) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.crearCaso');
    const v = validarCaso(input);
    if (!v.ok) throw new AppError('Revisa los datos del caso.', v.errors);
    const numero = (this.d.casos.reduce((m, c) => Math.max(m, c.numero || 0), 0) || 0) + 1;
    const caso = { ...v.value, id: uid(), numero, estado: 'recibido', hallazgos: [], calidad: {}, clienteAprobo: false, historial: [], recibidoPor: actor.id, creado: this.ahoraISO() };
    this.d.casos.push(caso);
    this.auditar(actor, 'crear', 'caso', caso.id, { numero, modelo: caso.modelo });
    this.guardar();
    return structuredClone(caso);
  }

  _caso(id) {
    const c = this.d.casos.find((x) => x.id === id);
    if (!c) throw new AppError('Caso no encontrado.');
    return c;
  }

  agregarHallazgo(actor, id, h) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.crearCaso');
    if (pareceDatoSensible(h.texto) || pareceDatoSensible(h.evidencia)) throw new AppError('No se deben registrar contraseñas ni códigos del cliente.');
    const r = agregarHallazgo(this._caso(id), actor, h);
    if (!r.ok) throw new AppError(r.error);
    Object.assign(this._caso(id), r.caso);
    this.auditar(actor, 'hallazgo', 'caso', id, { tipo: h.tipo });
    this.guardar();
  }

  marcarAprobacionCliente(actor, id, aprobo) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.crearCaso');
    const c = this._caso(id);
    if (c.estado !== 'cotizado') throw new AppError('Solo se registra la aprobación cuando el caso está cotizado.');
    c.clienteAprobo = !!aprobo;
    this.auditar(actor, 'aprobacion_cliente', 'caso', id, { aprobo: !!aprobo });
    this.guardar();
  }

  marcarControl(actor, id, control, valor) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.diagnosticar');
    const c = this._caso(id);
    if (c.estado !== 'calidad') throw new AppError('Los controles se marcan cuando el caso está en control de calidad.');
    if (!CONTROLES_CALIDAD.includes(control) || !['ok', 'falla', 'na', ''].includes(valor)) throw new AppError('Control no válido.');
    c.calidad = { ...c.calidad, [control]: valor };
    this.guardar();
  }

  cambiarEstadoCaso(actor, id, nuevo) {
    actor = this.actor(actor);
    assertCan(actor, 'tecnico.verCasos');
    const r = cambiarEstado(this._caso(id), actor, nuevo);
    if (!r.ok) throw new AppError(r.error, r.pendientes || []);
    Object.assign(this._caso(id), r.caso);
    this.auditar(actor, 'cambiar_estado', 'caso', id, { estado: nuevo });
    this.guardar();
  }

  // ------------------------------------------------------------ Academia
  lecciones(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'academia.estudiar');
    return leccionesParaRol(this.d.lecciones, actor.rol);
  }

  progreso(actor, userId) {
    actor = this.actor(actor);
    const objetivo = userId || actor.id;
    if (objetivo !== actor.id) assertCan(actor, 'academia.verProgresoEquipo');
    return structuredClone(this.d.progreso[objetivo] || {});
  }

  responderQuiz(actor, leccionId, respuestas) {
    actor = this.actor(actor);
    assertCan(actor, 'academia.estudiar');
    const l = this.d.lecciones.find((x) => x.id === leccionId);
    if (!l) throw new AppError('Lección no encontrada.');
    const r = calificarQuiz(l, respuestas);
    if (!r.ok) throw new AppError(r.error);
    this.d.progreso[actor.id] = registrarIntento(this.d.progreso[actor.id], leccionId, r, this.ahoraISO());
    this.auditar(actor, 'quiz', 'leccion', leccionId, { nota: Math.round(r.nota * 100) });
    this.guardar();
    return r;
  }

  guardarRoleplay(actor, escenarioId, evaluacion) {
    actor = this.actor(actor);
    assertCan(actor, 'academia.estudiar');
    const lista = this.d.roleplays[actor.id] || [];
    lista.push({ escenarioId, nota: evaluacion.nota, faltasEticas: evaluacion.faltasEticas, fecha: this.ahoraISO() });
    this.d.roleplays[actor.id] = lista.slice(-50);
    this.auditar(actor, 'simulacion', 'escenario', escenarioId, { nota: Math.round(evaluacion.nota * 100) });
    this.guardar();
  }

  asignar(actor, { userId, leccionId, fechaLimite }) {
    actor = this.actor(actor);
    assertCan(actor, 'academia.asignar');
    if (!this.d.usuarios.some((u) => u.id === userId && u.activo)) throw new AppError('Usuario no válido.');
    if (!this.d.lecciones.some((l) => l.id === leccionId)) throw new AppError('Lección no válida.');
    if (fechaLimite && !/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) throw new AppError('Fecha límite no válida.');
    if (this.d.asignaciones.some((a) => a.userId === userId && a.leccionId === leccionId)) throw new AppError('Esa lección ya está asignada a esta persona.');
    const a = { id: uid(), userId, leccionId, fechaLimite: fechaLimite || '', asignadoPor: actor.id, fecha: this.hoyISO() };
    this.d.asignaciones.push(a);
    this.auditar(actor, 'asignar', 'leccion', leccionId, { userId });
    this.guardar();
    return a;
  }

  asignacionesDe(actor, userId) {
    actor = this.actor(actor);
    const objetivo = userId || actor.id;
    if (objetivo !== actor.id) assertCan(actor, 'academia.verProgresoEquipo');
    const prog = this.d.progreso[objetivo] || {};
    return this.d.asignaciones.filter((a) => a.userId === objetivo).map((a) => ({ ...a, estado: estadoAsignacion(a, prog, this.hoyISO()) }));
  }

  validarCompetencia(actor, { userId, competencia, observacion }) {
    actor = this.actor(actor);
    assertCan(actor, 'academia.validarCompetencia');
    if (userId === actor.id) throw new AppError('No puedes validar tus propias competencias.');
    if (!this.d.usuarios.some((u) => u.id === userId)) throw new AppError('Usuario no válido.');
    const nombre = String(competencia || '').trim();
    if (nombre.length < 3) throw new AppError('Indica la competencia validada.');
    const c = { id: uid(), userId, competencia: nombre.slice(0, 100), observacion: String(observacion || '').trim().slice(0, 300), validadoPor: actor.id, fecha: this.hoyISO() };
    this.d.competencias.push(c);
    this.auditar(actor, 'validar_competencia', 'usuario', userId, { competencia: c.competencia });
    this.guardar();
    return c;
  }

  competenciasDe(actor, userId) {
    actor = this.actor(actor);
    const objetivo = userId || actor.id;
    if (objetivo !== actor.id) assertCan(actor, 'academia.verProgresoEquipo');
    return this.d.competencias.filter((c) => c.userId === objetivo);
  }

  // ------------------------------------------------------------ Métricas y auditoría
  metricas(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'metricas.ver');
    const equipo = this.d.usuarios.filter((u) => u.activo).map((u) => {
      const lecs = leccionesParaRol(this.d.lecciones, u.rol);
      const prog = this.d.progreso[u.id] || {};
      const res = resumenProgreso(lecs, prog);
      const rps = this.d.roleplays[u.id] || [];
      return {
        id: u.id, nombre: u.nombre, rol: u.rol, avance: res.avance, aprobadas: res.aprobadas, total: res.total, promedio: res.promedio,
        diasCapacitacion: diasHastaCompletar(u.creado, lecs, prog),
        simulaciones: rps.length, faltasEticas: rps.reduce((s, r) => s + (r.faltasEticas || 0), 0)
      };
    });
    const casos = this.d.casos;
    const entregados = casos.filter((c) => c.estado === 'entregado');
    return {
      equipo,
      embudo: metricasEmbudo(this.d.leads),
      tecnico: {
        total: casos.length,
        porEstado: casos.reduce((m, c) => ({ ...m, [c.estado]: (m[c.estado] || 0) + 1 }), {}),
        entregados: entregados.length,
        // Reparaciones repetidas: mismo modelo+número de caso anterior no se puede saber sin IMEI; se cuenta por reingresos marcados
        reingresos: casos.filter((c) => /garant|reingres/i.test(c.antecedentes || '')).length
      },
      catalogo: { equipos: this.d.catalogo.length, demo: this.d.catalogo.filter((e) => e.demo).length },
      conocimiento: { total: this.d.conocimiento.length, verificados: this.d.conocimiento.filter((k) => k.estado === 'verificado').length }
    };
  }

  auditoria(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'auditoria.ver');
    return this.d.auditoria.slice().reverse();
  }

  // ------------------------------------------------------------ Respaldo
  exportar(actor) {
    actor = this.actor(actor);
    assertCan(actor, 'datos.respaldo');
    this.auditar(actor, 'exportar', 'respaldo', '');
    this.guardar();
    return JSON.stringify({ app: 'conectaoctg-smart-assistant', version: SCHEMA_VERSION, exportado: this.ahoraISO(), datos: this.d });
  }

  importar(actor, texto) {
    actor = this.actor(actor);
    assertCan(actor, 'datos.respaldo');
    let obj;
    try { obj = JSON.parse(texto); } catch { throw new AppError('El archivo no es un respaldo válido (JSON incorrecto).'); }
    if (obj?.app !== 'conectaoctg-smart-assistant' || !obj.datos) throw new AppError('El archivo no es un respaldo de esta aplicación.');
    const datos = migrar(obj.datos);
    if (!Array.isArray(datos.usuarios) || !datos.usuarios.some((u) => u.rol === 'admin' && u.activo)) throw new AppError('El respaldo no tiene un administrador activo.');
    this.store.data = datos;
    this.auditar(actor, 'importar', 'respaldo', '', { exportado: String(obj.exportado || '') });
    this.guardar();
  }
}
