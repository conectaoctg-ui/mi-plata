// ===================================================
// MI PLATA - APP LOGIC, CONTROL FAMILIAR, SEGURIDAD & COP
// ===================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 1. CONFIGURACIÓN DE FIREBASE (Proyecto mi-plata-38846)
const firebaseConfig = {
  apiKey: "AIzaSyB2h-iHSZMRgOr-ohBBUmVMPmp1zlqsmW0",
  authDomain: "mi-plata-38846.firebaseapp.com",
  projectId: "mi-plata-38846",
  storageBucket: "mi-plata-38846.firebasestorage.app",
  messagingSenderId: "17405605797",
  appId: "1:17405605797:web:de0d0af0e859e4f6449a4c"
};

let app, auth, db, googleProvider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn("Inicializando Firebase en modo desconectado:", err);
}

// 2. ESTADO GLOBAL DE LA APLICACIÓN
const STORAGE_KEY = "mi_plata_db_v1";
const PIN_STORAGE_KEY = "mi_plata_pin_v1";

const DATOS_INICIALES = {
  deudas: [],
  abonos: [],
  fijos: [
    {
      id: "f-mtj3pqay75cv",
      concepto: "arriendo casa",
      quien: "señora estela",
      monto: 600000,
      categoria: "Arriendo",
      dia: 10,
      activo: true
    }
  ],
  pagosFijos: [],
  gastos: [],
  whitelist: [], // Lista de correos autorizados de la familia
  gamification: {
    bonusXp: 0,
    ultimoNivelNotificado: 1
  }
};

let state = {
  currentUser: null,
  activeTab: 'resumen',
  filtroDeudas: 'todos',
  selectedDate: new Date(2026, 8, 1), // Septiembre 2026
  unsubscribeFirestore: null,
  isSyncing: false,
  isPinUnlocked: false,
  currentPinBuffer: "",
  data: loadInitialData()
};

function loadInitialData() {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        deudas: parsed.deudas || [],
        abonos: parsed.abonos || [],
        fijos: parsed.fijos || DATOS_INICIALES.fijos,
        pagosFijos: parsed.pagosFijos || [],
        gastos: parsed.gastos || [],
        whitelist: parsed.whitelist || [],
        gamification: parsed.gamification || DATOS_INICIALES.gamification
      };
    }
  } catch (e) {
    console.error("Error leyendo localStorage:", e);
  }
  return JSON.parse(JSON.stringify(DATOS_INICIALES));
}

function saveDataLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
}

// ================= GESTIÓN DEL PIN DE SEGURIDAD =================
window.ingresarModoLocalPIN = function() {
  document.getElementById('authGateScreen')?.classList.add('hidden');
  document.getElementById('pinLockScreen')?.classList.remove('hidden');
  document.getElementById('app')?.classList.add('hidden');
};

function getStoredPIN() {
  return localStorage.getItem(PIN_STORAGE_KEY) || "1234";
}

function setStoredPIN(newPin) {
  localStorage.setItem(PIN_STORAGE_KEY, newPin);
}

window.ingresarDigitoPIN = function(digit) {
  if (state.currentPinBuffer.length >= 4) return;
  state.currentPinBuffer += digit;
  actualizarPuntosPIN();

  if (state.currentPinBuffer.length === 4) {
    setTimeout(verificarPIN, 150);
  }
};

window.borrarDigitoPIN = function() {
  if (state.currentPinBuffer.length > 0) {
    state.currentPinBuffer = state.currentPinBuffer.slice(0, -1);
    actualizarPuntosPIN();
  }
};

function actualizarPuntosPIN() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (dot) {
      dot.classList.toggle('filled', i < state.currentPinBuffer.length);
    }
  }
  const errEl = document.getElementById('pinErrorText');
  if (errEl) errEl.classList.remove('show');
}

function verificarPIN() {
  const pinGuardado = getStoredPIN();
  const errEl = document.getElementById('pinErrorText');

  if (state.currentPinBuffer === pinGuardado) {
    state.isPinUnlocked = true;
    state.currentPinBuffer = "";
    actualizarPuntosPIN();

    document.getElementById('pinLockScreen')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
    renderAll();
    showToast("🔓 Mi Plata Desbloqueada");
  } else {
    if (errEl) errEl.classList.add('show');
    state.currentPinBuffer = "";
    setTimeout(actualizarPuntosPIN, 400);
  }
}

window.bloquearAppManual = function() {
  state.isPinUnlocked = false;
  state.currentPinBuffer = "";
  actualizarPuntosPIN();
  document.getElementById('app')?.classList.add('hidden');
  document.getElementById('pinLockScreen')?.classList.remove('hidden');
};

window.bloquearCerrarSesion = function() {
  window.bloquearAppManual();
};

window.cambiarUsuarioPIN = async function() {
  if (auth) {
    await signOut(auth);
  }
  state.isPinUnlocked = false;
  document.getElementById('pinLockScreen')?.classList.add('hidden');
  document.getElementById('authGateScreen')?.classList.remove('hidden');
};

window.abrirModalCambiarPIN = function() {
  document.getElementById('inputNuevoPIN').value = '';
  document.getElementById('inputConfirmarPIN').value = '';
  window.openModal('modalCambiarPIN');
};

window.handleGuardarNuevoPIN = function(e) {
  e.preventDefault();
  const p1 = document.getElementById('inputNuevoPIN').value.trim();
  const p2 = document.getElementById('inputConfirmarPIN').value.trim();

  if (p1.length !== 4 || !/^\d{4}$/.test(p1)) {
    alert("El PIN debe contener exactamente 4 dígitos numéricos.");
    return;
  }
  if (p1 !== p2) {
    alert("Los dos campos de PIN no coinciden. Por favor verifica.");
    return;
  }

  setStoredPIN(p1);
  window.closeModal('modalCambiarPIN');
  showToast("🔒 Nuevo PIN guardado exitosamente");
};

// ================= LISTA BLANCA DE CORREOS FAMILIARES =================
function renderWhitelistEmails() {
  const container = document.getElementById('whitelistEmailsContainer');
  if (!container) return;

  const emails = state.data.whitelist || [];
  if (emails.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No hay correos adicionales agregados. Solo el correo principal tiene acceso.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = emails.map(email => `
    <div class="item-row">
      <div class="item-left">
        <span style="font-size: 1.2rem;">👤</span>
        <div>
          <strong>${email}</strong>
          <span class="badge badge-emerald" style="margin-left: 6px;">Permitido</span>
        </div>
      </div>
      <button class="btn-icon-danger" title="Eliminar permiso" onclick="window.eliminarCorreoFamilia('${email}')">
        🗑️
      </button>
    </div>
  `).join('');
}

window.handleAgregarCorreoFamilia = function(e) {
  e.preventDefault();
  const input = document.getElementById('inputNuevoCorreoFamilia');
  const email = input.value.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    alert("Por favor ingresa un correo electrónico válido.");
    return;
  }

  if (!state.data.whitelist) state.data.whitelist = [];
  if (state.data.whitelist.includes(email)) {
    alert("Este correo ya está en la lista blanca de la familia.");
    return;
  }

  state.data.whitelist.push(email);
  input.value = '';
  saveDataLocal();
  sincronizarConNube();
  renderWhitelistEmails();
  showToast(`✅ Permiso familiar otorgado a ${email}`);
};

window.eliminarCorreoFamilia = function(email) {
  if (!confirm(`¿Deseas retirar el acceso a ${email}? Ya no podrá ver ni editar los datos familiares.`)) return;
  state.data.whitelist = (state.data.whitelist || []).filter(e => e !== email);
  saveDataLocal();
  sincronizarConNube();
  renderWhitelistEmails();
  showToast(`🗑️ Acceso revocado a ${email}`);
};

