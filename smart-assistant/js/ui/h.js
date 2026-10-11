// Utilidades de interfaz compartidas.
import { formatCOP, formatPct, parseCOP } from '../core/money.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/** Escapa texto para insertarlo en HTML. TODO dato variable pasa por aquí. */
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const cop = (v) => (v == null ? '—' : formatCOP(v));
export const pct = (v, d = 0) => (v == null ? '—' : formatPct(v, d));
export { parseCOP };

// Las cuatro categorías de confiabilidad que exige el proyecto
export const INFO = {
  verificado: ['verificado', '✔ Verificado'],
  calculo: ['calculo', '∑ Cálculo con datos ingresados'],
  estimacion: ['estimacion', '≈ Estimación'],
  desconocido: ['desconocido', '? Desconocido: confirmar'],
  pendiente: ['pendiente', '⏳ Pendiente de validar'],
  demo: ['demo', 'DEMO ficticio']
};
export function badge(tipo, texto) {
  const [cls, label] = INFO[tipo] || ['', tipo];
  return `<span class="tag ${cls}">${esc(texto || label)}</span>`;
}

/** Fuente, fecha y responsable de un dato. */
export function procedencia(x) {
  if (!x) return '';
  const partes = [];
  if (x.fuente) partes.push('Fuente: ' + x.fuente);
  if (x.actualizado) partes.push('Actualizado: ' + x.actualizado);
  if (x.responsable) partes.push('Responsable: ' + x.responsable);
  return partes.length ? `<div class="meta">${esc(partes.join(' · '))}</div>` : '<div class="meta">Sin fuente registrada</div>';
}

export function erroresHTML(err) {
  if (!err) return '';
  const lista = err.errores?.length ? `<ul>${err.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : '';
  return `<div class="errors" role="alert"><strong>${esc(err.message || err)}</strong>${lista}</div>`;
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/** Confirmación humana para acciones sensibles o irreversibles. */
export function confirmar(mensaje, textoOk = 'Confirmar') {
  const d = $('#dialog');
  $('#dialogMsg').textContent = mensaje;
  $('#dialogOk').textContent = textoOk;
  d.returnValue = '';
  d.showModal();
  return new Promise((res) => d.addEventListener('close', () => res(d.returnValue === 'si'), { once: true }));
}

/** Barras de progreso sin estilos en línea (compatibles con la CSP). */
export function bar(fraccion) {
  const w = Math.max(0, Math.min(100, Math.round((fraccion || 0) * 100)));
  return `<div class="bar" role="progressbar" aria-valuenow="${w}" aria-valuemin="0" aria-valuemax="100"><div data-w="${w}"></div></div>`;
}
export function aplicarBarras(root) {
  $$('[data-w]', root).forEach((el) => { el.style.width = el.dataset.w + '%'; });
}

/** Lee los campos con name de un formulario como objeto. */
export function formData(form) {
  const o = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') {
      if (form.querySelectorAll(`[name="${el.name}"]`).length > 1) { (o[el.name] ||= []); if (el.checked) o[el.name].push(el.value); }
      else o[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  }
  return o;
}

export const opciones = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${esc(k)}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');

export function tabs(items, activo) {
  return `<nav class="tabs" aria-label="Secciones">${items.map(([href, label]) => `<a href="${href}" class="${href === activo ? 'active' : ''}">${esc(label)}</a>`).join('')}</nav>`;
}

export const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Ejecuta una acción mostrando errores amigables. */
export async function intentar(fn, contenedorErrores) {
  try {
    if (contenedorErrores) contenedorErrores.innerHTML = '';
    return await fn();
  } catch (e) {
    const esperado = e.name === 'AppError' || e.name === 'PermissionError';
    if (!esperado) console.error(e); // solo errores inesperados van a la consola
    const html = erroresHTML(esperado ? e : { message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
    if (contenedorErrores) { contenedorErrores.innerHTML = html; contenedorErrores.scrollIntoView({ block: 'nearest' }); }
    else toast(e.message || 'Error');
    return undefined;
  }
}
