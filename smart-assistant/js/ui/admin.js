import { esc, cop, pct, bar, badge, procedencia, tabs, formData, intentar, confirmar, opciones, parseCOP, hoyISO, $ } from './h.js';
import { can, ROLES } from '../core/permissions.js';
import { CONDICIONES, USOS, vigencia } from '../core/catalog.js';
import { ETAPAS } from '../core/crm.js';
import { ESTADOS } from '../core/service.js';
import { AREAS } from '../core/academy.js';
import { parsePct } from '../core/money.js';

export function render(ctx) {
  const { user } = ctx;
  const [sub = 'metricas', id] = ctx.args;
  const items = [['#/admin/metricas', 'Indicadores', 'metricas.ver'], ['#/admin/usuarios', 'Usuarios', 'usuarios.gestionar'], ['#/admin/catalogo', 'Catálogo', 'catalogo.editar'],
    ['#/admin/conocimiento', 'Conocimiento', 'conocimiento.editar'], ['#/admin/config', 'Configuración', 'financiacion.configurar'], ['#/admin/auditoria', 'Auditoría', 'auditoria.ver'], ['#/admin/respaldo', 'Respaldo', 'datos.respaldo']]
    .filter((x) => can(user, x[2]));
  const permiso = Object.fromEntries(items.map((x) => [x[0].split('/')[2], x[2]]));
  ctx.view.innerHTML = `<h1>Administración</h1>${tabs(items, '#/admin/' + sub)}<div id="sub"></div>`;
  const el = $('#sub');
  if (!permiso[sub]) { el.innerHTML = '<div class="card" role="alert">Tu rol no tiene acceso a esta sección.</div>'; return; }
  ({ metricas, usuarios, catalogo: (c, e) => catalogo(c, e, id), conocimiento: (c, e) => conocimiento(c, e, id), config, auditoria, respaldo }[sub])(ctx, el);
}

function metricas(ctx, el) {
  const m = ctx.repo.metricas(ctx.user);
  const e = m.embudo;
  const maxEtapa = Math.max(1, ...Object.values(e.porEtapa));
  el.innerHTML = `
    <p class="muted">Los indicadores se calculan con los datos registrados en este dispositivo. Con pocos datos no son representativos.</p>
    <div class="grid">
      <div class="card"><div class="muted">Personas activas</div><div class="kpi">${m.equipo.length}</div></div>
      <div class="card"><div class="muted">Conversión comercial</div><div class="kpi">${e.conversion == null ? '—' : pct(e.conversion)}</div><small>${e.total} clientes registrados</small></div>
      <div class="card"><div class="muted">Casos técnicos</div><div class="kpi">${m.tecnico.total}</div><small>${m.tecnico.entregados} entregados con control de calidad</small></div>
      <div class="card"><div class="muted">Garantías respondidas a tiempo</div><div class="kpi">${m.garantias.resueltas ? pct(m.garantias.aTiempo / m.garantias.resueltas) : '—'}</div><small>${m.garantias.total} solicitudes · ${m.garantias.vencidasSinRespuesta} vencidas sin respuesta</small></div>
      <div class="card"><div class="muted">Conocimiento verificado</div><div class="kpi">${m.conocimiento.verificados}/${m.conocimiento.total}</div></div>
    </div>
    <div class="grid">
      <div class="card"><h3>Embudo por etapa</h3>${ETAPAS.map((s) => `<div class="row between"><span>${esc(s.nombre)}</span><strong>${e.porEtapa[s.id]}</strong></div>${bar(e.porEtapa[s.id] / maxEtapa)}`).join('')}</div>
      <div class="card"><h3>Motivos de pérdida</h3>${Object.keys(e.motivosPerdida).length ? Object.entries(e.motivosPerdida).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="row between"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('') : '<p class="muted">Sin ventas perdidas registradas.</p>'}</div>
      <div class="card"><h3>Casos por estado</h3>${Object.entries(m.tecnico.porEstado).map(([k, v]) => `<div class="row between"><span>${esc(ESTADOS[k])}</span><strong>${v}</strong></div>`).join('') || '<p class="muted">Sin casos.</p>'}
        <p class="meta">Reingresos (antecedentes con "garantía" o "reingreso"): ${m.tecnico.reingresos}</p></div>
    </div>
    <div class="table-wrap card"><h3>Capacitación</h3><table>
      <thead><tr><th>Persona</th><th>Rol</th><th>Avance</th><th class="num">Promedio</th><th class="num">Días hasta completar</th><th class="num">Faltas éticas en simulación</th></tr></thead>
      <tbody>${m.equipo.map((p) => `<tr><td>${esc(p.nombre)}</td><td>${esc(ROLES[p.rol])}</td><td>${p.aprobadas}/${p.total}</td><td class="num">${p.promedio == null ? '—' : pct(p.promedio)}</td><td class="num">${p.diasCapacitacion ?? '—'}</td><td class="num">${p.faltasEticas}</td></tr>`).join('')}</tbody></table></div>
    <div class="notice info">Faltan datos para medir satisfacción del cliente, errores en procedimientos de E-Credit y costos de IA: esta versión no los registra todavía.</div>`;
}