// ================= MOTOR DE CONFETI (PURE JS CANVAS) =================
let confettiActive = false;
window.lanzarConfeti = function(durationMs = 2500) {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#10b981', '#059669', '#34d399', '#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
  const count = 120;

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      w: Math.random() * 10 + 6,
      h: Math.random() * 8 + 4,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.8) * 16 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.35 + Math.random() * 0.2,
      opacity: 1
    });
  }

  const startTime = Date.now();
  confettiActive = true;

  function renderFrame() {
    if (!confettiActive) return;
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;

      if (elapsed > durationMs - 800) {
        p.opacity = Math.max(0, p.opacity - 0.03);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < durationMs) {
      requestAnimationFrame(renderFrame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiActive = false;
    }
  }

  requestAnimationFrame(renderFrame);
};

// ================= SISTEMA DE NIVELES & GAMIFICACIÓN =================
const NIVELES = [
  { nivel: 1, minXp: 0, maxXp: 149, icono: '🌱', nombre: 'Semilla del Ahorro', frase: 'Dando los primeros pasos para organizar tus bolsillos.' },
  { nivel: 2, minXp: 150, maxXp: 399, icono: '🪙', nombre: 'Organizador de Bolsillos', frase: 'Tus gastos fijos bajo control y cuentas al día.' },
  { nivel: 3, minXp: 400, maxXp: 799, icono: '🛡️', nombre: 'Guerrero Sin Culebras', frase: 'Deudas liquidadas y disciplina en cada quincena.' },
  { nivel: 4, minXp: 800, maxXp: 1499, icono: '🦅', nombre: 'Halcón Financiero', frase: 'Visión clara y control absoluto de todo tu dinero.' },
  { nivel: 5, minXp: 1500, maxXp: 999999, icono: '👑', nombre: 'Patrón de Mi Plata', frase: '¡Libertad financiera total! Eres el dueño de tu tranquilidad.' }
];

const CITAS_MOTIVACIONALES = [
  "¡Esa platica quedó bien administrada! La tranquilidad financiera no tiene precio.",
  "¡Deuda saldada, mente despejada! Vas por el camino de la verdadera libertad.",
  "Un gasto fijo pagado a tiempo es un dolor de cabeza menos este mes.",
  "El que organiza sus pesos hoy, no sufre por millones mañana.",
  "La disciplina en tus cuentas se nota en tu paz mental. ¡Felicitaciones!",
  "¡Cada registro familiar nos acerca a las metas de nuestro hogar!"
];

function getFraseAleatoria() {
  return CITAS_MOTIVACIONALES[Math.floor(Math.random() * CITAS_MOTIVACIONALES.length)];
}

function calcularProgresoGamificacion() {
  const data = state.data;
  let xp = Number(data.gamification?.bonusXp || 0);

  const pagosFijosCount = (data.pagosFijos || []).length;
  xp += pagosFijosCount * 50;

  let deudasSaldadas = 0;
  let cobrosCompletados = 0;
  (data.deudas || []).forEach(d => {
    const abonos = (data.abonos || []).filter(a => a.deudaId === d.id).reduce((s, a) => s + Number(a.monto || 0), 0);
    const saldo = Math.max(0, Number(d.montoTotal || 0) - abonos);
    if (saldo === 0 && Number(d.montoTotal) > 0) {
      if (d.tipo === 'debo') {
        deudasSaldadas++;
        xp += 150;
      } else {
        cobrosCompletados++;
        xp += 100;
      }
    }
  });

  const abonosCount = (data.abonos || []).length;
  xp += abonosCount * 25;

  const gastosCount = (data.gastos || []).length;
  xp += gastosCount * 10;

  if (state.currentUser) {
    xp += 50;
  }

  let nivelActual = NIVELES[0];
  let sigNivel = NIVELES[1];

  for (let i = 0; i < NIVELES.length; i++) {
    if (xp >= NIVELES[i].minXp) {
      nivelActual = NIVELES[i];
      sigNivel = NIVELES[i + 1] || NIVELES[i];
    }
  }

  let pctNivel = 100;
  let xpFaltante = 0;
  if (sigNivel && sigNivel.nivel !== nivelActual.nivel) {
    const rangoNivel = sigNivel.minXp - nivelActual.minXp;
    const progresoEnNivel = xp - nivelActual.minXp;
    pctNivel = Math.min(100, Math.max(0, Math.round((progresoEnNivel / rangoNivel) * 100)));
    xpFaltante = sigNivel.minXp - xp;
  }

  const medallas = [
    { id: 'm1', icono: '🏆', nombre: 'Paz y Salvo', desc: 'Liquida una deuda al 100%', desbloqueada: deudasSaldadas > 0 },
    { id: 'm2', icono: '📌', nombre: 'Mes Impecable', desc: 'Paga un gasto fijo a tiempo', desbloqueada: pagosFijosCount > 0 },
    { id: 'm3', icono: '🦅', nombre: 'Cobrador Pro', desc: 'Recupera un préstamo completo', desbloqueada: cobrosCompletados > 0 },
    { id: 'm4', icono: '⚡', nombre: 'Anotador Activo', desc: 'Registra 5 o más gastos', desbloqueada: gastosCount >= 5 },
    { id: 'm5', icono: '☁️', nombre: 'Blindado Nube', desc: 'Sincroniza con Google', desbloqueada: !!state.currentUser },
    { id: 'm6', icono: '👑', nombre: 'Patrón Supremo', desc: 'Alcanza el Nivel 5', desbloqueada: nivelActual.nivel >= 5 }
  ];

  return {
    xp,
    nivelActual,
    sigNivel,
    pctNivel,
    xpFaltante,
    deudasSaldadas,
    cobrosCompletados,
    pagosFijosCount,
    medallas
  };
}

function renderGamificacionUI() {
  const info = calcularProgresoGamificacion();

  const headerIcon = document.getElementById('headerLevelIcon');
  const headerTitle = document.getElementById('headerLevelTitle');
  const headerBar = document.getElementById('headerLevelBar');
  const headerXp = document.getElementById('headerXpText');

  if (headerIcon) headerIcon.innerText = info.nivelActual.icono;
  if (headerTitle) headerTitle.innerText = `Nvl ${info.nivelActual.nivel} • ${info.nivelActual.nombre.split(' ')[0]}`;
  if (headerBar) headerBar.style.width = `${info.pctNivel}%`;
  if (headerXp) headerXp.innerText = `${info.xp} XP`;

  const dashAvatar = document.getElementById('dashGamAvatar');
  const dashTier = document.getElementById('dashGamTier');
  const dashPhrase = document.getElementById('dashGamPhrase');
  const dashBar = document.getElementById('dashGamBar');
  const dashSub = document.getElementById('dashGamSub');

  if (dashAvatar) dashAvatar.innerText = info.nivelActual.icono;
  if (dashTier) dashTier.innerText = `Nivel ${info.nivelActual.nivel} • ${info.nivelActual.nombre}`;
  if (dashPhrase) dashPhrase.innerText = info.nivelActual.frase;
  if (dashBar) dashBar.style.width = `${info.pctNivel}%`;
  if (dashSub) {
    dashSub.innerText = info.xpFaltante > 0 
      ? `${info.xp} XP • Faltan ${info.xpFaltante} XP para Nivel ${info.sigNivel.nivel}`
      : `${info.xp} XP • ¡Nivel Máximo Alcanzado! 👑`;
  }

  const modalIcon = document.getElementById('modalTrophyIcon');
  const modalBadge = document.getElementById('modalLevelBadge');
  const modalTitle = document.getElementById('modalLevelTitle');
  const modalDesc = document.getElementById('modalLevelDesc');
  const modalXpTotal = document.getElementById('modalXpTotal');
  const modalXpBar = document.getElementById('modalXpBar');
  const modalXpNext = document.getElementById('modalXpNextDetail');

  if (modalIcon) modalIcon.innerText = info.nivelActual.icono;
  if (modalBadge) modalBadge.innerText = `Nivel ${info.nivelActual.nivel}`;
  if (modalTitle) modalTitle.innerText = info.nivelActual.nombre;
  if (modalDesc) modalDesc.innerText = info.nivelActual.frase;
  if (modalXpTotal) modalXpTotal.innerText = `${info.xp} XP`;
  if (modalXpBar) modalXpBar.style.width = `${info.pctNivel}%`;
  if (modalXpNext) {
    modalXpNext.innerText = info.xpFaltante > 0 
      ? `Te faltan ${info.xpFaltante} XP para desbloquear el Nivel ${info.sigNivel.nivel}: ${info.sigNivel.nombre}`
      : `¡Has alcanzado el rango máximo de Libertad Financiera! 👑`;
  }

  const roadmapEl = document.getElementById('levelsRoadmapList');
  if (roadmapEl) {
    roadmapEl.innerHTML = NIVELES.map(n => {
      const esActual = n.nivel === info.nivelActual.nivel;
      const esSuperado = n.nivel < info.nivelActual.nivel;
      return `
        <div class="level-step ${esActual ? 'active' : (esSuperado ? '' : 'locked')}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">${n.icono}</span>
            <div>
              <strong>Nivel ${n.nivel}: ${n.nombre}</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${n.frase}</div>
            </div>
          </div>
          <div>
            ${esSuperado ? '<span class="badge badge-emerald">✓ Logrado</span>' : (esActual ? '<span class="badge badge-amber">⭐ Nivel Actual</span>' : `<span class="badge badge-gray">${n.minXp} XP</span>`)}
          </div>
        </div>
      `;
    }).join('');
  }

  const medalsEl = document.getElementById('medalsGridList');
  if (medalsEl) {
    medalsEl.innerHTML = info.medallas.map(m => `
      <div class="medal-card ${m.desbloqueada ? 'unlocked' : 'locked'}">
        <span class="medal-icon">${m.desbloqueada ? m.icono : '🔒'}</span>
        <span class="medal-name">${m.nombre}</span>
        <span class="medal-desc">${m.desc}</span>
        <span class="badge ${m.desbloqueada ? 'badge-emerald' : 'badge-gray'}" style="margin-top: 4px;">
          ${m.desbloqueada ? 'Desbloqueado' : 'Bloqueado'}
        </span>
      </div>
    `).join('');
  }
}

