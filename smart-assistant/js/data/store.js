// Almacenamiento del MODO LOCAL: un documento JSON en localStorage (o en memoria para pruebas).
// Pensado para evaluar la app en un solo dispositivo. No sincroniza entre equipos.

import { CONOCIMIENTO, LECCIONES, ESCENARIOS, DIAGNOSTICOS, ECREDIT_ETAPAS, POLITICA_GARANTIA, FUENTE_GERENCIA } from './seed.js';
import { POLITICA_BASE } from '../core/garantia.js';

export const SCHEMA_VERSION = 2;

export function estadoInicial() {
  return {
    version: SCHEMA_VERSION,
    config: {
      empresa: 'ConectaOCTG',
      tasaUsuraEA: null, tasaUsuraFuente: '', tasaUsuraFecha: '',
      margenMinimo: null,
      ecreditUrl: '', ecreditContacto: '', ecreditFuente: '', ecreditFecha: '', ecreditResponsable: '',
      garantias: POLITICA_GARANTIA, garantiasFuente: FUENTE_GERENCIA.fuente, garantiasFecha: FUENTE_GERENCIA.actualizado, garantiasResponsable: FUENTE_GERENCIA.responsable,
      ...POLITICA_BASE
    },
    usuarios: [],
    credenciales: {},
    intentos: {},
    catalogo: [],
    conocimiento: structuredClone(CONOCIMIENTO),
    lecciones: structuredClone(LECCIONES),
    escenarios: structuredClone(ESCENARIOS),
    diagnosticos: structuredClone(DIAGNOSTICOS),
    ecreditEtapas: structuredClone(ECREDIT_ETAPAS).map((e) => ({ ...e, fuente: '', actualizado: '', responsable: '' })),
    leads: [],
    casos: [],
    progreso: {},
    roleplays: {},
    asignaciones: [],
    competencias: [],
    auditoria: []
  };
}

/** Almacenamiento en memoria con la misma interfaz que localStorage (para pruebas). */
export class MemoryStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

export class LocalStore {
  constructor(storage, key = 'conectaoctg-smart-assistant') {
    this.storage = storage;
    this.key = key;
    this.data = null;
  }

  load() {
    let raw = null;
    try { raw = this.storage.getItem(this.key); } catch { /* almacenamiento bloqueado */ }
    if (!raw) { this.data = estadoInicial(); return this.data; }
    try {
      const parsed = JSON.parse(raw);
      this.data = migrar(parsed);
    } catch {
      // Datos corruptos: no se sobrescriben en silencio; se guarda copia y se arranca limpio.
      try { this.storage.setItem(this.key + '-corrupto-' + Date.now(), raw); } catch { }
      this.data = estadoInicial();
    }
    return this.data;
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
      return true;
    } catch {
      throw new Error('No se pudo guardar en este dispositivo (¿almacenamiento lleno o bloqueado?).');
    }
  }

  reset() {
    this.data = estadoInicial();
    this.save();
  }
}

/**
 * Actualiza el contenido que viene con la app sin pisar lo editado por la administración:
 * agrega los elementos nuevos y reemplaza los que tengan una versión (v) más reciente,
 * salvo los artículos de conocimiento que la administración ya editó (responsable distinto).
 */
function actualizarContenido(guardados, semilla, { respetarEditados = false } = {}) {
  const out = guardados.slice();
  for (const nuevo of semilla) {
    const i = out.findIndex((x) => x.id === nuevo.id);
    if (i < 0) { out.push(structuredClone(nuevo)); continue; }
    const actual = out[i];
    const editado = respetarEditados && actual.responsable && !['Sin asignar', FUENTE_GERENCIA.responsable].includes(actual.responsable);
    if ((nuevo.v || 1) > (actual.v || 1) && !editado) out[i] = structuredClone(nuevo);
  }
  return out;
}

/** Completa colecciones faltantes al cargar datos de versiones anteriores. */
export function migrar(d) {
  if (!d || typeof d !== 'object') throw new Error('Formato inválido');
  const base = estadoInicial();
  const out = { ...base, ...d, config: { ...base.config, ...(d.config || {}) } };
  for (const k of Object.keys(base)) if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = base[k];
  // v2: política de garantía de la gerencia (solo si la administración no había escrito otra)
  if (!String(out.config.garantias || '').trim()) {
    Object.assign(out.config, { garantias: base.config.garantias, garantiasFuente: base.config.garantiasFuente, garantiasFecha: base.config.garantiasFecha, garantiasResponsable: base.config.garantiasResponsable });
  }
  out.conocimiento = actualizarContenido(out.conocimiento, CONOCIMIENTO, { respetarEditados: true });
  out.lecciones = actualizarContenido(out.lecciones, LECCIONES);
  out.escenarios = actualizarContenido(out.escenarios, ESCENARIOS);
  out.diagnosticos = actualizarContenido(out.diagnosticos, DIAGNOSTICOS);
  out.version = SCHEMA_VERSION;
  return out;
}