function usuarios(ctx, el) {
  const { repo, user } = ctx;
  const lista = repo.listarUsuarios(user);
  el.innerHTML = `
    <div class="table-wrap card"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      ${lista.map((u) => `<tr><td>${esc(u.nombre)}</td><td>${esc(u.usuario)}</td>
        <td><select data-rol="${esc(u.id)}" aria-label="Rol de ${esc(u.nombre)}">${opciones(ROLES, u.rol)}</select></td>
        <td>${u.activo ? '<span class="tag ok">Activo</span>' : '<span class="tag bad">Inactivo</span>'}</td>
        <td class="row"><button class="btn small" data-act="${esc(u.id)}">${u.activo ? 'Desactivar' : 'Activar'}</button><button class="btn small" data-clave="${esc(u.id)}">Nueva clave</button></td></tr>`).join('')}
    </tbody></table></div>
    <div id="errU"></div>
    <form id="fU" class="card" novalidate><h3>Nuevo usuario</h3>
      <div class="form-grid">
        <label>Nombre<input name="nombre"></label>
        <label>Usuario<input name="usuario" autocapitalize="none"></label>
        <label>Clave inicial<input name="clave" type="password" autocomplete="new-password"></label>
        <label>Rol<select name="rol">${opciones(ROLES, 'vendedor')}</select></label>
      </div>
      <p class="hint">Entrega la clave en persona y pide que la cambie. Solo se guarda su versión cifrada (hash).</p>
      <button class="btn primary">Crear</button>
    </form>`;
  const err = $('#errU');
  $('#fU').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await intentar(() => repo.crearUsuario(user, formData(e.target)), err)) { ctx.toast('Usuario creado'); ctx.refresh(); }
  });
  el.querySelectorAll('[data-rol]').forEach((s) => s.addEventListener('change', async () => {
    if (!(await confirmar(`¿Cambiar el rol a ${ROLES[s.value]}? Cambia lo que esta persona puede ver y hacer.`))) { ctx.refresh(); return; }
    if (await intentar(() => repo.actualizarUsuario(user, s.dataset.rol, { rol: s.value }), err)) ctx.toast('Rol actualizado');
    ctx.refresh();
  }));
  el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    const u = lista.find((x) => x.id === b.dataset.act);
    if (u.activo && !(await confirmar(`¿Desactivar a ${u.nombre}? No podrá entrar.`, 'Desactivar'))) return;
    if (await intentar(() => repo.actualizarUsuario(user, u.id, { activo: !u.activo }), err)) ctx.refresh();
  }));
  el.querySelectorAll('[data-clave]').forEach((b) => b.addEventListener('click', async () => {
    const nueva = prompt('Escribe la nueva clave (mínimo 6 caracteres):');
    if (!nueva) return;
    await intentar(() => repo.cambiarClave(user, b.dataset.clave, nueva), err);
    if (!err.innerHTML) ctx.toast('Clave actualizada');
  }));
}