window.mostrarCelebracion = function(icono, titulo, xpGanada, mensaje, cita) {
  window.lanzarConfeti(3000);

  const celebIcon = document.getElementById('celebIcon');
  const celebTitle = document.getElementById('celebTitle');
  const celebXp = document.getElementById('celebXpBadge');
  const celebMsg = document.getElementById('celebMessage');
  const celebQuote = document.getElementById('celebQuoteText');

  if (celebIcon) celebIcon.innerText = icono || '🎉';
  if (celebTitle) celebTitle.innerText = titulo || '¡FELICITACIONES!';
  if (celebXp) celebXp.innerText = `+${xpGanada || 50} XP Ganados`;
  if (celebMsg) celebMsg.innerText = mensaje || '¡Excelente disciplina financiera!';
  if (celebQuote) celebQuote.innerText = `"${cita || getFraseAleatoria()}"`;

  window.openModal('modalCelebracion');
};

// ================= SIMULADOR DE INTERÉS COMPUESTO =================
window.setSimYears = function(years) {
  const hiddenInput = document.getElementById('simAnios');
  if (hiddenInput) hiddenInput.value = years;
  document.querySelectorAll('.chip-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(`${years} año`));
  });
  window.calcularSimuladorInteres();
};

window.calcularSimuladorInteres = function() {
  const p0 = parseMontoCOP(document.getElementById('simMontoInicial')?.value || 0);
  const pmt = parseMontoCOP(document.getElementById('simAporteMensual')?.value || 0);
  const tasaEA = parseFloat(document.getElementById('simTasaAnual')?.value || 0.12);
  const anios = parseInt(document.getElementById('simAnios')?.value || 10, 10);

  // Tasa periódica mensual efectiva
  const tasaMensual = Math.pow(1 + tasaEA, 1 / 12) - 1;
  const meses = anios * 12;

  let balance = p0;
  for (let m = 1; m <= meses; m++) {
    balance = (balance + pmt) * (1 + tasaMensual);
  }

  const totalAportado = p0 + (pmt * meses);
  const totalGanancias = Math.max(0, balance - totalAportado);
  const totalFinal = Math.round(balance);

  const elAportado = document.getElementById('simTotalAportado');
  const elGanancias = document.getElementById('simTotalGanancias');
  const elFinal = document.getElementById('simTotalFinal');
  const barCapital = document.getElementById('simBarCapital');
  const barInterest = document.getElementById('simBarInterest');

  if (elAportado) elAportado.innerText = formatCOP(totalAportado);
  if (elGanancias) elGanancias.innerText = `+ ${formatCOP(totalGanancias)}`;
  if (elFinal) elFinal.innerText = formatCOP(totalFinal);

  if (barCapital && barInterest && totalFinal > 0) {
    const pctCapital = Math.round((totalAportado / totalFinal) * 100);
    const pctInterest = 100 - pctCapital;
    barCapital.style.width = `${pctCapital}%`;
    barInterest.style.width = `${pctInterest}%`;
  }
};

// ================= FORMATEADORES Y PARSERS COP =================
export function parseMontoCOP(val) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  let s = String(val).trim().toLowerCase();

  if (/^\$?\s*\d+(\.\d+)?\s*k$/.test(s)) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return Math.round(num * 1000);
  }
  if (/^\$?\s*\d+(\.\d+)?\s*m$/.test(s)) {
    const num = parseFloat(s.replace(/[^0-9.]/g, ''));
    return Math.round(num * 1000000);
  }
  if (s.includes('millon')) {
    const cleaned = s.replace(/millon(es)?/g, '').replace(/\$/g, '').trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 1000000);
  }
  if (s.includes('mil')) {
    const cleaned = s.replace(/mil/g, '').replace(/\$/g, '').trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  const digitsOnly = s.replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

export function formatCOP(valor) {
  const monto = typeof valor === 'number' ? valor : parseMontoCOP(valor);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(monto || 0);
}

export function formatMilesPuntos(num) {
  if (!num && num !== 0) return '';
  const digits = String(num).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function numeroALetrasCOP(num) {
  if (!num || isNaN(num) || num <= 0) return "";
  num = Math.round(num);

  const unidades = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const especiales = {
    10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
    16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
    20: "veinte", 21: "veintiún", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
    25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve"
  };
  const centenas = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function seccion(n) {
    if (n === 0) return "";
    if (n === 100) return "cien";
    let res = "";
    const c = Math.floor(n / 100);
    const du = n % 100;
    const d = Math.floor(du / 10);
    const u = du % 10;

    if (c > 0) res += centenas[c] + " ";
    if (especiales[du]) {
      res += especiales[du];
    } else {
      if (d > 0) {
        res += decenas[d];
        if (u > 0) res += " y " + unidades[u];
      } else if (u > 0) {
        res += unidades[u];
      }
    }
    return res.trim();
  }

  let str = "";
  const millones = Math.floor(num / 1000000);
  const miles = Math.floor((num % 1000000) / 1000);
  const resto = num % 1000;

  if (millones > 0) {
    if (millones === 1) str += "un millón ";
    else str += seccion(millones) + " millones ";
  }
  if (miles > 0) {
    if (miles === 1) str += "mil ";
    else str += seccion(miles) + " mil ";
  }
  if (resto > 0) {
    str += seccion(resto);
  }

  str = str.trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1) + " pesos COP";
}

window.agregarMontoRapido = function(inputId, extra) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const actual = parseMontoCOP(input.value);
  const nuevo = actual + extra;
  input.value = formatMilesPuntos(nuevo);
  actualizarHelperInput(inputId);
};

window.setMontoExacto = function(inputId, valor) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = formatMilesPuntos(valor);
  actualizarHelperInput(inputId);
};

