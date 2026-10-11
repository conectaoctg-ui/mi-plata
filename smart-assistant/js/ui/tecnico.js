import { esc, tabs, formData, intentar, confirmar, opciones, cop, parseCOP, badge, procedencia, $ } from './h.js';
import { evaluarGarantia, estadoPlazo, resolverGarantia, CAUSAS, SOLUCIONES } from '../core/garantia.js';
import { can } from '../core/permissions.js';
import { ESTADOS, TIPOS_HALLAZGO, CONTROLES_CALIDAD, transicionesPosibles } from '../core/service.js';

export function render(ctx) {
  const [sub = 'diagnostico', id] = ctx.args;
  ctx.view.innerHTML = `<h1>Servicio técnico</h1>${tabs([['#/tecnico/diagnostico', 'Diagnóstico guiado'], ['#/tecnico/casos', 'Casos'], ['#/tecnico/nuevo', 'Recibir equipo'], ['#/tecnico/garantias', 'Garantías']], '#/tecnico/' + (sub === 'caso' ? 'casos' : sub))}<div id="sub"></div>`;
  const el = $('#sub');
  if (sub === 'garantias') return garantias(ctx, el);
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
  const fila = (c) => `<tr><td><a href="#/tecnico/caso/${esc(c.id)}">#${c.numero}</a>${c.tipo === 'garantia' ? `<br>${plazoBadge(c, ctx.repo.hoyISO())}` : ''}</td><td>${esc(c.modelo)}</td><td>${esc(c.sintomas.slice(0, 60))}</td><td><span class="tag ${c.estado === 'listo' ? 'ok' : c.estado === 'escalado' ? 'warn' : ''}">${esc(ESTADOS[c.estado])}</span></td></tr>`;
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
    ${bloqueGarantia(ctx, c)}
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
  $('#fR')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(e.target);
    const datos = { tipo: d.tipo, reparable: d.reparable === 'si', motivo: d.motivo, valorPagado: d.valorPagado ? parseCOP(d.valorPagado) : null, valorEquipoNuevo: d.valorEquipoNuevo ? parseCOP(d.valorEquipoNuevo) : null };
    // Validar antes de pedir confirmación, para no confirmar algo que luego se rechaza
    const previa = resolverGarantia(datos);
    if (!previa.ok) { $('#errR').innerHTML = `<div class="errors" role="alert">${previa.errors.map(esc).join('<br>')}</div>`; return; }
    const detalle = previa.tipo === 'cambio' ? ` El cliente paga un excedente de ${cop(previa.excedente)}.` : previa.tipo === 'devolucion' ? ` Se devuelven ${cop(previa.devolver)}.` : '';
    if (!(await confirmar(`¿Registrar "${SOLUCIONES[d.tipo]}"?${detalle} Después no se puede cambiar.`))) return;
    if (await intentar(() => repo.resolverGarantiaCaso(user, c.id, datos), $('#errR'))) { ctx.toast('Respuesta de garantía registrada'); ctx.refresh(); }
  });
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

const PLAZO = {
  a_tiempo: ['ok', 'Garantía · responder antes del '],
  vence_hoy: ['warn', 'Garantía · vence HOY '],
  vencido: ['bad', 'Garantía · plazo VENCIDO '],
  cumplido: ['ok', 'Garantía respondida a tiempo '],
  incumplido: ['bad', 'Garantía respondida fuera de plazo ']
};
export function plazoBadge(c, hoy) {
  const g = c.garantia;
  if (!g || !g.limiteRespuesta) return '<span class="tag warn">Garantía · plazo por definir</span>';
  const e = estadoPlazo(g.limiteRespuesta, hoy, g.resolucion?.fecha);
  const [cls, txt] = PLAZO[e];
  return `<span class="tag ${cls}">${esc(txt + (g.resolucion ? '' : g.limiteRespuesta))}</span>`;
}

