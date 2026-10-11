import { esc, cop, pct, formData, parseCOP, confirmar, intentar, opciones, $ } from './h.js';
import { can } from '../core/permissions.js';
import { ETAPAS, MOTIVOS_PERDIDA, CANALES, ACCION_SUGERIDA, seguimientosPendientes, metricasEmbudo } from '../core/crm.js';

const ETAPA = Object.fromEntries(ETAPAS.map((e) => [e.id, e.nombre]));

export function render(ctx) {
  const [sub, id] = ctx.args;
  if (sub === 'nuevo' || sub === 'editar') return formulario(ctx, id);
  lista(ctx);
}

function lista(ctx) {
  const { repo, user, view } = ctx;
  const leads = repo.listarLeads(user);
  const nombres = can(user, 'clientes.verTodos') ? Object.fromEntries(repo.listarUsuarios(user).map((u) => [u.id, u.nombre])) : {};
  const pend = seguimientosPendientes(leads, repo.hoyISO());
  const m = metricasEmbudo(leads);
  const item = (l) => `
    <div class="card">
      <div class="row between">
        <h3>${esc(l.nombre)}</h3>
        <span class="tag ${l.etapa === 'ganado' ? 'ok' : l.etapa === 'perdido' ? 'bad' : ''}">${esc(ETAPA[l.etapa])}</span>
      </div>
      <div class="meta">${esc(l.canal)}${l.presupuesto ? ' · Presupuesto ' + cop(l.presupuesto) : ''}${nombres[l.asesorId] ? ' · Asesor: ' + esc(nombres[l.asesorId]) : ''}</div>
      ${l.interes ? `<p>${esc(l.interes)}</p>` : ''}
      ${l.noContactar ? '<div class="notice bad">🚫 No contactar (solicitud del cliente)</div>' : ''}
      <p><strong>Próxima acción:</strong> ${esc(l.proximaAccion || ACCION_SUGERIDA[l.etapa])}${l.proximaFecha ? ` · <span class="tag warn">${esc(l.proximaFecha)}</span>` : ''}</p>
      ${l.etapa === 'perdido' ? `<p class="muted">Motivo: ${esc(l.motivoPerdida)}</p>` : ''}
      <div class="row">
        <a class="btn small" href="#/clientes/editar/${esc(l.id)}">Editar</a>
        ${!l.noContactar ? `<button class="btn small" data-nc="${esc(l.id)}">Marcar no contactar</button>` : ''}
        ${can(user, 'clientes.eliminar') ? `<button class="btn small danger" data-del="${esc(l.id)}">Eliminar</button>` : ''}
      </div>
    </div>`;
  const abiertos = leads.filter((l) => !['ganado', 'perdido'].includes(l.etapa));
  const cerrados = leads.filter((l) => ['ganado', 'perdido'].includes(l.etapa));
  view.innerHTML = `
    <div class="row between"><h1>Clientes</h1><a class="btn primary" href="#/clientes/nuevo">+ Nuevo cliente</a></div>
    <div class="notice info">Registra solo lo necesario. Para guardar el teléfono se necesita la autorización del cliente, y si pide no ser contactado, se respeta.</div>
    <div class="grid">
      <div class="card"><div class="muted">En proceso</div><div class="kpi">${abiertos.length}</div></div>
      <div class="card"><div class="muted">Seguimientos hoy</div><div class="kpi">${pend.length}</div></div>
      <div class="card"><div class="muted">Conversión (cerrados)</div><div class="kpi">${m.conversion == null ? '—' : pct(m.conversion)}</div><small>${m.porEtapa.ganado} ganadas · ${m.porEtapa.perdido} perdidas</small></div>
    </div>
    ${pend.length ? `<h2>Seguimientos pendientes</h2>${pend.map(item).join('')}` : ''}
    <h2>En proceso</h2>
    ${ETAPAS.filter((e) => !['ganado', 'perdido'].includes(e.id)).map((e) => {
      const de = abiertos.filter((l) => l.etapa === e.id && !pend.includes(l));
      return de.length ? `<h3 class="muted">${esc(e.nombre)} (${de.length})</h3>${de.map(item).join('')}` : '';
    }).join('') || '<p class="muted">No hay clientes en proceso.</p>'}
    ${cerrados.length ? `<details class="card"><summary>Cerrados (${cerrados.length})</summary>${cerrados.map(item).join('')}</details>` : ''}`;

  view.querySelectorAll('[data-nc]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar('El cliente pidió no ser contactado. Se borrarán su teléfono y seguimientos. Esta acción no se puede deshacer.', 'Marcar no contactar'))) return;
    await intentar(() => repo.marcarNoContactar(user, b.dataset.nc));
    ctx.toast('Marcado como no contactar');
    ctx.refresh();
  }));
  view.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await confirmar('¿Eliminar este cliente definitivamente?', 'Eliminar'))) return;
    await intentar(() => repo.eliminarLead(user, b.dataset.del));
    ctx.refresh();
  }));
}

