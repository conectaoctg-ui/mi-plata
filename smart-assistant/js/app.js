// Arranque, sesión, navegación por rol y enrutador.
import { LocalStore } from './data/store.js';
import { Repo } from './data/repo.js';
import { can, ROLES } from './core/permissions.js';
import { sesionVigente } from './core/auth.js';
import { $, $$, esc, toast, aplicarBarras, intentar, erroresHTML } from './ui/h.js';

import * as inicio from './ui/inicio.js';
import * as ventas from './ui/ventas.js';
import * as clientes from './ui/clientes.js';
import * as financiacion from './ui/financiacion.js';
import * as tecnico from './ui/tecnico.js';
import * as academia from './ui/academia.js';
import * as buscar from './ui/buscar.js';
import * as admin from './ui/admin.js';

let storage;
try { storage = window.localStorage; storage.getItem('x'); } catch { storage = null; }

const store = new LocalStore(storage || { getItem: () => null, setItem: () => { throw new Error('sin almacenamiento'); }, removeItem() {} });
store.load();
const repo = new Repo(store);
const SESION_KEY = 'conectaoctg-sa-sesion';

// Menú: [ruta, icono, texto, permiso requerido]
const MENU = [
  ['#/inicio', '🏠', 'Inicio', null],
  ['sep', 'Trabajo diario'],
  ['#/ventas', '📱', 'Ventas iPhone', 'catalogo.ver'],
  ['#/clientes', '🤝', 'Clientes', 'clientes.verPropios'],
  ['#/financiacion', '💳', 'Financiación', 'financiacion.simular'],
  ['#/tecnico', '🔧', 'Servicio técnico', 'tecnico.verCasos'],
  ['sep', 'Aprender'],
  ['#/academia', '🎓', 'Academia', 'academia.estudiar'],
  ['#/buscar', '🔎', 'Buscar', 'conocimiento.ver'],
  ['sep', 'Gestión'],
  ['#/admin', '⚙️', 'Administración', 'metricas.ver']
];

const RUTAS = {
  inicio: [inicio, null], ventas: [ventas, 'catalogo.ver'], clientes: [clientes, 'clientes.verPropios'],
  financiacion: [financiacion, 'financiacion.simular'], tecnico: [tecnico, 'tecnico.verCasos'],
  academia: [academia, 'academia.estudiar'], buscar: [buscar, 'conocimiento.ver'], admin: [admin, 'metricas.ver']
};

let usuario = null;

// ---------------- Sesión ----------------
function leerSesion() {
  try { return JSON.parse(sessionStorage.getItem(SESION_KEY) || 'null'); } catch { return null; }
}
function escribirSesion(s) {
  try { s ? sessionStorage.setItem(SESION_KEY, JSON.stringify(s)) : sessionStorage.removeItem(SESION_KEY); } catch { }
}
function tocarSesion() {
  const s = leerSesion();
  if (s) escribirSesion({ ...s, ultimaActividad: Date.now() });
}
function restaurarSesion() {
  const s = leerSesion();
  if (!s || !sesionVigente(s, Date.now())) { escribirSesion(null); return null; }
  const u = store.data.usuarios.find((x) => x.id === s.userId && x.activo);
  return u || null;
}
function cerrarSesion(motivo) {
  repo.cerrarSesion(usuario);
  usuario = null;
  escribirSesion(null);
  location.hash = '#/inicio';
  pantallaAcceso(motivo);
}
['click', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, tocarSesion, { passive: true }));
setInterval(() => {
  if (usuario && !restaurarSesion()) cerrarSesion('Tu sesión se cerró por inactividad.');
}, 30_000);