function actualizarHelperInput(inputId) {
  const input = document.getElementById(inputId);
  const helper = document.getElementById(`${inputId}Helper`);
  if (!input || !helper) return;

  const monto = parseMontoCOP(input.value);
  if (monto > 0) {
    const letras = numeroALetrasCOP(monto);
    helper.innerHTML = `💵 <strong>${formatCOP(monto)}</strong> • <em>${letras}</em>`;
    helper.classList.add('active');
  } else {
    helper.innerText = "Ej: 500000 o 500.000";
    helper.classList.remove('active');
  }
}

// ================= SINCRONIZACIÓN FIREBASE (ESPACIO FAMILIAR) =================
const FAMILIA_DOC_ID = "familia_principal";

async function sincronizarConNube() {
  if (!state.currentUser || !db) return;
  state.isSyncing = true;
  updateSyncBadge(true, "Guardando...");

  try {
    const docRef = doc(db, "hogares", FAMILIA_DOC_ID);
    await setDoc(docRef, {
      ...state.data,
      ultimaActualizacion: new Date().toISOString(),
      modificadoPor: state.currentUser.email,
      modificadoPorNombre: state.currentUser.displayName
    }, { merge: true });

    showToast("☁️ Cambios guardados para la familia");
    updateSyncBadge(true, "En la nube (Firebase)");
  } catch (error) {
    console.error("Error al guardar en Firestore:", error);
    updateSyncBadge(false, "Error de sincronización");
    showToast("⚠️ Error al sincronizar con Firebase");
  } finally {
    state.isSyncing = false;
  }
}

function escucharCambiosEnNube() {
  if (state.unsubscribeFirestore) {
    state.unsubscribeFirestore();
  }

  if (!db) return;

  const docRef = doc(db, "hogares", FAMILIA_DOC_ID);
  state.unsubscribeFirestore = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const cloudData = docSnap.data();
      state.data = {
        fijos: cloudData.fijos || state.data.fijos || [],
        gastos: cloudData.gastos || state.data.gastos || [],
        deudas: cloudData.deudas || state.data.deudas || [],
        abonos: cloudData.abonos || state.data.abonos || [],
        pagosFijos: cloudData.pagosFijos || state.data.pagosFijos || [],
        whitelist: cloudData.whitelist || state.data.whitelist || [],
        gamification: cloudData.gamification || state.data.gamification || DATOS_INICIALES.gamification
      };
      saveDataLocal();
      renderAll();
      updateSyncBadge(true, "En la nube (Familia)");
    } else {
      sincronizarConNube();
    }
  }, (error) => {
    console.error("Error en listener de Firestore:", error);
    updateSyncBadge(false, "Modo local");
  });
}

