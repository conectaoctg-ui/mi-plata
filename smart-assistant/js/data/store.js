// Almacenamiento del MODO LOCAL: un documento JSON en localStorage (o en memoria para pruebas).
// Pensado para evaluar la app en un solo dispositivo. No sincroniza entre equipos.

import { CONOCIMIENTO, LECCIONES, ESCENARIOS, DIAGNOSTICOS, ECREDIT_ETAPAS } from './seed.js';

export const SCHEMA_VERSION = 1;

export function estadoInicial() {
  return {
    version: SCHEMA_VERSION,
    config: {
      empresa: 'ConectaOCTG',
      tasaUsuraEA: null, tasaUsuraFuente: '', tasaUsuraFecha: '',
      margenMinimo: null,
      ecreditUrl: '', ecreditContacto: '', ecreditFuente: '', ecreditFecha: '', ecreditResponsable: '',
      garantias: '', garantiasFuente: '', garantiasFecha: '', garantiasResponsable: ''
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

/** Completa colecciones faltantes al cargar datos de versiones anteriores. */
export function migrar(d) {
  if (!d || typeof d !== 'object') throw new Error('Formato inválido');
  const base = estadoInicial();
  const out = { ...base, ...d, config: { ...base.config, ...(d.config || {}) } };
  for (const k of Object.keys(base)) if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = base[k];
  out.version = SCHEMA_VERSION;
  return out;
}
