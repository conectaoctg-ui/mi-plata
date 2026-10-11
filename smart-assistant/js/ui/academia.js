import { esc, pct, bar, tabs, formData, intentar, opciones, $ } from './h.js';
import { can, ROLES } from '../core/permissions.js';
import { AREAS, NIVELES, APROBACION, resumenProgreso } from '../core/academy.js';
import * as rp from '../core/roleplay.js';

export function render(ctx) {
  const [sub = 'lecciones', id] = ctx.args;
  const items = [['#/academia/lecciones', 'Lecciones'], ['#/academia/simulaciones', 'Simulaciones'], ['#/academia/progreso', 'Mi progreso']];
  if (can(ctx.user, 'academia.verProgresoEquipo')) items.push(['#/academia/equipo', 'Equipo']);
  const activo = '#/academia/' + (sub === 'leccion' ? 'lecciones' : sub === 'simulacion' ? 'simulaciones' : sub);
  ctx.view.innerHTML = `<h1>Academia</h1>${tabs(items, activo)}<div id="sub"></div>`;
  const el = $('#sub');
  ({ lecciones, leccion: (c, e) => leccion(c, e, id), simulaciones, simulacion: (c, e) => simulacion(c, e, id), progreso, equipo }[sub] || lecciones)(ctx, el);
}

function estadoLeccion(p) {
  if (!p) return '<span class="tag">Sin empezar</span>';
  return p.mejorNota >= APROBACION ? `<span class="tag ok">Aprobada ${pct(p.mejorNota)}</span>` : `<span class="tag warn">${pct(p.mejorNota)} · repetir</span>`;
}

function lecciones(ctx, el) {
  const lecs = ctx.repo.lecciones(ctx.user);
  const prog = ctx.repo.progreso(ctx.user);
  const asignadas = new Set(ctx.repo.asignacionesDe(ctx.user).map((a) => a.leccionId));
  el.innerHTML = Object.entries(AREAS).map(([area, nombre]) => {
    const de = lecs.filter((l) => l.area === area).sort((a, b) => a.nivel - b.nivel);
    if (!de.length) return '';
    return `<h2>${esc(nombre)}</h2><div class="grid">${de.map((l) => `
      <a class="card link" href="#/academia/leccion/${esc(l.id)}">
        <strong>${esc(l.titulo)}</strong>
        <div class="row"><span class="tag">${esc(NIVELES[l.nivel])}</span><span class="tag">${l.minutos || 5} min</span>${asignadas.has(l.id) ? '<span class="tag warn">Asignada</span>' : ''}</div>
        <div>${estadoLeccion(prog[l.id])}</div>
      </a>`).join('')}</div>`;
  }).join('');
}

function leccion(ctx, el, id) {
  const l = ctx.repo.lecciones(ctx.user).find((x) => x.id === id);
  if (!l) { el.innerHTML = '<div class="card">Lección no disponible para tu rol.</div>'; return; }
  el.innerHTML = `
    <a href="#/academia/lecciones">‹ Lecciones</a>
    <h2>${esc(l.titulo)}</h2>
    <div class="row"><span class="tag">${esc(AREAS[l.area])}</span><span class="tag">${esc(NIVELES[l.nivel])}</span><span class="tag pendiente">Contenido pendiente de validar por la administración</span></div>
    <div class="card"><ul class="stack">${l.bloques.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>
    <h3>Evaluación</h3>
    <div id="err"></div>
    <form id="fQuiz">
      ${l.quiz.map((q, i) => `<fieldset class="card"><legend><strong>${i + 1}. ${esc(q.p)}</strong></legend>
        ${q.o.map((o, k) => `<label class="inline"><input type="radio" name="q${i}" value="${k}" required> ${esc(o)}</label>`).join('')}
      </fieldset>`).join('')}
      <button class="btn primary">Enviar respuestas</button>
    </form>
    <div id="res"></div>`;
  $('#fQuiz').addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const respuestas = l.quiz.map((_, i) => (d['q' + i] === undefined ? null : Number(d['q' + i])));
    if (respuestas.some((r) => r === null)) { $('#err').innerHTML = '<div class="errors">Responde todas las preguntas.</div>'; return; }
    const r = await intentar(() => ctx.repo.responderQuiz(ctx.user, l.id, respuestas), $('#err'));
    if (!r) return;
    e.target.classList.add('hidden');
    $('#res').innerHTML = `
      <div class="card"><div class="row between"><h3>${r.aprobado ? '🎉 Aprobada' : '📖 Aún no'}</h3><div class="kpi">${pct(r.nota)}</div></div>
        <p>${r.correctas} de ${r.total} correctas. Se aprueba con ${pct(APROBACION)}.</p></div>
      ${r.detalle.map((d2, i) => `<div class="card"><strong>${i + 1}. ${esc(d2.pregunta)}</strong>
        <p>${d2.correcta ? '<span class="tag ok">Correcta</span>' : `<span class="tag bad">Incorrecta</span> Elegiste: ${esc(d2.elegida)}. Correcta: <strong>${esc(d2.respuestaCorrecta)}</strong>`}</p>
        ${d2.explicacion ? `<p class="muted">${esc(d2.explicacion)}</p>` : ''}</div>`).join('')}
      <div class="row"><a class="btn" href="#/academia/leccion/${esc(l.id)}" id="otra">Intentar de nuevo</a><a class="btn primary" href="#/academia/lecciones">Volver a lecciones</a></div>`;
    $('#otra').addEventListener('click', (ev) => { ev.preventDefault(); ctx.refresh(); });
  });
}

