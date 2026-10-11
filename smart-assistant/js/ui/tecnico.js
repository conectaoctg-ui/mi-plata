import { esc, tabs, formData, intentar, confirmar, opciones, $ } from './h.js';
import { can } from '../core/permissions.js';
import { ESTADOS, TIPOS_HALLAZGO, CONTROLES_CALIDAD, transicionesPosibles } from '../core/service.js';

export function render(ctx) {
  const [sub = 'diagnostico', id] = ctx.args;
  ctx.view.innerHTML = `<h1>Servicio técnico</h1>${tabs([['#/tecnico/diagnostico', 'Diagnóstico guiado'], ['#/tecnico/casos', 'Casos'], ['#/tecnico/nuevo', 'Recibir equipo']], '#/tecnico/' + (sub === 'caso' ? 'casos' : sub))}<div id="sub"></div>`;
  const el = $('#sub');
  if (sub === 'caso') return detalle(ctx, el, id);
  if (sub === 'nuevo') return nuevo(ctx, el, id);
  if (sub === 'casos') return casos(ctx, el);
  return diagnostico(ctx, el, id);
}

function diagnostico(ctx, el, id) {
  const lista = ctx.repo.d.diagnosticos;
  const d = lista.find((x) => x.id === id);
  if (!d) {
    el.innerHTML = `<p class="muted">Elige el síntoma que reporta el cliente. Es una guía inicial: no reemplaza el diagnóstico de un técnico.</p>
      <div class="grid">${lista.map((x) => `<a class="card link" href="#/tecnico/diagnostico/${esc(x.id)}"><strong>${esc(x.sintoma)}</strong></a>`).join('')}</div>`;
    return;
  }
  el.innerHTML = `
    <a href="#/tecnico/diagnostico">‹ Síntomas</a>
    <h2>${esc(d.sintoma)}</h2>
    <div class="card"><h3>1. Pregunta al cliente</h3><ul>${d.preguntas.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>
    <div class="card"><h3>2. Revisa paso a paso</h3>${d.pasos.map((p, i) => `<label class="inline"><input type="checkbox"> ${i + 1}. ${esc(p)}</label>`).join('')}</div>
    <div class="card"><h3>3. Causas probables <span class="tag estimacion">Sin confirmar</span></h3>
      <p class="muted">Son hipótesis. Solo un técnico, con una prueba o medición, puede confirmar la falla.</p>
      <ul>${d.causas.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
    <div class="notice warn"><strong>Cuándo escalar:</strong> ${esc(d.escalar)}</div>
    ${can(ctx.user, 'tecnico.crearCaso') ? `<a class="btn primary" href="#/tecnico/nuevo/${esc(d.id)}">Recibir equipo con este síntoma</a>` : ''}`;
}

function casos(ctx, el) {
  const lista = ctx.repo.listarCasos(ctx.user).sort((a, b) => b.numero - a.numero);
  const abiertos = lista.filter((c) => !['entregado', 'cancelado'].includes(c.estado));
  const cerrados = lista.filter((c) => ['entregado', 'cancelado'].includes(c.estado));
  const fila = (c) => `<tr><td><a href="#/tecnico/caso/${esc(c.id)}">#${c.numero}</a></td><td>${esc(c.modelo)}</td><td>${esc(c.sintomas.slice(0, 60))}</td><td><span class="tag ${c.estado === 'listo' ? 'ok' : c.estado === 'escalado' ? 'warn' : ''}">${esc(ESTADOS[c.estado])}</span></td></tr>`;
  const tabla = (xs) => `<div class="table-wrap card"><table><thead><tr><th>Caso</th><th>Modelo</th><th>Síntoma</th><th>Estado</th></tr></thead><tbody>${xs.map(fila).join('')}</tbody></table></div>`;
  el.innerHTML = `<div class="row between"><h2>Casos abiertos (${abiertos.length})</h2>${can(ctx.user, 'tecnico.crearCaso') ? '<a class="btn primary" href="#/tecnico/nuevo">+ Recibir equipo</a>' : ''}</div>
    ${abiertos.length ? tabla(abiertos) : '<p class="muted">No hay casos abiertos.</p>'}
    ${cerrados.length ? `<details class="card"><summary>Cerrados (${cerrados.length})</summary>${tabla(cerrados)}</details>` : ''}`;
}