function garantias(ctx, el) {
  const { repo, user } = ctx;
  const cfg = repo.config();
  const pol = repo.politicaGarantia();
  const hoy = repo.hoyISO();
  const pendientes = repo.listarCasos(user).filter((c) => c.tipo === 'garantia' && !c.garantia.resolucion)
    .sort((a, b) => String(a.garantia.limiteRespuesta).localeCompare(String(b.garantia.limiteRespuesta)));
  el.innerHTML = `
    <details class="card"><summary>Política de garantía vigente ${badge('verificado', 'Gerencia')}</summary>
      <ul>${esc(cfg.garantias).split('\n').map((l) => `<li>${l}</li>`).join('')}</ul>${procedencia({ fuente: cfg.garantiasFuente, actualizado: cfg.garantiasFecha, responsable: cfg.garantiasResponsable })}
    </details>
    ${pendientes.length ? `<div class="card"><h3>Garantías pendientes de respuesta (${pendientes.length})</h3>${pendientes.map((c) => `<div class="row between"><a href="#/tecnico/caso/${esc(c.id)}">#${c.numero} · ${esc(c.modelo)}</a>${plazoBadge(c, hoy)}</div>`).join('')}</div>` : ''}
    <h2>Evaluar una solicitud</h2>
    <div id="errG"></div>
    <form id="fG" class="card" novalidate>
      <div class="form-grid">
        <label>Modelo<input name="modelo" placeholder="iPhone 13"></label>
        <label>Se vendió<select name="condicion"><option value="nuevo">Nuevo (${pol.garantiaMesesNuevo ?? '?'} meses)</option><option value="usado">Usado (${pol.garantiaMesesUsado ?? '?'} meses)</option><option value="reacondicionado">Reacondicionado (${pol.garantiaMesesReacondicionado ?? 'sin definir'}${pol.garantiaMesesReacondicionado ? ' meses' : ''})</option></select></label>
        <label>Fecha de compra (factura)<input type="date" name="fechaCompra" max="${hoy}"></label>
        <label>Causa aparente<select name="causa">${opciones(CAUSAS, 'desconocida')}</select></label>
      </div>
      <label class="inline"><input type="checkbox" name="proveedorDirecto"> Equipo nuevo con garantía directa de un proveedor</label>
      <label>Falla que reporta el cliente<textarea name="sintomas"></textarea></label>
      <div class="row"><button class="btn" type="button" id="evaluar">Evaluar</button><button class="btn primary">Registrar garantía y recibir equipo</button></div>
    </form>
    <div id="resG"></div>`;
  const f = $('#fG');
  const datos = () => { const d = formData(f); return { ...d, proveedorDirecto: d.proveedorDirecto === true }; };
  const mostrar = () => {
    const d = datos();
    const r = evaluarGarantia({ ...d, fechaSolicitud: hoy }, pol);
    if (!r.ok) { $('#resG').innerHTML = `<div class="errors">${r.errors.map(esc).join('<br>')}</div>`; return null; }
    const cls = r.elegible === true ? 'ok' : r.elegible === false ? 'bad' : 'warn';
    $('#resG').innerHTML = `<div class="card">
      <div class="notice ${cls}">${esc(r.motivo)}</div>
      ${r.vence ? `<p>Garantía ${r.vigente ? 'vigente' : 'vencida'}: ${r.vigente ? 'vence' : 'venció'} el <strong>${esc(r.vence)}</strong>${r.vigente ? ` (quedan ${r.diasRestantes} días)` : ''}.</p>` : ''}
      ${r.limiteRespuesta && r.vigente ? `<p>Fecha límite para responder: <strong>${esc(r.limiteRespuesta)}</strong> (${r.plazoRespuestaDias} días).</p>` : ''}
      ${(r.avisos || []).map((a) => `<div class="notice info">${esc(a)}</div>`).join('')}
      <p class="muted">Recuerda: entrega constancia escrita de recibido con la fecha. Si no procede, el técnico debe sustentarlo.</p>
    </div>`;
    return r;
  };
  $('#evaluar').addEventListener('click', mostrar);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!mostrar()) return;
    const d = datos();
    const c = await intentar(() => repo.crearCaso(user, { modelo: d.modelo, sintomas: d.sintomas, antecedentes: 'Solicitud de garantía', garantia: { condicion: d.condicion, fechaCompra: d.fechaCompra, causa: d.causa, proveedorDirecto: d.proveedorDirecto } }), $('#errG'));
    if (c) { ctx.toast(`Garantía registrada: caso #${c.numero}`); ctx.go('#/tecnico/caso/' + c.id); }
  });
}

function bloqueGarantia(ctx, c) {
  const g = c.garantia;
  if (!g) return '';
  const hoy = ctx.repo.hoyISO();
  const puede = can(ctx.user, 'tecnico.confirmarFalla');
  const res = g.resolucion;
  return `<div class="card"><div class="row between"><h3>Garantía</h3>${plazoBadge(c, hoy)}</div>
    <p>Vendido ${esc(g.condicion)} el ${esc(g.fechaCompra)} · ${g.vigente == null ? 'término no definido por la gerencia' : g.vigente ? `vigente hasta ${esc(g.vence)}` : `<strong>vencida</strong> el ${esc(g.vence)}`}${g.proveedorDirecto ? ' · con garantía directa de proveedor' : ''}</p>
    <p class="meta">Solicitada el ${esc(g.solicitada)} · causa aparente al recibir: ${esc(CAUSAS[g.causaInicial] || '')}</p>
    ${res ? `<div class="notice ${res.tipo === 'rechazada' ? 'warn' : 'ok'}"><strong>${esc(SOLUCIONES[res.tipo])}</strong> · ${esc(res.fecha)}
        ${res.tipo === 'cambio' ? `<br>Valor pagado ${cop(res.valorPagado)} · equipo nuevo ${cop(res.valorEquipoNuevo)} · <strong>excedente a pagar: ${cop(res.excedente)}</strong>` : ''}
        ${res.tipo === 'devolucion' ? `<br>Devolver: <strong>${cop(res.devolver)}</strong>` : ''}
        ${res.motivo ? `<br>${esc(res.motivo)}` : ''}</div>`
    : puede ? `<div id="errR"></div><form id="fR" class="no-print" novalidate>
        <div class="form-grid">
          <label>¿La falla es reparable?<select name="reparable"><option value="si">Sí</option><option value="no">No</option></select></label>
          <label>Respuesta<select name="tipo">${opciones(SOLUCIONES, 'reparacion')}</select></label>
          <label>Valor pagado por el cliente (COP)<input name="valorPagado" inputmode="numeric"></label>
          <label>Valor del equipo que se lleva (COP)<input name="valorEquipoNuevo" inputmode="numeric"><span class="hint">Solo para cambio.</span></label>
        </div>
        <label>Observación / motivo (obligatorio si no procede)<input name="motivo" maxlength="300"></label>
        <p class="hint">Si no es reparable, el cliente elige entre cambio y devolución.</p>
        <button class="btn primary">Registrar respuesta</button></form>`
    : '<p class="muted">La respuesta la registra un técnico.</p>'}
  </div>`;
}