function catalogo(ctx, el, id) {
  const { repo, user } = ctx;
  const lista = repo.listarCatalogo(user);
  const e = id ? lista.find((x) => x.id === id) || {} : {};
  const hoy = hoyISO();
  el.innerHTML = `
    <div class="row between"><h2>Equipos (${lista.length})</h2>
      <div class="row"><button class="btn small" id="demo">Cargar demo ficticio</button>${lista.some((x) => x.demo) ? '<button class="btn small danger" id="quitarDemo">Quitar demo</button>' : ''}</div></div>
    <div class="table-wrap card"><table><thead><tr><th>Equipo</th><th>Condición</th><th class="num">Precio</th><th class="num">Costo</th><th class="num">Stock</th><th>Vigencia</th><th></th></tr></thead><tbody>
      ${lista.map((x) => { const v = vigencia(x, hoy); return `<tr><td>${esc(x.modelo)} ${x.capacidadGB} GB ${x.demo ? badge('demo') : ''}</td><td>${esc(CONDICIONES[x.condicion])}</td><td class="num">${cop(x.precio)}</td><td class="num">${cop(x.costo)}</td><td class="num">${x.stock}</td><td>${badge(v.estado === 'vigente' ? 'verificado' : v.estado === 'demo' ? 'demo' : 'desconocido', v.texto)}</td>
      <td class="row">${x.demo ? '' : `<a class="btn small" href="#/admin/catalogo/${esc(x.id)}">Editar</a><button class="btn small danger" data-del="${esc(x.id)}">Eliminar</button>`}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Sin equipos registrados.</td></tr>'}
    </tbody></table></div>
    <div id="errE"></div>
    <form id="fE" class="card" novalidate><h3>${e.id ? 'Editar equipo' : 'Registrar equipo'}</h3>
      <div class="form-grid">
        <label>Modelo<input name="modelo" value="${esc(e.modelo || '')}" placeholder="iPhone 13"></label>
        <label>Capacidad (GB)<input name="capacidadGB" type="number" min="1" value="${e.capacidadGB ?? ''}"></label>
        <label>Condición<select name="condicion">${opciones(CONDICIONES, e.condicion || 'nuevo')}</select></label>
        <label>Color<input name="color" value="${esc(e.color || '')}"></label>
        <label>Precio de contado (COP)<input name="precio" inputmode="numeric" value="${e.precio ?? ''}"></label>
        <label>Costo (COP, opcional)<input name="costo" inputmode="numeric" value="${e.costo ?? ''}"><span class="hint">Solo lo ven administración y supervisión.</span></label>
        <label>Unidades disponibles<input name="stock" type="number" min="0" value="${e.stock ?? ''}"></label>
        <label>Salud de batería (%)<input name="saludBateria" type="number" min="1" max="100" value="${e.saludBateria ?? ''}"></label>
        <label>Garantía (meses)<input name="garantiaMeses" type="number" min="0" value="${e.garantiaMeses ?? ''}"><span class="hint">Déjalo vacío si no está definida.</span></label>
      </div>
      <fieldset class="card"><legend>Usos recomendados</legend>${Object.entries(USOS).map(([k, v]) => `<label class="inline"><input type="checkbox" name="usos" value="${k}" ${(e.usos || []).includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</fieldset>
      <label>Características / estado<textarea name="notas">${esc(e.notas || '')}</textarea></label>
      <div class="form-grid">
        <label>Fuente del dato<input name="fuente" value="${esc(e.fuente || '')}" placeholder="Ej.: lista de precios proveedor 10/10"></label>
        <label>Fecha de actualización<input type="date" name="actualizado" value="${esc(e.actualizado || hoy)}"></label>
        <label>Responsable<input name="responsable" value="${esc(e.responsable || user.nombre)}"></label>
      </div>
      <button class="btn primary">Guardar</button> ${e.id ? '<a class="btn" href="#/admin/catalogo">Cancelar</a>' : ''}
    </form>`;
  const num = (v) => (v === '' || v == null ? null : Number(v));
  $('#fE').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    const datos = { ...d, id: e.id, capacidadGB: num(d.capacidadGB), precio: parseCOP(d.precio), costo: d.costo ? parseCOP(d.costo) : null, stock: num(d.stock), saludBateria: num(d.saludBateria), garantiaMeses: num(d.garantiaMeses) };
    if (await intentar(() => repo.guardarEquipo(user, datos), $('#errE'))) { ctx.toast('Equipo guardado'); ctx.go('#/admin/catalogo'); }
  });
  $('#demo').addEventListener('click', async () => {
    if (!(await confirmar('Se agregarán 4 equipos con precios FICTICIOS marcados como DEMO. No deben usarse con clientes.', 'Cargar demo'))) return;
    repo.cargarDemo(user); ctx.refresh();
  });
  $('#quitarDemo')?.addEventListener('click', () => { repo.quitarDemo(user); ctx.refresh(); });
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmar('¿Eliminar este equipo del catálogo?', 'Eliminar')) { await intentar(() => repo.eliminarEquipo(user, b.dataset.del)); ctx.refresh(); }
  }));
}

