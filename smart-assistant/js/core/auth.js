// Autenticación del MODO LOCAL (un solo dispositivo).
// La clave se guarda como hash PBKDF2-SHA256 con sal aleatoria; nunca en texto plano.
// Limitación: en modo local cualquiera con acceso al navegador puede borrar o alterar
// los datos guardados. Para varios usuarios y dispositivos se requiere el modo servidor.

export const ITERACIONES = 210_000;
export const MAX_INTENTOS = 5;
export const BLOQUEO_MS = 5 * 60 * 1000;
export const SESION_INACTIVA_MS = 30 * 60 * 1000;

const DEBILES = new Set(['123456', '1234567', '12345678', '000000', '111111', '654321', '123123', 'password', 'contraseña', 'conectaoctg', 'iphone']);

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

export function validarClave(clave) {
  const c = String(clave || '');
  if (c.length < 6) return 'La clave debe tener al menos 6 caracteres.';
  if (c.length > 64) return 'La clave es demasiado larga.';
  if (DEBILES.has(c.toLowerCase()) || /^(\d)\1+$/.test(c)) return 'Esa clave es muy fácil de adivinar. Usa otra.';
  return null;
}

export async function hashClave(clave, salHex) {
  const sal = salHex ? fromHex(salHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACIONES }, key, 256);
  return { sal: toHex(sal), hash: toHex(bits), iteraciones: ITERACIONES };
}

/** Comparación en tiempo constante para no filtrar información por tiempos. */
function igual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verificarClave(clave, credencial) {
  if (!credencial?.sal || !credencial?.hash) return false;
  const { hash } = await hashClave(String(clave || ''), credencial.sal);
  return igual(hash, credencial.hash);
}

/** Control de intentos fallidos. Devuelve el nuevo registro de intentos. */
export function registrarFallo(registro = { fallos: 0, bloqueadoHasta: 0 }, ahora) {
  const fallos = registro.fallos + 1;
  return { fallos: fallos >= MAX_INTENTOS ? 0 : fallos, bloqueadoHasta: fallos >= MAX_INTENTOS ? ahora + BLOQUEO_MS : registro.bloqueadoHasta };
}

export function estaBloqueado(registro, ahora) {
  return !!registro && registro.bloqueadoHasta > ahora;
}

export function sesionVigente(sesion, ahora) {
  return !!sesion && ahora - sesion.ultimaActividad < SESION_INACTIVA_MS;
}
