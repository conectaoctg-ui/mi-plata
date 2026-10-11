import { esc, cop, pct, badge, procedencia, tabs, formData, erroresHTML, parseCOP, $ } from './h.js';
import { can } from '../core/permissions.js';
import { CONDICIONES, USOS, vigencia, comparar, recomendar } from '../core/catalog.js';
import { calcularMargen, descuentoMaximo } from '../core/finance.js';

const CMP_KEY = 'conectaoctg-sa-comparar';
const leerCmp = () => { try { return JSON.parse(sessionStorage.getItem(CMP_KEY) || '[]'); } catch { return []; } };
const guardarCmp = (ids) => { try { sessionStorage.setItem(CMP_KEY, JSON.stringify(ids.slice(0, 3))); } catch { } };

function vigBadge(e, hoy) {
  const v = vigencia(e, hoy);
  return v.estado === 'vigente' ? badge('verificado', v.texto) : v.estado === 'demo' ? badge('demo') : badge('desconocido', v.texto);
}

/** Argumento comercial construido SOLO con datos registrados. */
export function argumentoVeraz(e, cfg) {
  const partes = [`${e.modelo} de ${e.capacidadGB} GB, ${CONDICIONES[e.condicion].toLowerCase()}${e.color ? ', color ' + e.color.toLowerCase() : ''}.`];
  if (e.condicion !== 'nuevo') partes.push(e.saludBateria ? `Salud de batería registrada: ${e.saludBateria} % (muéstrala en Ajustes delante del cliente).` : 'Salud de batería: no registrada, revísala en Ajustes antes de ofrecerlo.');
  partes.push(`Precio de contado: ${cop(e.precio)}.`);
  if (e.garantiaMeses) partes.push(`Garantía registrada: ${e.garantiaMeses} meses.`);
  else partes.push(cfg.garantias ? 'Garantía: según la política registrada por la administración.' : 'Garantía: no registrada. Confírmala con la administración antes de ofrecerla.');
  if (e.notas) partes.push(e.notas);
  return partes.join(' ');
}

export function render(ctx) {
  const sub = ctx.args[0] || 'catalogo';
  const items = [['#/ventas/catalogo', 'Catálogo'], ['#/ventas/recomendar', 'Recomendar'], ['#/ventas/comparar', 'Comparar'], ['#/ventas/revisar', 'Revisar un usado']];
  if (can(ctx.user, 'margen.calcular')) items.push(['#/ventas/margen', 'Márgenes']);
  const header = `<h1>Ventas iPhone</h1>${tabs(items, '#/ventas/' + sub)}`;
  const catalogo = ctx.repo.listarCatalogo(ctx.user);
  const vacio = !catalogo.length ? `<div class="notice warn">El catálogo está vacío. La administración debe registrar los equipos con su precio, inventario, fuente y fecha${can(ctx.user, 'catalogo.editar') ? ' en <a href="#/admin/catalogo">Administración › Catálogo</a>' : ''}. Mientras tanto, no se deben dar precios ni disponibilidad.</div>` : '';
  const demo = catalogo.some((e) => e.demo) ? '<div class="notice bad">Hay equipos DEMO con precios ficticios. No los uses con clientes reales.</div>' : '';
  const fn = { catalogo: vistaCatalogo, recomendar: vistaRecomendar, comparar: vistaComparar, margen: vistaMargen, revisar: vistaRevisar }[sub] || vistaCatalogo;
  ctx.view.innerHTML = header + vacio + demo + '<div id="sub"></div>';
  fn(ctx, catalogo, $('#sub'));
}