function conocimiento(ctx, el, id) {
  const { repo, user } = ctx;
  const lista = repo.listarConocimiento(user);
  const a = id ? lista.find((x) => x.id === id) || {} : {};
  el.innerHTML = `
    <p class="muted">Lo que se marque como verificado aparece así a todo el equipo. Verifica solo con una fuente oficial.</p>
    ${lista.map((k) => `<details class="card"><summary>${esc(k.titulo)} ${badge(k.estado === 'verificado' ? 'verificado' : 'pendiente')}</summary><p>${esc(k.texto)}</p>${procedencia(k)}
      <div class="row"><a class="btn small" href="#/admin/conocimiento/${esc(k.id)}">Editar</a><button class="btn small danger" data-del="${esc(k.id)}">Eliminar</button></div></details>`).join('')}
    <div id="errK"></div>
    <form id="fK" class="card" novalidate><h3>${a.id ? 'Editar artículo' : 'Nuevo artículo'}</h3>
      <div class="form-grid">
        <label>Título<input name="titulo" value="${esc(a.titulo || '')}"></label>
        <label>Área<select name="area">${opciones(AREAS, a.area || 'general')}</select></label>
        <label>Estado<select name="estado">${opciones({ pendiente: 'Pendiente de validar', verificado: 'Verificado' }, a.estado || 'pendiente')}</select></label>
      </div>
      <label>Contenido<textarea name="texto" rows="6">${esc(a.texto || '')}</textarea></label>
      <div class="form-grid">
        <label>Fuente<input name="fuente" value="${esc(a.estado === 'verificado' ? a.fuente || '' : '')}" placeholder="Documento oficial, manual, circular…"></label>
        <label>Fecha<input type="date" name="actualizado" value="${esc(a.estado === 'verificado' ? a.actualizado || hoyISO() : hoyISO())}"></label>
        <label>Responsable<input name="responsable" value="${esc(a.estado === 'verificado' ? a.responsable || '' : user.nombre)}"></label>
      </div>
      <button class="btn primary">Guardar</button> ${a.id ? '<a class="btn" href="#/admin/conocimiento">Cancelar</a>' : ''}
    </form>`;
  $('#fK').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (await intentar(() => repo.guardarArticulo(user, { ...formData(ev.target), id: a.id }), $('#errK'))) { ctx.toast('Artículo guardado'); ctx.go('#/admin/conocimiento'); }
  });
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmar('¿Eliminar este artículo?', 'Eliminar')) { await intentar(() => repo.eliminarArticulo(user, b.dataset.del)); ctx.refresh(); }
  }));
}