function simulaciones(ctx, el) {
  const hechas = ctx.repo.d.roleplays[ctx.user.id] || [];
  el.innerHTML = `<p class="muted">Practica con clientes ficticios. Cada respuesta tiene retroalimentación. Las respuestas engañosas o de presión indebida bajan la nota.</p>
    <div class="grid">${ctx.repo.d.escenarios.map((s) => {
      const ult = hechas.filter((h) => h.escenarioId === s.id).at(-1);
      return `<a class="card link" href="#/academia/simulacion/${esc(s.id)}"><strong>${esc(s.titulo)}</strong><div class="muted">${esc(s.cliente)}</div><div class="row"><span class="tag">${esc(AREAS[s.area] || s.area)}</span>${ult ? `<span class="tag ${ult.faltasEticas ? 'bad' : ult.nota >= 0.85 ? 'ok' : 'warn'}">Último: ${pct(ult.nota)}</span>` : ''}</div></a>`;
    }).join('')}</div>`;
}

function simulacion(ctx, el, id) {
  const esc0 = ctx.repo.d.escenarios.find((s) => s.id === id);
  if (!esc0) { el.innerHTML = '<div class="card">Simulación no encontrada.</div>'; return; }
  let estado = rp.iniciar(esc0);
  const pintar = () => {
    const chat = estado.pasos.map((p) => `<div class="bubble cliente">${esc(p.cliente)}</div><div class="bubble yo">${esc(p.respuesta)}</div><div class="notice ${p.puntos < 0 ? 'bad' : p.puntos < p.max ? 'warn' : 'ok'}">${esc(p.feedback)}</div>`).join('');
    if (estado.terminado) {
      const ev = rp.evaluar(estado);
      ctx.repo.guardarRoleplay(ctx.user, esc0.id, ev);
      el.innerHTML = `<a href="#/academia/simulaciones">‹ Simulaciones</a><h2>${esc(esc0.titulo)}</h2><div class="card">${chat}</div>
        <div class="card"><div class="row between"><h3>${esc(ev.nivel)}</h3><div class="kpi">${pct(ev.nota)}</div></div>
        ${ev.mejoras.length ? `<h4>Para mejorar</h4><ul>${ev.mejoras.map((m) => `<li><em>“${esc(m.respuesta)}”</em>: ${esc(m.feedback)}</li>`).join('')}</ul>` : '<p>¡Todas tus respuestas fueron las mejores!</p>'}</div>
        <button class="btn primary" id="otra">Repetir</button>`;
      $('#otra').addEventListener('click', () => { estado = rp.iniciar(esc0); pintar(); });
      return;
    }
    const nodo = rp.nodoActual(esc0, estado);
    el.innerHTML = `<a href="#/academia/simulaciones">‹ Simulaciones</a><h2>${esc(esc0.titulo)}</h2><p class="muted">Cliente ficticio: ${esc(esc0.cliente)}</p>
      <div class="card">${chat}<div class="bubble cliente">${esc(nodo.cliente)}</div></div>
      <h3>¿Qué respondes?</h3>${nodo.opciones.map((o, i) => `<button class="option" data-i="${i}">${esc(o.texto)}</button>`).join('')}`;
    el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { estado = rp.elegir(esc0, estado, Number(b.dataset.i)); pintar(); }));
  };
  pintar();
}

