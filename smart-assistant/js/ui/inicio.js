import { esc, bar, pct } from './h.js';
import { can, ROLES } from '../core/permissions.js';
import { resumenProgreso } from '../core/academy.js';
import { seguimientosPendientes } from '../core/crm.js';

export function render({ repo, user, view }) {
  const lecs = repo.lecciones(user);
  const prog = repo.progreso(user);
  const res = resumenProgreso(lecs, prog);
  const asignaciones = repo.asignacionesDe(user).filter((a) => a.estado !== 'completada');
  const bloques = [];

  bloques.push(`
    <div class="card link" data-href="#/academia">
      <div class="muted">Mi capacitación</div>
      <div class="kpi">${pct(res.avance)}</div>
      ${bar(res.avance)}
      <small>${res.aprobadas} de ${res.total} lecciones aprobadas</small>
    </div>`);

  if (can(user, 'clientes.verPropios')) {
    const leads = repo.listarLeads(user);
    const pend = seguimientosPendientes(leads, repo.hoyISO());
    bloques.push(`
      <div class="card link" data-href="#/clientes">
        <div class="muted">Seguimientos para hoy</div>
        <div class="kpi">${pend.length}</div>
        <small>${leads.filter((l) => !['ganado', 'perdido'].includes(l.etapa)).length} clientes en proceso</small>
      </div>`);
  }
  if (can(user, 'tecnico.verCasos')) {
    const casos = repo.listarCasos(user).filter((c) => !['entregado', 'cancelado'].includes(c.estado));
    bloques.push(`
      <div class="card link" data-href="#/tecnico/casos">
        <div class="muted">Casos técnicos abiertos</div>
        <div class="kpi">${casos.length}</div>
        <small>${casos.filter((c) => c.estado === 'listo').length} listos para entregar</small>
      </div>`);
  }

  const alertas = [];
  if (user.rol === 'admin') {
    const cfg = repo.config();
    const kb = repo.listarConocimiento(user);
    const pendientesKB = kb.filter((k) => k.estado !== 'verificado').length;
    if (pendientesKB) alertas.push(`${pendientesKB} artículos de conocimiento están pendientes de validar.`);
    if (!cfg.garantias) alertas.push('No hay política de garantías registrada.');
    if (cfg.tasaUsuraEA == null) alertas.push('No hay tasa de usura vigente registrada (el simulador no puede compararla).');
    if (!cfg.ecreditUrl) alertas.push('No está registrado el enlace oficial de E-Credit.');
    if (repo.listarCatalogo(user).some((e) => e.demo)) alertas.push('El catálogo tiene equipos DEMO ficticios. Quítalos antes de usar la app con clientes.');
  }

  const sig = res.pendientes[0];
  view.innerHTML = `
    <h1>Hola, ${esc(user.nombre)}</h1>
    <p class="muted">${esc(ROLES[user.rol])} · ${esc(repo.config().empresa)}</p>
    ${alertas.length ? `<div class="notice warn"><strong>Pendientes de la administración</strong><ul>${alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul><a href="#/admin/config">Ir a configuración</a></div>` : ''}
    <div class="grid">${bloques.join('')}</div>
    ${asignaciones.length ? `<div class="card"><h3>Capacitación asignada</h3>${asignaciones.map((a) => {
      const l = lecs.find((x) => x.id === a.leccionId) || repo.d.lecciones.find((x) => x.id === a.leccionId);
      return `<div class="row between"><a href="#/academia/leccion/${esc(a.leccionId)}">${esc(l?.titulo || a.leccionId)}</a><span class="tag ${a.estado === 'vencida' ? 'bad' : 'warn'}">${a.estado === 'vencida' ? 'Vencida' : 'Pendiente'}${a.fechaLimite ? ' · ' + esc(a.fechaLimite) : ''}</span></div>`;
    }).join('')}</div>` : ''}
    ${sig ? `<div class="card link" data-href="#/academia/leccion/${esc(sig.id)}"><div class="muted">Siguiente lección sugerida</div><h3>${esc(sig.titulo)}</h3><small>${sig.minutos || 5} min</small></div>` : '<div class="notice ok">Completaste todas tus lecciones. ¡Bien hecho!</div>'}
    <h2>Accesos rápidos</h2>
    <div class="grid">
      ${can(user, 'catalogo.ver') ? '<a class="card link" href="#/ventas/recomendar"><strong>🎯 Recomendar un iPhone</strong><div class="muted">Según necesidad y presupuesto</div></a>' : ''}
      ${can(user, 'financiacion.simular') ? '<a class="card link" href="#/financiacion/simulador"><strong>🧮 Simulador educativo</strong><div class="muted">Cuotas en COP</div></a>' : ''}
      ${can(user, 'tecnico.crearCaso') ? '<a class="card link" href="#/tecnico/diagnostico"><strong>🩺 Diagnóstico guiado</strong><div class="muted">Paso a paso por síntoma</div></a>' : ''}
      <a class="card link" href="#/academia/simulaciones"><strong>🎭 Practicar con un cliente</strong><div class="muted">Conversaciones ficticias</div></a>
    </div>`;
  view.querySelectorAll('[data-href]').forEach((el) => el.addEventListener('click', () => { location.hash = el.dataset.href; }));
}