function config(ctx, el) {
  const { repo, user } = ctx;
  const c = repo.config();
  el.innerHTML = `
    <div id="errC"></div>
    <form id="fC" novalidate>
      <div class="card"><h3>Política de garantías</h3>
        <label>Texto oficial de la política<textarea name="garantias" rows="5">${esc(c.garantias)}</textarea></label>
        <div class="form-grid">
          <label>Meses de garantía · nuevos<input name="garantiaMesesNuevo" type="number" min="1" max="365" value="${c.garantiaMesesNuevo ?? ''}"></label>
          <label>Meses · usados<input name="garantiaMesesUsado" type="number" min="1" max="365" value="${c.garantiaMesesUsado ?? ''}"></label>
          <label>Meses · reacondicionados<input name="garantiaMesesReacondicionado" type="number" min="0" max="365" value="${c.garantiaMesesReacondicionado ?? ''}"><span class="hint">Vacío = no definido (la app pedirá consultar).</span></label>
          <label>Días para responder<input name="garantiaDiasRespuesta" type="number" min="1" max="365" value="${c.garantiaDiasRespuesta ?? ''}"></label>
          <label>Días máximos con proveedor (nuevos)<input name="garantiaDiasProveedor" type="number" min="1" max="365" value="${c.garantiaDiasProveedor ?? ''}"></label>
        </div>
        <div class="form-grid"><label>Fuente<input name="garantiasFuente" value="${esc(c.garantiasFuente)}"></label><label>Fecha<input type="date" name="garantiasFecha" value="${esc(c.garantiasFecha)}"></label><label>Responsable<input name="garantiasResponsable" value="${esc(c.garantiasResponsable)}"></label></div>
      </div>
      <div class="card"><h3>Financiación</h3>
        <div class="form-grid">
          <label>Tasa de usura vigente (% EA)<input name="tasaUsura" inputmode="decimal" value="${c.tasaUsuraEA == null ? '' : String(+(c.tasaUsuraEA * 100).toFixed(4)).replace('.', ',')}"><span class="hint">Déjala vacía si no la tienes confirmada.</span></label>
          <label>Fuente de la tasa<input name="tasaUsuraFuente" value="${esc(c.tasaUsuraFuente)}"></label>
          <label>Vigente desde<input type="date" name="tasaUsuraFecha" value="${esc(c.tasaUsuraFecha)}"></label>
        </div>
        <div class="form-grid">
          <label>Enlace oficial de E-Credit<input name="ecreditUrl" value="${esc(c.ecreditUrl)}" placeholder="https://…"></label>
          <label>Contacto comercial E-Credit<input name="ecreditContacto" value="${esc(c.ecreditContacto)}"></label>
          <label>Fuente<input name="ecreditFuente" value="${esc(c.ecreditFuente)}"></label>
          <label>Fecha<input type="date" name="ecreditFecha" value="${esc(c.ecreditFecha)}"></label>
          <label>Responsable<input name="ecreditResponsable" value="${esc(c.ecreditResponsable)}"></label>
        </div>
      </div>
      <div class="card"><h3>Ventas</h3>
        <label>Margen mínimo sobre venta (%)<input name="margen" inputmode="decimal" value="${c.margenMinimo == null ? '' : String(+(c.margenMinimo * 100).toFixed(2)).replace('.', ',')}"><span class="hint">Se usa para calcular el descuento máximo.</span></label>
      </div>
      <button class="btn primary">Guardar configuración</button>
    </form>
    <h2>Procedimiento oficial de E-Credit por etapa</h2>
    <p class="muted">Copia aquí el procedimiento de la documentación oficial. Lo que quede vacío se muestra como "no documentado".</p>
    ${repo.d.ecreditEtapas.map((e) => `<form class="card" data-etapa="${esc(e.id)}" novalidate><h3>${esc(e.nombre)}</h3><div class="errs"></div>
      <label>Procedimiento oficial<textarea name="procedimientoOficial">${esc(e.procedimientoOficial)}</textarea></label>
      <div class="form-grid"><label>Fuente<input name="fuente" value="${esc(e.fuente)}"></label><label>Fecha<input type="date" name="actualizado" value="${esc(e.actualizado)}"></label><label>Responsable<input name="responsable" value="${esc(e.responsable)}"></label></div>
      <button class="btn small">Guardar etapa</button></form>`).join('')}`;
  $('#fC').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    const tasa = d.tasaUsura.trim() ? parsePct(d.tasaUsura) : null;
    const margen = d.margen.trim() ? parsePct(d.margen) : null;
    const cambios = { ...d, tasaUsuraEA: tasa ?? (d.tasaUsura.trim() ? NaN : null), margenMinimo: margen ?? (d.margen.trim() ? NaN : null) };
    delete cambios.tasaUsura; delete cambios.margen;
    for (const k of ['garantiaMesesNuevo', 'garantiaMesesUsado', 'garantiaMesesReacondicionado', 'garantiaDiasRespuesta', 'garantiaDiasProveedor']) {
      cambios[k] = d[k] === '' ? null : Number(d[k]);
    }
    if (await intentar(() => repo.guardarConfig(user, cambios), $('#errC'))) ctx.toast('Configuración guardada');
  });
  el.querySelectorAll('[data-etapa]').forEach((f) => f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (await intentar(() => repo.guardarEtapaEcredit(user, f.dataset.etapa, formData(f)), f.querySelector('.errs'))) ctx.toast('Etapa guardada');
  }));
}