function nuevo(ctx, el, sintomaId) {
  if (!can(ctx.user, 'tecnico.crearCaso')) { el.innerHTML = '<div class="card">Tu rol no puede recibir equipos.</div>'; return; }
  const d = ctx.repo.d.diagnosticos.find((x) => x.id === sintomaId);
  el.innerHTML = `
    <div class="notice warn">No registres contraseñas, códigos de desbloqueo ni datos del Apple ID. La app los rechaza.</div>
    <div id="err"></div>
    <form id="fCaso" class="card" novalidate>
      <div class="form-grid">
        <label>Modelo<input name="modelo" placeholder="iPhone 13 Pro" required></label>
        <label>Indicador de humedad (ranura SIM)<select name="humedad"><option value="no_revisado">No se pudo revisar</option><option value="normal">Normal</option><option value="activado">Activado (rojo/rosado)</option></select></label>
      </div>
      <label>Síntoma con las palabras del cliente<textarea name="sintomas" required>${esc(d ? d.sintoma : '')}</textarea></label>
      <label>Antecedentes (golpes, líquido, reparaciones previas, garantía)<textarea name="antecedentes"></textarea></label>
      <label>Pruebas realizadas en la recepción<textarea name="pruebas"></textarea></label>
      <label>Estado físico (rayones, golpes, vidrio trasero)<textarea name="estadoFisico"></textarea></label>
      <p class="muted">La orden impresa incluye nombre y teléfono del cliente a mano: esta versión no los guarda (recolección mínima).</p>
      <button class="btn primary">Crear caso</button>
    </form>`;
  $('#fCaso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = await intentar(() => ctx.repo.crearCaso(ctx.user, formData(e.target)), $('#err'));
    if (c) { ctx.toast(`Caso #${c.numero} creado`); ctx.go('#/tecnico/caso/' + c.id); }
  });
}