function getMesKey(date = state.selectedDate) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMesNombre(date = state.selectedDate) {
  return date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function getIconoCategoria(cat) {
  const map = {
    'Arriendo': '🏠',
    'Servicios': '💡',
    'Suscripciones': '📺',
    'Alimentación': '🍔',
    'Mercado': '🛒',
    'Transporte': '🚕',
    'Salud': '💊',
    'Educación': '🎓',
    'Entretenimiento': '🍿',
    'Compras': '🛍️',
    'Otros': '📦'
  };
  return map[cat] || '🏷️';
}

// ================= INTERFAZ & NAVEGACIÓN =================
window.switchTab = function(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetPane = document.getElementById(`tab-${tabName}`);
  const targetNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  
  if (targetPane) targetPane.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.abrirModalCobrar = function() {
  const radioMeDeben = document.getElementById('radioMeDeben');
  if (radioMeDeben) radioMeDeben.checked = true;
  document.getElementById('modalDeudaTitle').innerText = "🟢 Registrar Dinero Por Cobrar (Me deben)";
  window.actualizarLabelsModalDeuda();
  window.openModal('modalDeuda');
};

window.abrirModalPagar = function() {
  const radioDebo = document.getElementById('radioDebo');
  if (radioDebo) radioDebo.checked = true;
  document.getElementById('modalDeudaTitle').innerText = "🔴 Registrar Deuda Por Pagar (Yo debo)";
  window.actualizarLabelsModalDeuda();
  window.openModal('modalDeuda');
};

window.actualizarLabelsModalDeuda = function() {
  const esMeDeben = document.getElementById('radioMeDeben')?.checked;
  const labelPersona = document.getElementById('labelDeudaPersona');
  const inputPersona = document.getElementById('deudaPersona');
  const labelConcepto = document.getElementById('labelDeudaConcepto');
  const inputConcepto = document.getElementById('deudaConcepto');
  const labelMonto = document.getElementById('labelDeudaMonto');
  const btnSubmit = document.getElementById('btnGuardarDeudaText');

  if (esMeDeben) {
    if (labelPersona) labelPersona.innerText = "¿A quién le prestaste? (Nombre de la persona) *";
    if (inputPersona) inputPersona.placeholder = "Ej: Carlos Pérez, Juan, Tía Rosa...";
    if (labelConcepto) labelConcepto.innerText = "¿Por qué motivo te debe? (Concepto) *";
    if (inputConcepto) inputConcepto.placeholder = "Ej: Préstamo personal, Arreglo de moto, Almuerzo...";
    if (labelMonto) labelMonto.innerText = "Monto que te deben en Pesos COP *";
    if (btnSubmit) btnSubmit.innerText = "Guardar Dinero Por Cobrar";
  } else {
    if (labelPersona) labelPersona.innerText = "¿A quién le debes? (Nombre de la persona o banco) *";
    if (inputPersona) inputPersona.placeholder = "Ej: Banco Davivienda, Juan Pérez...";
    if (labelConcepto) labelConcepto.innerText = "¿Por qué motivo debes? (Concepto) *";
    if (inputConcepto) inputConcepto.placeholder = "Ej: Tarjeta de crédito, Préstamo familiar...";
    if (labelMonto) labelMonto.innerText = "Monto total que debes en Pesos COP *";
    if (btnSubmit) btnSubmit.innerText = "Guardar Deuda Por Pagar";
  }
};

window.filtrarTipoDeuda = function(tipo) {
  state.filtroDeudas = tipo;
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  if (tipo === 'todos') document.getElementById('subtab-todos')?.classList.add('active');
  if (tipo === 'me_deben') document.getElementById('subtab-cobrar')?.classList.add('active');
  if (tipo === 'debo') document.getElementById('subtab-pagar')?.classList.add('active');
  renderDeudas();
};

window.openModal = function(modalId, params = {}) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('open');

  const todayStr = new Date().toISOString().split('T')[0];
  const gastoFecha = document.getElementById('gastoFecha');
  const abonoFecha = document.getElementById('abonoFecha');
  if (gastoFecha) gastoFecha.value = todayStr;
  if (abonoFecha) abonoFecha.value = todayStr;

  if (modalId === 'modalAbono' && params.deuda) {
    document.getElementById('abonoDeudaId').value = params.deuda.id;
    const esMeDeben = params.deuda.tipo === 'me_deben';
    
    document.getElementById('modalAbonoTitle').innerText = esMeDeben 
      ? "💵 Registrar Abono Recibido (Te pagaron)" 
      : "💵 Registrar Abono Pagado (Tú pagaste)";

    document.getElementById('abonoDeudaInfo').innerHTML = `
      ${esMeDeben ? '🟢 Cobro a' : '🔴 Deuda con'}: <strong>${params.deuda.persona}</strong> • <em>${params.deuda.concepto}</em>
    `;

    document.getElementById('btnGuardarAbonoText').innerText = esMeDeben 
      ? "Guardar Abono Recibido (+25 XP)" 
      : "Guardar Abono Pagado (+25 XP)";
  }

  if (modalId === 'modalLogros') {
    renderGamificacionUI();
  }

  if (modalId === 'modalInteresCompuesto') {
    window.calcularSimuladorInteres();
  }

  ['gastoMonto', 'fijoMonto', 'deudaMonto', 'abonoMonto'].forEach(id => {
    actualizarHelperInput(id);
  });
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateSyncBadge(isOnline, text) {
  const badge = document.getElementById('syncBadge');
  const badgeText = document.getElementById('syncStatusText');
  if (!badge || !badgeText) return;

  if (isOnline) {
    badge.classList.add('online');
  } else {
    badge.classList.remove('online');
  }
  badgeText.innerText = text;
}

// ================= RENDERS =================
function renderAll() {
  renderMonthHeader();
  renderGamificacionUI();
  renderResumen();
  renderFijos();
  renderGastos();
  renderDeudas();
  renderReportes();
  renderWhitelistEmails();
}

function renderMonthHeader() {
  const nameEl = document.getElementById('displayMonthName');
  const subEl = document.getElementById('displayMonthDays');
  if (nameEl) nameEl.innerText = getMesNombre();
  if (subEl) subEl.innerText = `Mes activo: ${getMesKey()}`;
}

function renderResumen() {
  const mesKey = getMesKey();

  const fijosActivos = state.data.fijos.filter(f => f.activo !== false);
  const totalFijosPresupuesto = fijosActivos.reduce((acc, f) => acc + Number(f.monto || 0), 0);

  const pagosMes = state.data.pagosFijos.filter(p => p.mes === mesKey);
  const totalFijosPagados = pagosMes.reduce((acc, p) => acc + Number(p.monto || 0), 0);

  const gastosMes = state.data.gastos.filter(g => (g.fecha || '').startsWith(mesKey));
  const totalGastosDiarios = gastosMes.reduce((acc, g) => acc + Number(g.monto || 0), 0);

  const totalMes = totalFijosPagados + totalGastosDiarios;

  let totalDeudasYoDebo = 0;
  let totalPorCobrar = 0;

  state.data.deudas.forEach(d => {
    const abonos = state.data.abonos.filter(a => a.deudaId === d.id).reduce((sum, a) => sum + Number(a.monto || 0), 0);
    const restante = Math.max(0, Number(d.montoTotal || 0) - abonos);
    if (d.tipo === 'debo') {
      totalDeudasYoDebo += restante;
    } else {
      totalPorCobrar += restante;
    }
  });

  document.getElementById('summaryTotalMes').innerText = formatCOP(totalMes);
  document.getElementById('summaryFijosMes').innerText = formatCOP(totalFijosPresupuesto);
  document.getElementById('summaryPorCobrar').innerText = formatCOP(totalPorCobrar);
  document.getElementById('summaryDeudas').innerText = formatCOP(totalDeudasYoDebo);

  const fijosPagadosCount = pagosMes.length;
  const fijosTotalCount = fijosActivos.length;
  const pctFijos = fijosTotalCount > 0 ? (fijosPagadosCount / fijosTotalCount) * 100 : 0;
  
  document.getElementById('summaryFijosBar').style.width = `${pctFijos}%`;
  document.getElementById('summaryFijosProgressText').innerText = `${fijosPagadosCount} de ${fijosTotalCount} pagados (${formatCOP(totalFijosPagados)})`;

  renderResumenLists(fijosActivos, pagosMes, gastosMes);
}

function renderResumenLists(fijosActivos, pagosMes, gastosMes) {
  const fijosListEl = document.getElementById('resumenFijosList');
  const gastosListEl = document.getElementById('resumenGastosList');

  if (fijosListEl) {
    if (fijosActivos.length === 0) {
      fijosListEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📌</div>No tienes gastos fijos registrados.</div>`;
    } else {
      fijosListEl.innerHTML = fijosActivos.map(f => {
        const estaPagado = pagosMes.some(p => p.fijoId === f.id);
        return `
          <div class="item-row">
            <div class="item-left">
              <div class="item-icon">${getIconoCategoria(f.categoria)}</div>
              <div class="item-details">
                <h4>${f.concepto}</h4>
                <p>Día límite: ${f.dia} ${f.quien ? `• ${f.quien}` : ''}</p>
              </div>
            </div>
            <div class="item-right">
              <div>
                <div class="item-amount">${formatCOP(f.monto)}</div>
                <span class="badge ${estaPagado ? 'badge-emerald' : 'badge-rose'}">
                  ${estaPagado ? '✓ Pagado' : '⏳ Pendiente'}
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (gastosListEl) {
    if (gastosMes.length === 0) {
      gastosListEl.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div>Sin gastos diarios en este mes.</div>`;
    } else {
      const ultimos = [...gastosMes].reverse().slice(0, 4);
      gastosListEl.innerHTML = ultimos.map(g => `
        <div class="item-row">
          <div class="item-left">
            <div class="item-icon">${getIconoCategoria(g.categoria)}</div>
            <div class="item-details">
              <h4>${g.concepto}</h4>
              <p>${g.fecha} • ${g.categoria || 'Gasto'}</p>
            </div>
          </div>
          <div class="item-right">
            <span class="item-amount text-rose">- ${formatCOP(g.monto)}</span>
          </div>
        </div>
      `).join('');
    }
  }
}

function renderFijos() {
  const container = document.getElementById('fijosContainer');
  if (!container) return;

  const mesKey = getMesKey();
  const fijos = state.data.fijos || [];
  const pagosMes = state.data.pagosFijos.filter(p => p.mes === mesKey);

  const totalPresupuesto = fijos.reduce((s, f) => s + Number(f.monto || 0), 0);
  const totalPagado = pagosMes.reduce((s, p) => s + Number(p.monto || 0), 0);
  const totalPendiente = Math.max(0, totalPresupuesto - totalPagado);

  document.getElementById('fijosTotalPresupuesto').innerText = formatCOP(totalPresupuesto);
  document.getElementById('fijosTotalPagado').innerText = formatCOP(totalPagado);
  document.getElementById('fijosTotalPendiente').innerText = formatCOP(totalPendiente);

  if (fijos.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🏠</div>
        <h3>No tienes gastos fijos registrados</h3>
        <p>Agrega pagos recurrentes como arriendo, luz, agua, internet para llevar el control.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = fijos.map(f => {
    const pago = pagosMes.find(p => p.fijoId === f.id);
    const pagado = !!pago;

    return `
      <div class="fijo-card ${pagado ? 'pagado' : ''}">
        <div>
          <div class="fijo-header">
            <div>
              <h4 class="fijo-title">${f.concepto}</h4>
              ${f.quien ? `<span class="fijo-quien">👤 ${f.quien}</span>` : ''}
            </div>
            <span class="badge ${pagado ? 'badge-emerald' : 'badge-amber'}">
              ${pagado ? '✓ Pagado' : `Día ${f.dia}`}
            </span>
          </div>
          <div class="fijo-monto">${formatCOP(f.monto)}</div>
          <div class="fijo-meta">
            <span class="badge badge-gray">${getIconoCategoria(f.categoria)} ${f.categoria || 'Fijo'}</span>
            <span class="badge badge-gray">Día ${f.dia} de cada mes</span>
          </div>
        </div>

        <div class="fijo-actions">
          ${pagado ? `
            <button class="btn-toggle-pago btn-deshacer" onclick="window.desmarcarPagoFijo('${f.id}')">
              ↩️ Desmarcar Pago
            </button>
          ` : `
            <button class="btn-toggle-pago btn-pagar" onclick="window.marcarPagoFijo('${f.id}')">
              ✓ Marcar como Pagado (+50 XP)
            </button>
          `}
          <button class="btn-icon-danger" title="Eliminar gasto fijo" onclick="window.eliminarFijo('${f.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderGastos() {
  const container = document.getElementById('gastosListContainer');
  if (!container) return;

  const mesKey = getMesKey();
  const search = (document.getElementById('searchGastos')?.value || '').toLowerCase();
  const catFilter = document.getElementById('filterCategoriaGasto')?.value || 'todas';

  let gastos = state.data.gastos.filter(g => (g.fecha || '').startsWith(mesKey));

  if (search) {
    gastos = gastos.filter(g => (g.concepto || '').toLowerCase().includes(search));
  }
  if (catFilter !== 'todas') {
    gastos = gastos.filter(g => g.categoria === catFilter);
  }

  if (gastos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <p>No se encontraron gastos diarios en este mes.</p>
      </div>
    `;
    return;
  }

  gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  container.innerHTML = gastos.map(g => `
    <div class="item-row">
      <div class="item-left">
        <div class="item-icon">${getIconoCategoria(g.categoria)}</div>
        <div class="item-details">
          <h4>${g.concepto}</h4>
          <p>${g.fecha} • ${g.categoria} ${g.medioPago ? `• ${g.medioPago}` : ''}</p>
        </div>
      </div>
      <div class="item-right">
        <span class="item-amount text-rose">- ${formatCOP(g.monto)}</span>
        <button class="btn-icon-danger" onclick="window.eliminarGasto('${g.id}')" title="Eliminar">🗑️</button>
      </div>
    </div>
  `).join('');
}

function renderDeudas() {
  const container = document.getElementById('deudasContainer');
  if (!container) return;

  const deudas = state.data.deudas || [];
  let totalDebo = 0;
  let totalMeDeben = 0;
  let countDebo = 0;
  let countMeDeben = 0;

  deudas.forEach(d => {
    const abonos = (state.data.abonos || []).filter(a => a.deudaId === d.id).reduce((s, a) => s + Number(a.monto || 0), 0);
    const saldo = Math.max(0, Number(d.montoTotal || 0) - abonos);
    if (d.tipo === 'debo') {
      totalDebo += saldo;
      if (saldo > 0) countDebo++;
    } else {
      totalMeDeben += saldo;
      if (saldo > 0) countMeDeben++;
    }
  });

  document.getElementById('totalYoDebo').innerText = formatCOP(totalDebo);
  document.getElementById('countYoDebo').innerText = `${countDebo} cuenta(s) pendiente(s) por pagar`;
  document.getElementById('totalMeDeben').innerText = formatCOP(totalMeDeben);
  document.getElementById('countMeDeben').innerText = `${countMeDeben} persona(s) te deben dinero`;

  let deudasFiltradas = deudas;
  if (state.filtroDeudas !== 'todos') {
    deudasFiltradas = deudas.filter(d => d.tipo === state.filtroDeudas);
  }

  if (deudasFiltradas.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🤝</div>
        <h3>No hay registros en esta sección</h3>
        <p>Utiliza los botones de arriba para registrar dinero que te deben (Por Cobrar) o deudas que tengas pendientes (Por Pagar).</p>
      </div>
    `;
    return;
  }

  container.innerHTML = deudasFiltradas.map(d => {
    const abonos = (state.data.abonos || []).filter(a => a.deudaId === d.id);
    const totalAbonado = abonos.reduce((s, a) => s + Number(a.monto || 0), 0);
    const saldoRestante = Math.max(0, Number(d.montoTotal || 0) - totalAbonado);
    const pct = Number(d.montoTotal) > 0 ? (totalAbonado / Number(d.montoTotal)) * 100 : 0;
    const esPorCobrar = d.tipo === 'me_deben';
    const liquidada = saldoRestante === 0 && Number(d.montoTotal) > 0;

    return `
      <div class="deuda-card ${esPorCobrar ? 'card-cobrar' : 'card-pagar'}">
        <div class="deuda-header">
          <div>
            <span class="badge ${liquidada ? 'badge-amber' : (esPorCobrar ? 'badge-emerald' : 'badge-rose')}">
              ${liquidada ? '🏆 PAZ Y SALVO (Liquidado)' : (esPorCobrar ? '🟢 Por Cobrar (Te Deben)' : '🔴 Por Pagar (Tú Debes)')}
            </span>
            <h4 class="deuda-title" style="margin-top: 6px;">${d.concepto}</h4>
            <span class="deuda-persona">👤 ${d.persona} ${d.fechaLimite ? `• Vence: ${d.fechaLimite}` : ''}</span>
          </div>
          <button class="btn-icon-danger" onclick="window.eliminarDeuda('${d.id}')" title="Eliminar">🗑️</button>
        </div>

        <div class="deuda-balance-box">
          <div class="deuda-balance-item">
            <span>Monto Inicial</span>
            <span>${formatCOP(d.montoTotal)}</span>
          </div>
          <div class="deuda-balance-item">
            <span>${esPorCobrar ? 'Cobrado' : 'Abonado'}</span>
            <span class="text-emerald">${formatCOP(totalAbonado)}</span>
          </div>
          <div class="deuda-balance-item">
            <span>Saldo Pendiente</span>
            <span class="${saldoRestante > 0 ? (esPorCobrar ? 'text-emerald' : 'text-rose') : 'text-emerald'}">
              ${liquidada ? '✓ $ 0 (Pagado)' : formatCOP(saldoRestante)}
            </span>
          </div>
        </div>

        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${pct}%; background: ${liquidada ? '#eab308' : (esPorCobrar ? '#059669' : '#f43f5e')};"></div>
        </div>

        <div>
          <strong>${esPorCobrar ? 'Abonos que te han pagado' : 'Abonos que has pagado'} (${abonos.length}):</strong>
          <div class="abonos-list-box">
            ${abonos.length === 0 ? '<p class="text-muted">Sin abonos registrados aún.</p>' : abonos.map(a => `
              <div class="abono-item">
                <span>${a.fecha} ${a.nota ? `(${a.nota})` : ''}</span>
                <span class="text-emerald">+ ${formatCOP(a.monto)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${!liquidada ? `
          <div style="display: flex; gap: 8px;">
            <button class="${esPorCobrar ? 'btn-emerald' : 'btn-primary'}" style="flex: 1;" onclick="window.abrirModalAbono('${d.id}')">
              💵 ${esPorCobrar ? 'Registrar Abono Recibido' : 'Registrar Abono Pagado'}
            </button>
          </div>
        ` : `
          <div class="badge badge-emerald" style="padding: 8px; text-align: center; justify-content: center;">
            ✨ ¡Cuenta totalmente saldada! Felicitaciones (+150 XP)
          </div>
        `}
      </div>
    `;
  }).join('');
}

function renderReportes() {
  const mesKey = getMesKey();
  const catListEl = document.getElementById('reporteCategoriasList');
  const finTableEl = document.getElementById('reporteResumenFinanciero');
  if (!catListEl || !finTableEl) return;

  const gastosMes = state.data.gastos.filter(g => (g.fecha || '').startsWith(mesKey));
  const pagosFijosMes = state.data.pagosFijos.filter(p => p.mes === mesKey);

  const categoriasMap = {};

  gastosMes.forEach(g => {
    const cat = g.categoria || 'Otros';
    categoriasMap[cat] = (categoriasMap[cat] || 0) + Number(g.monto || 0);
  });

  pagosFijosMes.forEach(p => {
    const fijo = state.data.fijos.find(f => f.id === p.fijoId);
    const cat = fijo ? fijo.categoria : 'Fijos';
    categoriasMap[cat] = (categoriasMap[cat] || 0) + Number(p.monto || 0);
  });

  const totalGasto = Object.values(categoriasMap).reduce((s, v) => s + v, 0);

  if (totalGasto === 0) {
    catListEl.innerHTML = `<div class="empty-state"><p>No hay gastos registrados para este mes.</p></div>`;
  } else {
    const sortedCats = Object.entries(categoriasMap).sort((a, b) => b[1] - a[1]);
    catListEl.innerHTML = sortedCats.map(([cat, monto]) => {
      const pct = ((monto / totalGasto) * 100).toFixed(1);
      return `
        <div class="cat-bar-row">
          <div class="cat-bar-info">
            <span>${getIconoCategoria(cat)} ${cat}</span>
            <span>${formatCOP(monto)} (${pct}%)</span>
          </div>
          <div class="cat-bar-bg">
            <div class="cat-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const totalFijosPagados = pagosFijosMes.reduce((s, p) => s + Number(p.monto || 0), 0);
  const totalDiarios = gastosMes.reduce((s, g) => s + Number(g.monto || 0), 0);

  finTableEl.innerHTML = `
    <div class="fin-row">
      <span>Gastos Fijos pagados este mes:</span>
      <strong>${formatCOP(totalFijosPagados)}</strong>
    </div>
    <div class="fin-row">
      <span>Gastos Diarios / Variables:</span>
      <strong>${formatCOP(totalDiarios)}</strong>
    </div>
    <div class="fin-row total-row">
      <span>Total Egresos (${getMesNombre()}):</span>
      <strong class="text-rose">${formatCOP(totalFijosPagados + totalDiarios)}</strong>
    </div>
  `;
}

// ================= ACCIONES & CRUD =================

// Gastos Diarios
window.handleGuardarGasto = function(e) {
  e.preventDefault();
  const concepto = document.getElementById('gastoConcepto').value.trim();
  const montoInput = document.getElementById('gastoMonto').value;
  const monto = parseMontoCOP(montoInput);
  const fecha = document.getElementById('gastoFecha').value;
  const categoria = document.getElementById('gastoCategoria').value;
  const medioPago = document.getElementById('gastoMedioPago').value;

  if (!concepto || !monto || monto <= 0 || !fecha) {
    alert("Por favor ingresa un concepto y un monto válido en Pesos COP.");
    return;
  }

  const nuevoGasto = {
    id: `g-${Date.now()}`,
    concepto,
    monto,
    fecha,
    categoria,
    medioPago,
    creadoPor: state.currentUser?.email || 'Admin'
  };

  state.data.gastos.push(nuevoGasto);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  window.closeModal('modalGasto');
  document.getElementById('formGasto').reset();
  actualizarHelperInput('gastoMonto');

  showToast(`✅ Gasto de ${formatCOP(monto)} registrado (+10 XP)`);
};

window.eliminarGasto = function(id) {
  if (!confirm("¿Deseas eliminar este gasto?")) return;
  state.data.gastos = state.data.gastos.filter(g => g.id !== id);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  showToast("🗑️ Gasto eliminado");
};

// Gastos Fijos
window.handleGuardarFijo = function(e) {
  e.preventDefault();
  const concepto = document.getElementById('fijoConcepto').value.trim();
  const quien = document.getElementById('fijoQuien').value.trim();
  const montoInput = document.getElementById('fijoMonto').value;
  const monto = parseMontoCOP(montoInput);
  const dia = Number(document.getElementById('fijoDia').value);
  const categoria = document.getElementById('fijoCategoria').value;

  if (!concepto || !monto || monto <= 0 || !dia) {
    alert("Por favor ingresa un concepto, monto válido y día límite de pago.");
    return;
  }

  const nuevoFijo = {
    id: `f-${Date.now()}`,
    concepto,
    quien,
    monto,
    dia,
    categoria,
    activo: true,
    creadoPor: state.currentUser?.email || 'Admin'
  };

  state.data.fijos.push(nuevoFijo);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  window.closeModal('modalFijo');
  document.getElementById('formFijo').reset();
  actualizarHelperInput('fijoMonto');
  showToast(`✅ Gasto fijo de ${formatCOP(monto)} agregado`);
};

window.marcarPagoFijo = function(fijoId) {
  const mesKey = getMesKey();
  const fijo = state.data.fijos.find(f => f.id === fijoId);
  if (!fijo) return;

  const yaPagado = state.data.pagosFijos.some(p => p.fijoId === fijoId && p.mes === mesKey);
  if (yaPagado) return;

  state.data.pagosFijos.push({
    id: `p-${Date.now()}`,
    fijoId: fijo.id,
    concepto: fijo.concepto,
    monto: fijo.monto,
    mes: mesKey,
    fechaPago: new Date().toISOString(),
    pagadoPor: state.currentUser?.email || 'Admin'
  });

  saveDataLocal();
  sincronizarConNube();
  renderAll();

  // 🎉 Celebración y premio por pago
  window.mostrarCelebracion(
    '📌',
    '¡GASTO FIJO PAGADO!',
    50,
    `Pagaste "${fijo.concepto}" (${formatCOP(fijo.monto)}) para ${getMesNombre()}. ¡Cero retrasos y tu tranquilidad intacta!`,
    getFraseAleatoria()
  );
};

window.desmarcarPagoFijo = function(fijoId) {
  const mesKey = getMesKey();
  state.data.pagosFijos = state.data.pagosFijos.filter(p => !(p.fijoId === fijoId && p.mes === mesKey));
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  showToast("↩️ Pago desmarcado");
};

window.eliminarFijo = function(id) {
  if (!confirm("¿Deseas eliminar este gasto fijo de tus registros mensuales?")) return;
  state.data.fijos = state.data.fijos.filter(f => f.id !== id);
  state.data.pagosFijos = state.data.pagosFijos.filter(p => p.fijoId !== id);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  showToast("🗑️ Gasto fijo eliminado");
};

// Cuentas Por Cobrar y Por Pagar
window.handleGuardarDeuda = function(e) {
  e.preventDefault();
  const tipo = document.querySelector('input[name="deudaTipo"]:checked').value;
  const persona = document.getElementById('deudaPersona').value.trim();
  const concepto = document.getElementById('deudaConcepto').value.trim();
  const montoInput = document.getElementById('deudaMonto').value;
  const montoTotal = parseMontoCOP(montoInput);
  const fechaLimite = document.getElementById('deudaFechaLimite').value;

  if (!persona || !concepto || !montoTotal || montoTotal <= 0) {
    alert("Por favor completa los datos con un monto válido en COP.");
    return;
  }

  const nuevaDeuda = {
    id: `d-${Date.now()}`,
    tipo,
    persona,
    concepto,
    montoTotal,
    fechaLimite,
    fechaCreacion: new Date().toISOString(),
    creadoPor: state.currentUser?.email || 'Admin'
  };

  state.data.deudas.push(nuevaDeuda);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  window.closeModal('modalDeuda');
  document.getElementById('formDeuda').reset();
  actualizarHelperInput('deudaMonto');
  showToast(tipo === 'me_deben' 
    ? `🟢 Cuenta por cobrar de ${formatCOP(montoTotal)} a ${persona} registrada`
    : `🔴 Deuda por pagar de ${formatCOP(montoTotal)} registrada`);
};

window.abrirModalAbono = function(deudaId) {
  const deuda = state.data.deudas.find(d => d.id === deudaId);
  if (!deuda) return;
  window.openModal('modalAbono', { deuda });
};

window.handleGuardarAbono = function(e) {
  e.preventDefault();
  const deudaId = document.getElementById('abonoDeudaId').value;
  const montoInput = document.getElementById('abonoMonto').value;
  const monto = parseMontoCOP(montoInput);
  const fecha = document.getElementById('abonoFecha').value;
  const nota = document.getElementById('abonoNota').value.trim();

  if (!deudaId || !monto || monto <= 0 || !fecha) {
    alert("Por favor ingresa un monto de abono válido y la fecha.");
    return;
  }

  const deuda = state.data.deudas.find(d => d.id === deudaId);

  const nuevoAbono = {
    id: `a-${Date.now()}`,
    deudaId,
    monto,
    fecha,
    nota,
    creadoPor: state.currentUser?.email || 'Admin'
  };

  state.data.abonos.push(nuevoAbono);

  const abonosTotales = state.data.abonos.filter(a => a.deudaId === deudaId).reduce((s, a) => s + Number(a.monto || 0), 0);
  const saldoRestante = Math.max(0, Number(deuda?.montoTotal || 0) - abonosTotales);

  saveDataLocal();
  sincronizarConNube();
  renderAll();
  window.closeModal('modalAbono');
  document.getElementById('formAbono').reset();
  actualizarHelperInput('abonoMonto');

  if (saldoRestante === 0 && deuda) {
    const esPorCobrar = deuda.tipo === 'me_deben';
    window.mostrarCelebracion(
      esPorCobrar ? '💰' : '🏆',
      esPorCobrar ? '¡DINERO RECUPERADO AL 100%!' : '¡PAZ Y SALVO TOTAL!',
      150,
      esPorCobrar 
        ? `¡${deuda.persona} terminó de pagarte los ${formatCOP(deuda.montoTotal)} de "${deuda.concepto}"!`
        : `¡Liquidaste por completo tu deuda de ${formatCOP(deuda.montoTotal)} con "${deuda.persona}"! ¡Eres libre de esta cuenta!`,
      "¡Esa culebra quedó completamente muerta! Felicitaciones por tu constancia."
    );
  } else {
    showToast(`💵 Abono de ${formatCOP(monto)} guardado (+25 XP)`);
  }
};

window.eliminarDeuda = function(id) {
  const deuda = state.data.deudas.find(d => d.id === id);
  const esPorCobrar = deuda?.tipo === 'me_deben';
  const texto = esPorCobrar 
    ? "¿Deseas eliminar este registro de dinero por cobrar y sus abonos?" 
    : "¿Deseas eliminar esta deuda por pagar y sus abonos?";

  if (!confirm(texto)) return;

  state.data.deudas = state.data.deudas.filter(d => d.id !== id);
  state.data.abonos = state.data.abonos.filter(a => a.deudaId !== id);
  saveDataLocal();
  sincronizarConNube();
  renderAll();
  showToast("🗑️ Registro eliminado");
};

// ================= BACKUP & EXPORT JSON =================
window.exportarDatosJSON = function() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.data, null, 2));
  const downloadAnchor = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `miplata-${today}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("📥 Copia de seguridad descargada");
};

window.importarDatosJSON = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.fijos || imported.gastos || imported.deudas) {
        state.data = {
          deudas: imported.deudas || [],
          abonos: imported.abonos || [],
          fijos: imported.fijos || [],
          pagosFijos: imported.pagosFijos || [],
          gastos: imported.gastos || [],
          whitelist: imported.whitelist || state.data.whitelist || [],
          gamification: imported.gamification || DATOS_INICIALES.gamification
        };
        saveDataLocal();
        sincronizarConNube();
        renderAll();
        showToast("✅ Datos restaurados correctamente");
      } else {
        alert("El archivo no tiene el formato correcto de Mi Plata.");
      }
    } catch (err) {
      alert("Error al leer el archivo JSON.");
    }
  };
  reader.readAsText(file);
};

window.confirmarBorradoDatos = function() {
  if (confirm("⚠️ ¿Estás seguro de que deseas borrar todos los datos locales? Esta acción no se puede deshacer a menos que tengas un respaldo en JSON o en Firebase.")) {
    localStorage.removeItem(STORAGE_KEY);
    state.data = JSON.parse(JSON.stringify(DATOS_INICIALES));
    renderAll();
    showToast("🧹 Datos locales restablecidos");
  }
};

// ================= CONFIGURACIÓN DE INPUTS FORMATEADOS EN VIVO =================
function configurarInputsFormateados() {
  const inputIds = ['gastoMonto', 'fijoMonto', 'deudaMonto', 'abonoMonto', 'simMontoInicial', 'simAporteMensual'];

  inputIds.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', (e) => {
      const rawVal = e.target.value;
      const parsedNum = parseMontoCOP(rawVal);
      
      if (parsedNum > 0) {
        e.target.value = formatMilesPuntos(parsedNum);
      }
      actualizarHelperInput(id);

      if (id.startsWith('sim')) {
        window.calcularSimuladorInteres();
      }
    });

    input.addEventListener('blur', (e) => {
      const parsedNum = parseMontoCOP(e.target.value);
      if (parsedNum > 0) {
        e.target.value = formatMilesPuntos(parsedNum);
      }
      actualizarHelperInput(id);
      if (id.startsWith('sim')) {
        window.calcularSimuladorInteres();
      }
    });
  });
}

// ================= EVENT LISTENERS & INICIALIZACIÓN =================
document.addEventListener("DOMContentLoaded", () => {
  configurarInputsFormateados();

  // Month switcher
  document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
    state.selectedDate.setMonth(state.selectedDate.getMonth() - 1);
    renderAll();
  });

  document.getElementById('btnNextMonth')?.addEventListener('click', () => {
    state.selectedDate.setMonth(state.selectedDate.getMonth() + 1);
    renderAll();
  });

  // Filters
  document.getElementById('searchGastos')?.addEventListener('input', renderGastos);
  document.getElementById('filterCategoriaGasto')?.addEventListener('change', renderGastos);

  // Manual sync button
  document.getElementById('btnManualSync')?.addEventListener('click', () => {
    if (state.currentUser) {
      sincronizarConNube();
    } else {
      alert("Inicia sesión con Google primero para sincronizar con la nube.");
    }
  });

  // Auth: Botones de Iniciar sesión con Google
  const loginAction = async () => {
    try {
      if (!auth) throw new Error("Firebase no inicializado");
      document.getElementById('authDeniedBox')?.classList.add('hidden');
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Error en login Google:", err);
      alert("No se pudo iniciar sesión con Google: " + err.message);
    }
  };

  document.getElementById('btnLogin')?.addEventListener('click', loginAction);
  document.getElementById('btnGateLogin')?.addEventListener('click', loginAction);

  // Auth: Botón Cerrar sesión
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    try {
      if (auth) await signOut(auth);
      state.isPinUnlocked = false;
    } catch (err) {
      console.error("Error al salir:", err);
    }
  });

  // Listener de Estado de Autenticación de Firebase
  if (auth) {
    onAuthStateChanged(auth, async (user) => {
      state.currentUser = user;
      const authGate = document.getElementById('authGateScreen');
      const pinLock = document.getElementById('pinLockScreen');
      const appContainer = document.getElementById('app');
      const userAvatar = document.getElementById('userAvatar');
      const userName = document.getElementById('userName');
      const deniedBox = document.getElementById('authDeniedBox');
      const deniedMsg = document.getElementById('authDeniedMsg');

      if (user) {
        const userEmail = (user.email || '').toLowerCase();
        
        // Si la lista blanca está vacía (primer inicio), agregamos al usuario actual automáticamente como Admin
        if (!state.data.whitelist || state.data.whitelist.length === 0) {
          state.data.whitelist = [userEmail];
          saveDataLocal();
        }

        // Validación de lista blanca
        const esAutorizado = state.data.whitelist.includes(userEmail);

        if (!esAutorizado) {
          // Bloquear acceso al usuario no autorizado
          if (deniedBox) deniedBox.classList.remove('hidden');
          if (deniedMsg) deniedMsg.innerText = `El correo "${userEmail}" no está en la lista de familiares autorizados. Pide al administrador que te añada.`;
          if (authGate) authGate.classList.remove('hidden');
          if (pinLock) pinLock.classList.add('hidden');
          if (appContainer) appContainer.classList.add('hidden');
          return;
        }

        // Usuario Autorizado
        if (deniedBox) deniedBox.classList.add('hidden');
        if (authGate) authGate.classList.add('hidden');

        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/40';
        if (userName) userName.innerText = user.displayName || user.email || 'Mi Usuario';

        // Si ya ingresó el PIN en esta sesión o no está bloqueado
        if (state.isPinUnlocked) {
          if (appContainer) appContainer.classList.remove('hidden');
          if (pinLock) pinLock.classList.add('hidden');
        } else {
          if (appContainer) appContainer.classList.add('hidden');
          if (pinLock) pinLock.classList.remove('hidden');
        }

        updateSyncBadge(true, "En la nube (Familia)");
        escucharCambiosEnNube();
      } else {
        // No hay usuario autenticado -> Mostrar Auth Gate estricto
        if (authGate) authGate.classList.remove('hidden');
        if (pinLock) pinLock.classList.add('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        
        updateSyncBadge(false, "Bloqueado");
        if (state.unsubscribeFirestore) state.unsubscribeFirestore();
      }
      renderAll();
    });
  }

  // Render inicial
  renderAll();
  window.calcularSimuladorInteres();

  // Registro del Service Worker (PWA para Celulares)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('Service Worker offline mode:', err);
    });
  }
});