function progreso(ctx, el) {
  const lecs = ctx.repo.lecciones(ctx.user);
  const prog = ctx.repo.progreso(ctx.user);
  const res = resumenProgreso(lecs, prog);
  const comps = ctx.repo.competenciasDe(ctx.user);
  const asig = ctx.repo.asignacionesDe(ctx.user);
  el.innerHTML = `
    <div class="grid">
      <div class="card"><div class="muted">Avance</div><div class="kpi">${pct(res.avance)}</div>${bar(res.avance)}</div>
      <div class="card"><div class="muted">Promedio de mejores notas</div><div class="kpi">${res.promedio == null ? '—' : pct(res.promedio)}</div></div>
      <div class="card"><div class="muted">Competencias validadas</div><div class="kpi">${comps.length}</div></div>
    </div>
    <div class="card"><h3>Habilidades pendientes</h3>${res.pendientes.length ? `<ul>${res.pendientes.map((l) => `<li><a href="#/academia/leccion/${esc(l.id)}">${esc(l.titulo)}</a></li>`).join('')}</ul>` : '<p>No tienes lecciones pendientes.</p>'}</div>
    ${asig.length ? `<div class="card"><h3>Asignadas por tu supervisor</h3>${asig.map((a) => `<div class="row between"><span>${esc(ctx.repo.d.lecciones.find((l) => l.id === a.leccionId)?.titulo || a.leccionId)}</span><span class="tag ${a.estado === 'completada' ? 'ok' : a.estado === 'vencida' ? 'bad' : 'warn'}">${esc(a.estado)}</span></div>`).join('')}</div>` : ''}
    ${comps.length ? `<div class="card"><h3>Competencias validadas</h3>${comps.map((c) => `<div>✔ ${esc(c.competencia)} <span class="meta">${esc(c.fecha)}</span></div>`).join('')}</div>` : ''}`;
}

function equipo(ctx, el) {
  const { repo, user } = ctx;
  const usuarios = repo.listarUsuarios(user).filter((u) => u.activo && u.id !== user.id);
  const m = repo.metricas(user);
  el.innerHTML = `
    <div class="table-wrap card"><table>
      <thead><tr><th>Persona</th><th>Rol</th><th>Avance</th><th class="num">Promedio</th><th class="num">Simulaciones</th><th class="num">Faltas éticas</th><th class="num">Días hasta completar</th></tr></thead>
      <tbody>${m.equipo.map((p) => `<tr><td>${esc(p.nombre)}</td><td>${esc(ROLES[p.rol])}</td><td>${p.aprobadas}/${p.total} ${bar(p.avance)}</td><td class="num">${p.promedio == null ? '—' : pct(p.promedio)}</td><td class="num">${p.simulaciones}</td><td class="num">${p.faltasEticas ? `<span class="tag bad">${p.faltasEticas}</span>` : 0}</td><td class="num">${p.diasCapacitacion ?? '—'}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="grid">
      <form id="fAsig" class="card" novalidate><h3>Asignar lección</h3><div id="errA"></div>
        <label>Persona<select name="userId">${opciones(Object.fromEntries(usuarios.map((u) => [u.id, `${u.nombre} (${ROLES[u.rol]})`])))}</select></label>
        <label>Lección<select name="leccionId">${opciones(Object.fromEntries(repo.d.lecciones.map((l) => [l.id, l.titulo])))}</select></label>
        <label>Fecha límite<input type="date" name="fechaLimite"></label>
        <button class="btn primary">Asignar</button></form>
      <form id="fComp" class="card" novalidate><h3>Validar competencia</h3><div id="errC"></div>
        <p class="muted">Úsalo después de observar a la persona en una situación real.</p>
        <label>Persona<select name="userId">${opciones(Object.fromEntries(usuarios.map((u) => [u.id, u.nombre])))}</select></label>
        <label>Competencia<input name="competencia" placeholder="Ej.: Recepción completa de equipos"></label>
        <label>Observación<input name="observacion"></label>
        <button class="btn primary">Validar</button></form>
    </div>`;
  $('#fAsig').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await intentar(() => repo.asignar(user, formData(e.target)), $('#errA'))) { ctx.toast('Lección asignada'); ctx.refresh(); }
  });
  $('#fComp').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await intentar(() => repo.validarCompetencia(user, formData(e.target)), $('#errC'))) { ctx.toast('Competencia validada'); e.target.reset(); }
  });
}