function detalle(ctx, el, id) {
  const { repo, user } = ctx;
  const c = repo.listarCasos(user).find((x) => x.id === id);
  if (!c) { el.innerHTML = '<div class="card">Caso no encontrado.</div>'; return; }
  const sig = transicionesPosibles(c.estado);
  const tiposPermitidos = Object.fromEntries(Object.entries(TIPOS_HALLAZGO).filter(([k]) => k !== 'confirmada' || can(user, 'tecnico.confirmarFalla')));
  const nombres = Object.fromEntries(repo.d.usuarios.map((u) => [u.id, u.nombre]));
  el.innerHTML = `
    <a href="#/tecnico/casos" class="no-print">‹ Casos</a>
    <div class="card">
      <div class="row between"><h2>Caso #${c.numero} · ${esc(c.modelo)}</h2><span class="tag">${esc(ESTADOS[c.estado])}</span></div>
      <p><strong>Síntoma:</strong> ${esc(c.sintomas)}</p>
      ${c.antecedentes ? `<p><strong>Antecedentes:</strong> ${esc(c.antecedentes)}</p>` : ''}
      ${c.pruebas ? `<p><strong>Pruebas de recepción:</strong> ${esc(c.pruebas)}</p>` : ''}
      ${c.estadoFisico ? `<p><strong>Estado físico:</strong> ${esc(c.estadoFisico)}</p>` : ''}
      <p><strong>Indicador de humedad:</strong> ${esc({ normal: 'Normal', activado: 'Activado', no_revisado: 'No revisado' }[c.humedad])}</p>
      <p class="meta">Recibido por ${esc(nombres[c.recibidoPor] || '—')} · ${esc(c.creado.slice(0, 16).replace('T', ' '))} UTC</p>
      <button class="btn small no-print" id="imprimir">🖨 Imprimir orden</button>
    </div>
    <div class="card"><h3>Hallazgos</h3>
      ${(c.hallazgos || []).map((h) => `<div class="row"><span class="tag ${h.tipo === 'confirmada' ? 'verificado' : h.tipo === 'probable' ? 'estimacion' : ''}">${esc(TIPOS_HALLAZGO[h.tipo])}</span> ${esc(h.texto)}${h.evidencia ? ` <small class="muted">— Evidencia: ${esc(h.evidencia)}</small>` : ''}</div>`).join('') || '<p class="muted">Sin hallazgos todavía.</p>'}
      <div id="errH"></div>
      <form id="fH" class="no-print" novalidate>
        <div class="form-grid">
          <label>Tipo<select name="tipo">${opciones(tiposPermitidos, 'probable')}</select></label>
          <label>Hallazgo<input name="texto" maxlength="300"></label>
          <label>Evidencia (prueba o medición)<input name="evidencia" maxlength="300"></label>
        </div>
        <button class="btn small">Agregar hallazgo</button>
      </form>
    </div>
    ${c.estado === 'cotizado' ? `<div class="card no-print"><h3>Respuesta del cliente a la cotización</h3><label class="inline"><input type="checkbox" id="aprobo" ${c.clienteAprobo ? 'checked' : ''}> El cliente aprobó la cotización</label></div>` : ''}
    ${['calidad', 'listo', 'entregado'].includes(c.estado) ? `<div class="card"><h3>Control de calidad</h3>
      <div class="table-wrap"><table><thead><tr><th>Control</th><th>OK</th><th>Falla</th><th>No aplica</th></tr></thead><tbody>
      ${CONTROLES_CALIDAD.map((q, i) => `<tr><td>${esc(q)}</td>${['ok', 'falla', 'na'].map((v) => `<td><input type="radio" name="qc${i}" value="${v}" data-qc="${esc(q)}" ${c.calidad?.[q] === v ? 'checked' : ''} ${c.estado !== 'calidad' || !can(user, 'tecnico.diagnosticar') ? 'disabled' : ''} aria-label="${esc(q)}: ${v}"></td>`).join('')}</tr>`).join('')}
      </tbody></table></div></div>` : ''}
    <div class="card no-print"><h3>Cambiar estado</h3><div id="errE"></div>
      <div class="row">${sig.map((s) => `<button class="btn ${s === 'cancelado' ? 'danger' : ''}" data-estado="${s}">→ ${esc(ESTADOS[s])}</button>`).join('') || '<span class="muted">Caso cerrado.</span>'}</div>
    </div>
    <details class="card"><summary>Historial</summary>${(c.historial || []).map((h) => `<div class="meta">${esc(h.fecha.slice(0, 16).replace('T', ' '))} · ${esc(nombres[h.por] || '')}: ${esc(ESTADOS[h.de])} → ${esc(ESTADOS[h.a])}</div>`).join('') || '<p class="muted">Sin cambios.</p>'}</details>`;

  $('#imprimir').addEventListener('click', () => window.print());
  $('#fH').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ok = await intentar(() => { repo.agregarHallazgo(user, c.id, formData(e.target)); return true; }, $('#errH'));
    if (ok) ctx.refresh();
  });
  $('#aprobo')?.addEventListener('change', async (e) => { await intentar(() => repo.marcarAprobacionCliente(user, c.id, e.target.checked)); ctx.toast('Respuesta registrada'); });
  el.querySelectorAll('[data-qc]').forEach((r) => r.addEventListener('change', () => intentar(() => repo.marcarControl(user, c.id, r.dataset.qc, r.value))));
  el.querySelectorAll('[data-estado]').forEach((b) => b.addEventListener('click', async () => {
    const nuevo = b.dataset.estado;
    if (['cancelado', 'entregado'].includes(nuevo) && !(await confirmar(`¿Confirmas pasar el caso a "${ESTADOS[nuevo]}"? No se puede reabrir.`))) return;
    const ok = await intentar(() => { repo.cambiarEstadoCaso(user, c.id, nuevo); return true; }, $('#errE'));
    if (ok) { ctx.toast('Estado actualizado'); ctx.refresh(); }
  }));
}