function auditoria(ctx, el) {
  const log = ctx.repo.auditoria(ctx.user).slice(0, 300);
  el.innerHTML = `<p class="muted">Últimos ${log.length} eventos. No se registran claves, teléfonos ni datos sensibles.</p>
    <div class="table-wrap card"><table><thead><tr><th>Fecha (UTC)</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead><tbody>
    ${log.map((e) => `<tr><td>${esc(e.fecha.slice(0, 19).replace('T', ' '))}</td><td>${esc(e.usuarioNombre)}</td><td>${esc(e.accion)}</td><td>${esc(e.entidad)}</td><td class="meta">${esc(Object.entries(e.detalle).map(([k, v]) => `${k}: ${v}`).join(' · '))}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function respaldo(ctx, el) {
  const { repo, user } = ctx;
  el.innerHTML = `
    <div class="card"><h3>Descargar respaldo</h3>
      <p>Descarga todos los datos de este dispositivo en un archivo. <strong>Contiene datos de clientes y claves cifradas:</strong> guárdalo en un lugar seguro y no lo compartas.</p>
      <button class="btn primary" id="exp">Descargar respaldo</button></div>
    <div class="card"><h3>Restaurar respaldo</h3><div id="errR"></div>
      <p>Reemplaza TODOS los datos actuales por los del archivo.</p>
      <input type="file" id="imp" accept="application/json,.json"></div>`;
  $('#exp').addEventListener('click', async () => {
    if (!(await confirmar('El archivo tendrá datos de clientes. ¿Continuar?', 'Descargar'))) return;
    const blob = new Blob([repo.exportar(user)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respaldo-conectaoctg-${hoyISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#imp').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { $('#errR').innerHTML = '<div class="errors">El archivo es demasiado grande.</div>'; return; }
    if (!(await confirmar('Se reemplazarán todos los datos actuales. Esta acción no se puede deshacer.', 'Restaurar'))) { ev.target.value = ''; return; }
    const texto = await file.text();
    if (await intentar(() => { repo.importar(user, texto); return true; }, $('#errR'))) { ctx.toast('Respaldo restaurado'); location.reload(); }
  });
}
