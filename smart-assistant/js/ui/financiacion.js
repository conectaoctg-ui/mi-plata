import { esc, cop, pct, badge, procedencia, tabs, parseCOP, erroresHTML, $ } from './h.js';
import { simularCredito, ETIQUETA_SIMULACION } from '../core/finance.js';
import { parsePct } from '../core/money.js';
import { ECREDIT_ERRORES } from '../data/seed.js';

export function render(ctx) {
  const sub = ctx.args[0] || 'guia';
  ctx.view.innerHTML = `<h1>Financiación</h1>${tabs([['#/financiacion/guia', 'Guía E-Credit'], ['#/financiacion/simulador', 'Simulador educativo'], ['#/financiacion/errores', 'Errores frecuentes']], '#/financiacion/' + sub)}<div id="sub"></div>`;
  ({ guia, simulador, errores }[sub] || guia)(ctx, $('#sub'));
}

function guia(ctx, el) {
  const cfg = ctx.repo.config();
  const etapas = ctx.repo.d.ecreditEtapas;
  el.innerHTML = `
    <div class="notice warn"><strong>Importante:</strong> esta app <u>no está conectada</u> a E-Credit. Haz la consulta, simulación y solicitud en la plataforma oficial y usa esta guía como apoyo. El asesor no aprueba ni garantiza créditos.</div>
    <div class="card">
      <h3>Plataforma oficial</h3>
      ${cfg.ecreditUrl ? `<p><a href="${esc(cfg.ecreditUrl)}" target="_blank" rel="noopener noreferrer">Abrir E-Credit ↗</a></p>${procedencia({ fuente: cfg.ecreditFuente, actualizado: cfg.ecreditFecha, responsable: cfg.ecreditResponsable })}` : `<p>${badge('desconocido', 'Enlace no registrado')} La administración debe registrar el enlace oficial.</p>`}
      ${cfg.ecreditContacto ? `<p><strong>Contacto:</strong> ${esc(cfg.ecreditContacto)}</p>` : ''}
    </div>
    <h2>Etapas del proceso</h2>
    <p class="muted">El concepto general sirve para entender cada etapa. El procedimiento oficial es el que registra la administración a partir de la documentación de E-Credit.</p>
    ${etapas.map((e, i) => `<div class="card">
      <h3>${i + 1}. ${esc(e.nombre)}</h3>
      <p><span class="tag">Concepto general</span> ${esc(e.concepto)}</p>
      ${e.procedimientoOficial
        ? `<div>${badge('verificado', 'Procedimiento oficial registrado')}<p>${esc(e.procedimientoOficial).replace(/\n/g, '<br>')}</p>${procedencia(e)}</div>`
        : `<p>${badge('desconocido', 'Procedimiento oficial no documentado')} No improvises este paso: pregunta a la administración.</p>`}
    </div>`).join('')}
    <div class="card"><h3>Al explicarle al cliente</h3><ul>
      <li>Diferencia: precio de contado, cuota inicial, saldo financiado, intereses, cargos y cuota periódica.</li>
      <li>Usa solo cifras que entregue la plataforma oficial. La simulación de esta app es educativa.</li>
      <li>Pide autorización antes de consultar información del cliente.</li>
      <li>El cliente digita sus propias claves y códigos. Nunca los pidas ni los anotes.</li>
    </ul></div>`;
}