// ---------------- Pantallas de acceso ----------------
function pantallaAcceso(aviso = '') {
  $('#shell').classList.add('hidden');
  const box = $('#auth');
  box.classList.remove('hidden');
  const primera = repo.necesitaConfiguracion();
  const sinAlmacen = !storage ? '<div class="notice bad">Este navegador no permite guardar datos (modo privado o bloqueado). La app no podrá conservar información.</div>' : '';
  box.innerHTML = `
    <div class="card">
      <div class="logo" aria-hidden="true"></div>
      <h1 class="center">ConectaOCTG Smart Assistant</h1>
      <p class="muted">Capacitación y asistencia para venta y servicio técnico de iPhone.</p>
      ${sinAlmacen}
      ${aviso ? `<div class="notice info">${esc(aviso)}</div>` : ''}
      <div class="notice warn"><strong>Modo local de evaluación.</strong> Los datos se guardan solo en este navegador. No uses datos reales de clientes hasta activar el modo servidor.</div>
      <div id="authErr"></div>
      <form id="authForm" novalidate>
        ${primera ? `
          <h2>Configuración inicial</h2>
          <p class="muted">Crea la cuenta del administrador.</p>
          <label>Nombre<input name="nombre" required autocomplete="name"></label>` : '<h2>Iniciar sesión</h2>'}
        <label>Usuario<input name="usuario" required autocomplete="username" autocapitalize="none"></label>
        <label>Clave<input name="clave" type="password" required autocomplete="${primera ? 'new-password' : 'current-password'}">
          ${primera ? '<span class="hint">Mínimo 6 caracteres. Evita claves obvias como 123456.</span>' : ''}</label>
        <button class="btn primary block" type="submit">${primera ? 'Crear administrador' : 'Entrar'}</button>
      </form>
    </div>`;
  $('#authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button');
    btn.disabled = true;
    const u = await intentar(() => primera
      ? repo.crearPrimerAdmin({ nombre: f.nombre.value, usuario: f.usuario.value, clave: f.clave.value })
      : repo.iniciarSesion(f.usuario.value, f.clave.value), $('#authErr'));
    btn.disabled = false;
    if (u) entrar(u);
  });
}

function entrar(u) {
  usuario = u;
  escribirSesion({ userId: u.id, ultimaActividad: Date.now() });
  $('#auth').classList.add('hidden');
  $('#shell').classList.remove('hidden');
  $('#userChip').textContent = `${u.nombre} · ${ROLES[u.rol]}`;
  pintarMenu();
  if (!location.hash || location.hash === '#/') location.hash = '#/inicio';
  else enrutar();
}

function pintarMenu() {
  const items = MENU.filter((m) => m[0] === 'sep' || !m[3] || can(usuario, m[3]));
  // Quitar separadores sin elementos debajo
  const limpio = items.filter((m, i) => m[0] !== 'sep' || (items[i + 1] && items[i + 1][0] !== 'sep'));
  $('#nav').innerHTML = limpio.map((m) => m[0] === 'sep'
    ? `<div class="sep">${esc(m[1])}</div>`
    : `<a href="${m[0]}"><span aria-hidden="true">${m[1]}</span>${esc(m[2])}</a>`).join('');
}

// ---------------- Enrutador ----------------
async function enrutar() {
  if (!usuario) return;
  // Volver a leer al usuario por si un administrador cambió su rol o lo desactivó
  const fresco = store.data.usuarios.find((x) => x.id === usuario.id && x.activo);
  if (!fresco) return cerrarSesion('Tu usuario fue desactivado.');
  usuario = fresco;
  const partes = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [ruta = 'inicio', ...args] = partes;
  const destino = RUTAS[ruta];
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#/' + ruta));
  cerrarMenuMovil();
  const view = $('#view');
  if (!destino) { view.innerHTML = '<div class="card"><h2>Página no encontrada</h2><a href="#/inicio">Volver al inicio</a></div>'; return; }
  if (destino[1] && !can(usuario, destino[1])) {
    view.innerHTML = '<div class="card" role="alert"><h2>Sin acceso</h2><p>Tu rol no tiene permiso para ver esta sección. Si crees que es un error, habla con el administrador.</p><a class="btn" href="#/inicio">Volver al inicio</a></div>';
    return;
  }
  const ctx = {
    repo, user: usuario, args, view,
    go: (h) => { if (location.hash === h) enrutar(); else location.hash = h; },
    refresh: () => enrutar(),
    toast
  };
  try {
    await destino[0].render(ctx);
    aplicarBarras(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = erroresHTML(e.name === 'PermissionError' || e.name === 'AppError' ? e : { message: 'No se pudo cargar esta sección.' });
  }
  view.focus({ preventScroll: true });
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); enrutar(); });

// Re-aplicar barras cuando una vista vuelve a pintar parte del contenido
new MutationObserver(() => aplicarBarras($('#view'))).observe($('#view'), { childList: true, subtree: true });

// ---------------- Menú móvil ----------------
function cerrarMenuMovil() { $('#nav').classList.remove('open'); $('#backdrop').classList.add('hidden'); }
$('#menuBtn').addEventListener('click', () => { $('#nav').classList.add('open'); $('#backdrop').classList.remove('hidden'); });
$('#backdrop').addEventListener('click', cerrarMenuMovil);
$('#logoutBtn').addEventListener('click', () => cerrarSesion('Sesión cerrada.'));

// ---------------- Inicio ----------------
const previa = restaurarSesion();
if (previa) entrar(previa); else pantallaAcceso();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
