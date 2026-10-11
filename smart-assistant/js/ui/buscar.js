import { esc, badge, procedencia, $ } from './h.js';
import { buscar } from '../core/search.js';
import { can } from '../core/permissions.js';

/** Reúne todo lo que se puede buscar, según los permisos del usuario. */
function documentos(repo, user) {
  const docs = [];
  for (const k of repo.listarConocimiento(user)) docs.push({ id: 'kb:' + k.id, tipo: 'Conocimiento', titulo: k.titulo, texto: k.texto, estado: k.estado, fuente: k.fuente, actualizado: k.actualizado, responsable: k.responsable });
  for (const l of repo.lecciones(user)) docs.push({ id: 'lec:' + l.id, tipo: 'Lección', titulo: l.titulo, texto: l.bloques.join(' '), href: '#/academia/leccion/' + l.id });
  for (const d of repo.d.diagnosticos) docs.push({ id: 'dx:' + d.id, tipo: 'Diagnóstico', titulo: d.sintoma, texto: [...d.preguntas, ...d.pasos, ...d.causas].join(' '), href: '#/tecnico/diagnostico/' + d.id });
  if (can(user, 'financiacion.simular')) for (const e of repo.d.ecreditEtapas) docs.push({ id: 'ec:' + e.id, tipo: 'E-Credit', titulo: 'E-Credit: ' + e.nombre, texto: e.concepto + ' ' + e.procedimientoOficial, href: '#/financiacion/guia' });
  for (const e of repo.listarCatalogo(user)) docs.push({ id: 'eq:' + e.id, tipo: 'Equipo', titulo: `${e.modelo} ${e.capacidadGB} GB`, texto: `${e.condicion} ${e.color} ${e.notas}`, href: '#/ventas/catalogo' });
  return docs;
}

export function render({ repo, user, view, args }) {
  const inicial = args[0] || '';
  view.innerHTML = `
    <h1>Buscar</h1>
    <input id="q" type="search" placeholder="Ej.: batería, garantía, mojado, IMEI, cuotas…" value="${esc(inicial)}" aria-label="Buscar" autofocus>
    <p class="muted">Busca en conocimiento, lecciones, diagnósticos, E-Credit y catálogo. Cada resultado indica si está verificado.</p>
    <div id="res"></div>`;
  const docs = documentos(repo, user);
  const pintar = (q) => {
    const r = buscar(docs, q);
    $('#res').innerHTML = !q.trim() ? '' : r.length ? r.map((d) => `
      <details class="card"><summary>${esc(d.titulo)} <span class="tag">${esc(d.tipo)}</span> ${d.estado ? badge(d.estado === 'verificado' ? 'verificado' : 'pendiente') : ''}</summary>
        <p>${esc(d.texto.slice(0, 600))}</p>
        ${d.estado ? procedencia(d) : ''}
        ${d.href ? `<a href="${esc(d.href)}">Abrir ›</a>` : ''}
      </details>`).join('')
      : `<div class="card">${badge('desconocido', 'Sin resultados')} No hay información registrada sobre esto. No improvises: consulta a la administración o a tu supervisor.</div>`;
  };
  $('#q').addEventListener('input', (e) => pintar(e.target.value));
  pintar(inicial);
}