function formulario(ctx, id) {
  const { repo, user, view } = ctx;
  const l = id ? repo.listarLeads(user).find((x) => x.id === id) : { etapa: 'nuevo', canal: 'Tienda' };
  if (!l) { view.innerHTML = '<div class="card">Cliente no encontrado. <a href="#/clientes">Volver</a></div>'; return; }
  view.innerHTML = `
    <a href="#/clientes">‹ Clientes</a>
    <h1>${id ? 'Editar cliente' : 'Nuevo cliente'}</h1>
    <div id="err"></div>
    <form id="fLead" class="card" novalidate>
      <div class="form-grid">
        <label>Nombre<input name="nombre" value="${esc(l.nombre || '')}" required maxlength="60"></label>
        <label>Canal<select name="canal">${opciones(Object.fromEntries(CANALES.map((c) => [c, c])), l.canal)}</select></label>
        <label>Etapa<select name="etapa">${opciones(ETAPA, l.etapa)}</select></label>
        <label>Presupuesto (COP)<input name="presupuesto" inputmode="numeric" value="${l.presupuesto ?? ''}"></label>
      </div>
      <label>¿Qué busca? (necesidad, uso, modelo de interés)<textarea name="interes" maxlength="200">${esc(l.interes || '')}</textarea></label>
      <label>Objeciones o dudas<textarea name="objeciones" maxlength="300">${esc(l.objeciones || '')}</textarea></label>
      <label id="motivoBox">Motivo de pérdida<select name="motivoPerdida"><option value="">—</option>${opciones(Object.fromEntries(MOTIVOS_PERDIDA.map((m) => [m, m])), l.motivoPerdida)}</select></label>
      <fieldset class="card"><legend>Contacto y seguimiento</legend>
        ${l.noContactar ? '<div class="notice bad">El cliente pidió no ser contactado. No se guarda teléfono ni seguimiento.</div>' : `
        <label class="inline"><input type="checkbox" name="autorizaContacto" ${l.autorizaContacto ? 'checked' : ''}> El cliente autorizó el tratamiento de sus datos y ser contactado para este seguimiento</label>
        <div class="form-grid">
          <label>Teléfono / WhatsApp<input name="telefono" inputmode="tel" value="${esc(l.telefono || '')}"></label>
          <label>Fecha de seguimiento<input type="date" name="proximaFecha" value="${esc(l.proximaFecha || '')}"></label>
        </div>`}
        <label>Próxima acción<input name="proximaAccion" value="${esc(l.proximaAccion || '')}" maxlength="200"><span class="hint" id="sug"></span></label>
      </fieldset>
      <button class="btn primary">Guardar</button>
    </form>`;
  const f = $('#fLead');
  const actualizar = () => {
    $('#motivoBox').classList.toggle('hidden', f.etapa.value !== 'perdido');
    $('#sug').textContent = 'Sugerencia: ' + ACCION_SUGERIDA[f.etapa.value];
  };
  f.etapa.addEventListener('change', actualizar);
  actualizar();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = formData(f);
    const presupuesto = d.presupuesto ? parseCOP(d.presupuesto) : null;
    const ok = await intentar(() => {
      if (d.presupuesto && !(presupuesto > 0)) throw Object.assign(new Error('El presupuesto debe ser un valor en pesos.'), { name: 'AppError' });
      return repo.guardarLead(user, { ...l, ...d, id: l.id, presupuesto, autorizaContacto: d.autorizaContacto === true, telefono: d.telefono || '', proximaFecha: d.proximaFecha || '' });
    }, $('#err'));
    if (ok) { ctx.toast('Cliente guardado'); ctx.go('#/clientes'); }
  });
}