function tarjeta(e, ctx, cmp) {
  const hoy = ctx.repo.hoyISO();
  const cfg = ctx.repo.config();
  return `<div class="card">
    <div class="row between"><h3>${esc(e.modelo)} · ${e.capacidadGB} GB</h3>${vigBadge(e, hoy)}</div>
    <div class="row"><span class="tag">${esc(CONDICIONES[e.condicion])}</span>${e.color ? `<span class="tag">${esc(e.color)}</span>` : ''}${e.stock > 0 ? `<span class="tag ok">${e.stock} disponible(s)</span>` : '<span class="tag bad">Sin stock</span>'}${e.saludBateria ? `<span class="tag">Batería ${e.saludBateria} %</span>` : ''}</div>
    <div class="kpi">${cop(e.precio)}</div>
    ${procedencia(e)}
    <details><summary>Argumento comercial veraz</summary><p>${esc(argumentoVeraz(e, cfg))}</p><small class="muted">Construido solo con los datos registrados. Si algo falta, se confirma antes de afirmarlo.</small></details>
    <label class="inline"><input type="checkbox" data-cmp="${esc(e.id)}" ${cmp.includes(e.id) ? 'checked' : ''}> Comparar</label>
  </div>`;
}

function vistaCatalogo(ctx, catalogo, el) {
  const filtro = ctx.args[1] || '';
  const cmp = leerCmp();
  const lista = catalogo.filter((e) => !filtro || e.condicion === filtro).sort((a, b) => (b.stock > 0) - (a.stock > 0) || a.precio - b.precio);
  el.innerHTML = `
    <div class="row">
      <label>Condición <select id="fCond"><option value="">Todas</option>${Object.entries(CONDICIONES).map(([k, v]) => `<option value="${k}" ${k === filtro ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <a class="btn" href="#/ventas/comparar">Ver comparación (${cmp.length})</a>
    </div>
    <div class="grid">${lista.map((e) => tarjeta(e, ctx, cmp)).join('') || '<p class="muted">Sin equipos para este filtro.</p>'}</div>`;
  $('#fCond').addEventListener('change', (ev) => ctx.go('#/ventas/catalogo/' + ev.target.value));
  el.querySelectorAll('[data-cmp]').forEach((cb) => cb.addEventListener('change', () => {
    let ids = leerCmp().filter((x) => x !== cb.dataset.cmp);
    if (cb.checked) { if (ids.length >= 3) { cb.checked = false; ctx.toast('Puedes comparar hasta 3 equipos.'); return; } ids.push(cb.dataset.cmp); }
    guardarCmp(ids);
    ctx.refresh();
  }));
}

function vistaComparar(ctx, catalogo, el) {
  const ids = leerCmp();
  const eq = ids.map((id) => catalogo.find((e) => e.id === id)).filter(Boolean);
  if (eq.length < 2) { el.innerHTML = '<div class="card">Marca entre 2 y 3 equipos con "Comparar" en el <a href="#/ventas/catalogo">catálogo</a>.</div>'; return; }
  const filas = comparar(eq);
  const fmt = (k, v) => v == null || v === '' ? '<span class="tag desconocido">Sin dato</span>' : k === 'precio' ? cop(v) : k === 'condicion' ? esc(CONDICIONES[v]) : esc(v);
  el.innerHTML = `
    <div class="table-wrap card"><table>
      <thead><tr><th>Característica</th>${eq.map((e) => `<th>${esc(e.modelo)}</th>`).join('')}</tr></thead>
      <tbody>${filas.map((f) => `<tr class="${f.distinto ? 'diff' : ''}"><td>${esc(f.nombre)}</td>${f.valores.map((v) => `<td>${fmt(f.campo, v)}</td>`).join('')}</tr>`).join('')}
      <tr><td>Vigencia del dato</td>${eq.map((e) => `<td>${vigBadge(e, ctx.repo.hoyISO())}</td>`).join('')}</tr></tbody>
    </table></div>
    <p class="muted">Las filas resaltadas son las diferencias. Solo se muestran datos registrados por la administración.</p>
    <button class="btn" id="limpiar">Limpiar comparación</button>`;
  $('#limpiar').addEventListener('click', () => { guardarCmp([]); ctx.refresh(); });
}

function vistaRecomendar(ctx, catalogo, el) {
  el.innerHTML = `
    <div class="card"><form id="fRec">
      <p class="muted">Llena lo que el cliente te contó en las preguntas de descubrimiento.</p>
      <div class="form-grid">
        <label>Presupuesto del cliente (COP)<input name="presupuesto" inputmode="numeric" placeholder="Ej.: 1.800.000"></label>
        <label>Capacidad mínima<select name="cap"><option value="0">Cualquiera</option><option value="64">64 GB</option><option value="128">128 GB</option><option value="256">256 GB</option><option value="512">512 GB</option></select></label>
      </div>
      <fieldset class="card"><legend>Uso principal</legend>${Object.entries(USOS).map(([k, v]) => `<label class="inline"><input type="checkbox" name="usos" value="${k}"> ${esc(v)}</label>`).join('')}</fieldset>
      <fieldset class="card"><legend>Acepta equipos</legend>${Object.entries(CONDICIONES).map(([k, v]) => `<label class="inline"><input type="checkbox" name="cond" value="${k}" checked> ${esc(v)}</label>`).join('')}</fieldset>
      <button class="btn primary">Recomendar</button>
    </form></div><div id="res"></div>`;
  $('#fRec').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const d = formData(ev.target);
    const presupuesto = d.presupuesto ? parseCOP(d.presupuesto) : null;
    if (d.presupuesto && !(presupuesto > 0)) { $('#res').innerHTML = erroresHTML({ message: 'Escribe el presupuesto en pesos, por ejemplo 1.800.000.' }); return; }
    if (!d.cond.length) { $('#res').innerHTML = erroresHTML({ message: 'Marca al menos un tipo de equipo.' }); return; }
    const r = recomendar(catalogo, { presupuesto, usos: d.usos, capacidadMinGB: Number(d.cap), condiciones: d.cond }, ctx.repo.hoyISO());
    const cmp = leerCmp();
    $('#res').innerHTML = r.recomendaciones.length
      ? `<h3>Opciones sugeridas (${r.recomendaciones.length})</h3><p class="muted">Muestra 2 o 3 opciones, confirma disponibilidad y deja que el cliente compare.</p>` +
        r.recomendaciones.map((x) => `<div>${tarjeta(x.equipo, ctx, cmp)}<div class="notice info">Por qué: ${esc(x.razones.join(' · '))}</div></div>`).join('')
      : `<div class="card"><h3>No hay equipos con stock que cumplan todo</h3>${r.alternativa ? `<p>La opción más cercana es <strong>${esc(r.alternativa.equipo.modelo)} ${r.alternativa.equipo.capacidadGB} GB</strong> por ${cop(r.alternativa.equipo.precio)}, ${cop(r.alternativa.diferencia)} por encima del presupuesto. Puedes mencionar la financiación como alternativa, sin prometer aprobación.</p>` : '<p>No hay equipos registrados con esas condiciones. Registra al cliente en Clientes para hacerle seguimiento si lo autoriza.</p>'}</div>`;
    ctx.view.querySelectorAll('[data-cmp]').forEach((cb) => cb.addEventListener('change', () => {
      let ids = leerCmp().filter((x) => x !== cb.dataset.cmp);
      if (cb.checked) ids.push(cb.dataset.cmp);
      guardarCmp(ids);
      ctx.toast('Comparación actualizada');
    }));
  });
}

function vistaMargen(ctx, catalogo, el) {
  const cfg = ctx.repo.config();
  const conCosto = catalogo.filter((e) => e.costo != null);
  el.innerHTML = `
    <div class="card"><form id="fMar">
      <p>${badge('calculo')} Calcula con los datos registrados. No reemplaza la política comercial.</p>
      <label>Equipo del catálogo<select name="eq"><option value="">— Escribir valores a mano —</option>${conCosto.map((e) => `<option value="${esc(e.id)}">${esc(e.modelo)} ${e.capacidadGB} GB · ${cop(e.precio)}</option>`).join('')}</select></label>
      <div class="form-grid">
        <label>Precio de lista (COP)<input name="precio" inputmode="numeric"></label>
        <label>Costo (COP)<input name="costo" inputmode="numeric"></label>
        <label>Descuento propuesto (COP)<input name="descuento" inputmode="numeric" value="0"></label>
      </div>
      <button class="btn primary">Calcular</button>
    </form></div><div id="res"></div>`;
  const f = $('#fMar');
  f.eq.addEventListener('change', () => {
    const e = conCosto.find((x) => x.id === f.eq.value);
    if (e) { f.precio.value = e.precio; f.costo.value = e.costo; }
  });
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const precioLista = parseCOP(f.precio.value), costo = parseCOP(f.costo.value), descuento = parseCOP(f.descuento.value || '0');
    const r = calcularMargen({ precioLista, costo, descuento });
    if (!r.ok) { $('#res').innerHTML = erroresHTML({ message: 'Revisa los valores.', errores: r.errors }); return; }
    const min = cfg.margenMinimo;
    const maxDesc = min != null ? descuentoMaximo({ precioLista, costo, margenMinimo: min }) : null;
    $('#res').innerHTML = `<div class="card">
      <div class="grid">
        <div><div class="muted">Precio de venta</div><div class="kpi">${cop(r.precioVenta)}</div></div>
        <div><div class="muted">Utilidad</div><div class="kpi">${cop(r.utilidad)}</div></div>
        <div><div class="muted">Margen sobre venta</div><div class="kpi">${pct(r.margenSobreVenta, 1)}</div></div>
      </div>
      ${r.perdida ? '<div class="notice bad">Con este descuento la venta da pérdida.</div>' : ''}
      ${min != null ? `<p>Margen mínimo registrado: ${pct(min, 1)}. Descuento máximo permitido: <strong>${cop(maxDesc)}</strong>. ${descuento > maxDesc ? '<span class="tag bad">El descuento propuesto lo supera: requiere autorización.</span>' : '<span class="tag ok">Dentro del límite</span>'}</p>` : `<p>${badge('desconocido', 'Margen mínimo no registrado')} La administración debe definirlo en Configuración.</p>`}
    </div>`;
  });
}

const REVISION_USADO = [
  'Ajustes > General > Información: modelo, capacidad e IMEI coinciden con la factura/caja',
  'IMEI con *#06# coincide con Ajustes',
  'Consulta de IMEI reportado según el procedimiento de la tienda',
  'Sin cuenta iCloud ajena (Buscar desactivado, sesión cerrada)',
  'Salud de batería revisada y anotada',
  'Historial de piezas revisado (si el modelo lo muestra)',
  'Pantalla y táctil en todos los bordes',
  'Face ID / Touch ID',
  'Cámaras, flash, micrófono, altavoces',
  'Carga por cable e inalámbrica',
  'Señal, WiFi, Bluetooth',
  'Botones y vibración',
  'Estado físico registrado con fotos'
];

function vistaRevisar(ctx, catalogo, el) {
  el.innerHTML = `<div class="card">
    <h3>Checklist de revisión de un iPhone usado</h3>
    <p class="muted">Úsalo antes de recibir un usado para la venta o antes de entregarlo a un cliente. No se guarda: es una guía.</p>
    ${REVISION_USADO.map((c, i) => `<label class="inline"><input type="checkbox" id="rv${i}"> ${esc(c)}</label>`).join('')}
    <div id="rvRes" class="notice warn">Faltan ${REVISION_USADO.length} revisiones.</div>
  </div>`;
  el.addEventListener('change', () => {
    const faltan = REVISION_USADO.filter((_, i) => !$('#rv' + i).checked).length;
    const r = $('#rvRes');
    r.className = 'notice ' + (faltan ? 'warn' : 'ok');
    r.textContent = faltan ? `Faltan ${faltan} revisiones.` : 'Revisión completa. Si algo falló, anótalo y repórtalo a la administración.';
  });
}