function simulador(ctx, el) {
  const cfg = ctx.repo.config();
  el.innerHTML = `
    <div class="notice bad"><strong>${esc(ETIQUETA_SIMULACION)}.</strong> Sirve para aprender a leer una financiación. No la muestres al cliente como oferta.</div>
    <form id="fSim" class="card" novalidate>
      <div class="form-grid">
        <label>Precio de contado (COP)<input name="precio" inputmode="numeric" placeholder="1.800.000" required></label>
        <label>Cuota inicial (COP)<input name="inicial" inputmode="numeric" value="0"></label>
        <label>Tasa de interés (%)<input name="tasa" inputmode="decimal" placeholder="Ej.: 2,1" required><span class="hint">Escríbela tal como aparece en la fuente.</span></label>
        <label>Tipo de tasa<select name="tipo"><option value="MV">Mensual vencida (MV)</option><option value="EA">Efectiva anual (EA)</option></select></label>
        <label>Plazo (meses)<input name="plazo" type="number" min="1" max="120" value="12"></label>
        <label>Cargos mensuales (COP)<input name="cargoMensual" inputmode="numeric" value="0"><span class="hint">Seguros u otros, si aplican.</span></label>
        <label>Cargos iniciales (COP)<input name="cargoInicial" inputmode="numeric" value="0"></label>
      </div>
      <label>¿De dónde sale la tasa?<input name="origen" placeholder="Ej.: ejercicio de práctica / dato del capacitador"></label>
      <button class="btn primary">Simular</button>
    </form>
    <div id="res"></div>`;
  $('#fSim').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const entrada = {
      precio: parseCOP(f.precio.value), cuotaInicial: parseCOP(f.inicial.value || '0'), tasa: parsePct(f.tasa.value), tipoTasa: f.tipo.value,
      plazoMeses: Number(f.plazo.value), cargoMensual: parseCOP(f.cargoMensual.value || '0'), cargoInicial: parseCOP(f.cargoInicial.value || '0'),
      tasaUsuraEA: cfg.tasaUsuraEA
    };
    const r = simularCredito({ ...entrada, precio: entrada.precio ?? NaN, tasa: entrada.tasa ?? NaN, cuotaInicial: entrada.cuotaInicial ?? NaN, cargoMensual: entrada.cargoMensual ?? NaN, cargoInicial: entrada.cargoInicial ?? NaN });
    if (!r.ok) { $('#res').innerHTML = erroresHTML({ message: 'Revisa los datos de la simulación.', errores: r.errors }); return; }
    const s = r.resumen;
    const dividido = Math.round(s.saldoFinanciado / s.plazoMeses);
    $('#res').innerHTML = `
      ${r.warnings.map((w) => `<div class="notice warn">${esc(w)}</div>`).join('')}
      <div class="card">
        <div class="row between"><h3>Resultado</h3>${badge('calculo')}</div>
        <p class="meta">Tasa usada: ${pct(s.tasaMensual, 4)} mensual ≈ ${pct(s.tasaEA, 2)} efectiva anual · Origen: ${esc(f.origen.value || 'no indicado')}</p>
        <div class="table-wrap"><table><tbody>
          <tr><td>Precio de contado</td><td class="num">${cop(s.precio)}</td></tr>
          <tr><td>Cuota inicial</td><td class="num">${cop(s.cuotaInicial)}</td></tr>
          <tr><td><strong>Saldo financiado</strong></td><td class="num"><strong>${cop(s.saldoFinanciado)}</strong></td></tr>
          <tr><td>Cuota mensual sin cargos</td><td class="num">${cop(s.cuotaSinCargos)}</td></tr>
          <tr><td>Cargos mensuales</td><td class="num">${cop(s.cuotaPeriodica - s.cuotaSinCargos)}</td></tr>
          <tr><td><strong>Cuota periódica (mensual)</strong></td><td class="num"><strong>${cop(s.cuotaPeriodica)}</strong></td></tr>
          <tr><td>Total intereses</td><td class="num">${cop(s.totalIntereses)}</td></tr>
          <tr><td>Total cargos</td><td class="num">${cop(s.totalCargos)}</td></tr>
          <tr><td><strong>Total pagado por el cliente</strong></td><td class="num"><strong>${cop(s.totalPagado)}</strong></td></tr>
          <tr><td>Costo de financiar (intereses + cargos)</td><td class="num">${cop(s.costoFinanciacion)}</td></tr>
        </tbody></table></div>
        <div class="notice info">Fíjate: el saldo dividido entre ${s.plazoMeses} meses daría ${cop(dividido)}, pero la cuota calculada es ${cop(s.cuotaPeriodica)}. La diferencia son intereses y cargos. Por eso <strong>nunca</strong> se presenta una división simple como cuota.</div>
        <details><summary>Ver tabla de amortización (${r.tabla.length} cuotas)</summary>
          <div class="table-wrap"><table>
            <thead><tr><th>#</th><th class="num">Saldo inicial</th><th class="num">Interés</th><th class="num">Abono a capital</th><th class="num">Cargos</th><th class="num">Cuota</th><th class="num">Saldo final</th></tr></thead>
            <tbody>${r.tabla.map((t) => `<tr><td>${t.n}</td><td class="num">${cop(t.saldoInicial)}</td><td class="num">${cop(t.interes)}</td><td class="num">${cop(t.abonoCapital)}</td><td class="num">${cop(t.cargo)}</td><td class="num">${cop(t.cuota)}</td><td class="num">${cop(t.saldoFinal)}</td></tr>`).join('')}</tbody>
          </table></div>
          <p class="meta">Sistema de cuota fija (francés), redondeo al peso. La última cuota ajusta la diferencia de redondeo.</p>
        </details>
      </div>`;
  });
}

function errores(ctx, el) {
  el.innerHTML = `<div class="card"><h3>Errores de procedimiento que debes evitar</h3><ul>${ECREDIT_ERRORES.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
  <a class="btn" href="#/academia/simulaciones">Practicar con un caso ficticio de financiación</a>`;
}
