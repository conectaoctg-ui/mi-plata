// Prueba de punta a punta en Chromium (Playwright).
// Uso: desde smart-assistant/  ->  node tests/e2e/smoke.mjs [carpetaCapturas]
// Requiere Playwright instalado (global o local). Levanta un servidor estático propio.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(process.env.NODE_PATH || '', 'playwright'))); }

const ROOT = resolve(new URL('../..', import.meta.url).pathname);
const SHOTS = process.argv[2] || null;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': TIPOS[extname(file)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const BASE = `http://localhost:${server.address().port}/`;

let fallos = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✔', msg); else { fallos++; console.log('  ✘', msg); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errores.push(m.text()); });
page.on('dialog', (d) => d.accept('Nueva.Clave1'));
const shot = async (n) => { if (SHOTS) await page.screenshot({ path: join(SHOTS, n + '.png'), fullPage: true }); };
const ir = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(150); };
const texto = () => page.locator('#view').innerText();
const textoCompleto = () => page.locator('#view').textContent(); // incluye secciones plegadas
const confirmarDialogo = async () => { await page.locator('#dialogOk').click(); await page.waitForTimeout(100); };
const login = async (u, c) => {
  await page.fill('input[name=usuario]', u);
  await page.fill('input[name=clave]', c);
  await page.click('#authForm button');
  await page.waitForSelector('#shell:not(.hidden)');
};
const salir = async () => { await page.click('#logoutBtn'); await page.waitForSelector('#authForm'); };

console.log('1. Configuración inicial y administración');
await page.goto(BASE);
await shot('01-setup');
await page.fill('input[name=nombre]', 'Gerente');
await page.fill('input[name=usuario]', 'admin');
await page.fill('input[name=clave]', '123456');
await page.click('#authForm button');
ok((await page.locator('#authErr').innerText()).includes('fácil de adivinar'), 'rechaza clave débil');
await page.fill('input[name=clave]', 'Tienda.2026');
await page.click('#authForm button');
await page.waitForSelector('#shell:not(.hidden)');
ok((await texto()).includes('Pendientes de la administración'), 'admin ve alertas de configuración pendiente');
await shot('02-inicio-admin');

await ir('#/admin/usuarios');
for (const [n, u, c, r] of [['Vera', 'vera', 'Ventas.2026', 'vendedor'], ['Tomás', 'tomas', 'Taller.2026', 'tecnico']]) {
  await page.fill('#fU input[name=nombre]', n); await page.fill('#fU input[name=usuario]', u);
  await page.fill('#fU input[name=clave]', c); await page.selectOption('#fU select[name=rol]', r);
  await page.click('#fU button'); await page.waitForTimeout(800);
}
ok((await texto()).includes('vera') && (await texto()).includes('tomas'), 'crea vendedor y técnico');

await ir('#/admin/catalogo');
await page.click('#demo'); await confirmarDialogo();
ok((await texto()).includes('iPhone DEMO A'), 'carga catálogo demo marcado');
await page.fill('#fE input[name=modelo]', 'Samsung');
await page.click('#fE button.primary');
ok((await texto()).includes('debe empezar por "iPhone"'), 'rechaza modelo que no es iPhone');
await page.fill('#fE input[name=modelo]', 'iPhone 13'); await page.fill('#fE input[name=capacidadGB]', '128');
await page.selectOption('#fE select[name=condicion]', 'usado'); await page.fill('#fE input[name=precio]', '1.750.000');
await page.fill('#fE input[name=costo]', '1.400.000'); await page.fill('#fE input[name=stock]', '1'); await page.fill('#fE input[name=saludBateria]', '86');
await page.fill('#fE input[name=fuente]', 'Lista interna de prueba');
await page.check('#fE input[value=fotos]');
await page.click('#fE button.primary'); await page.waitForTimeout(200);
ok((await texto()).includes('$ 1.750.000 COP'), 'registra equipo y muestra precio en COP');

await ir('#/admin/config');
await page.fill('input[name=tasaUsura]', '25');
await page.click('#fC button');
ok((await texto()).includes('fuente y la fecha'), 'exige fuente y fecha para tasa de usura');
await page.fill('input[name=tasaUsuraFuente]', 'Dato de prueba E2E'); await page.fill('input[name=tasaUsuraFecha]', '2026-10-01');
await page.fill('input[name=margen]', '10');
await page.click('#fC button'); await page.waitForTimeout(150);
ok(!(await page.locator('#errC').innerText()).trim(), 'guarda configuración');
await shot('03-admin-config');
await salir();

console.log('2. Asesor comercial');
await login('vera', 'Ventas.2026');
const menu = await page.locator('#nav').innerText();
ok(!menu.includes('Administración') && menu.includes('Clientes'), 'menú del asesor no muestra Administración');
await ir('#/admin/usuarios');
ok((await texto()).includes('Sin acceso'), 'acceso directo a #/admin bloqueado');
await ir('#/ventas/margen');
ok(!(await texto()).includes('Margen sobre venta'), 'asesor no ve cálculo de márgenes');
await ir('#/ventas/catalogo');
ok(!(await texto()).includes('1.400.000'), 'asesor no ve el costo');
ok((await texto()).includes('DEMO'), 'avisa de datos demo');
ok((await textoCompleto()).includes('6 meses por defectos de fábrica'), 'argumento de venta usa la garantía de la política (usado = 6 meses)');
await ir('#/ventas/recomendar');
await page.fill('input[name=presupuesto]', '2.000.000'); await page.check('input[value=fotos]');
await page.click('#fRec button');
ok((await texto()).includes('Opciones sugeridas'), 'recomienda equipos');
await shot('04-recomendar');

await ir('#/financiacion/simulador');
await page.fill('input[name=precio]', '1.200.000'); await page.fill('input[name=inicial]', '200.000');
await page.fill('input[name=tasa]', '2'); await page.selectOption('select[name=tipo]', 'MV'); await page.fill('input[name=plazo]', '12');
await page.click('#fSim button');
const sim = await texto();
ok(sim.includes('$ 94.560 COP'), 'cuota calculada $ 94.560 COP');
ok(sim.includes('$ 83.333 COP'), 'muestra contraste con división simple');
ok(sim.includes('SIMULACIÓN EDUCATIVA'), 'etiqueta de simulación educativa visible');
await shot('05-simulador');
await page.fill('input[name=precio]', 'abc'); await page.click('#fSim button');
ok((await texto()).includes('Revisa los datos'), 'error comprensible con precio inválido');

await ir('#/clientes/nuevo');
await page.fill('input[name=nombre]', 'Cliente Ficticio'); await page.fill('input[name=telefono]', '3001234567');
await page.click('#fLead button.primary');
ok((await texto()).includes('1581'), 'exige autorización para guardar teléfono');
await page.check('input[name=autorizaContacto]'); await page.fill('input[name=proximaFecha]', '2026-01-01');
await page.click('#fLead button.primary'); await page.waitForTimeout(200);
ok((await texto()).includes('Seguimientos pendientes'), 'crea cliente con seguimiento');
await page.click('[data-nc]'); await confirmarDialogo(); await page.waitForTimeout(200);
ok((await texto()).includes('No contactar'), 'marca no contactar con confirmación');

await ir('#/academia/leccion/fin-1');
const n = await page.locator('#fQuiz fieldset').count();
for (let i = 0; i < n; i++) await page.locator(`#fQuiz input[name=q${i}][value="1"]`).check();
await page.click('#fQuiz button');
ok((await texto()).includes('Aprobada'), 'aprueba quiz de financiación');
await ir('#/academia/simulacion/esc-credito');
await page.locator('.option').nth(1).click(); await page.locator('.option').nth(1).click(); await page.locator('.option').nth(1).click();
ok((await texto()).includes('Requiere corrección'), 'simulación penaliza respuestas no éticas');
await shot('06-simulacion');
await ir('#/buscar');
await page.fill('#q', 'bateria');
ok((await texto()).includes('Salud de la batería'), 'buscador encuentra sin tildes');
await page.fill('#q', 'xyzw');
ok((await texto()).includes('No improvises'), 'buscador indica cuando no hay información');
await salir();

console.log('3. Técnico');
await login('tomas', 'Taller.2026');
ok(!(await page.locator('#nav').innerText()).includes('Clientes'), 'técnico no ve Clientes');
await ir('#/tecnico/nuevo/no-carga');
await page.fill('input[name=modelo]', 'iPhone 12'); await page.fill('textarea[name=antecedentes]', 'contraseña: 4455');
await page.click('#fCaso button');
ok((await texto()).includes('No se deben registrar contraseñas'), 'rechaza contraseñas en el caso');
await page.fill('textarea[name=antecedentes]', 'Sin golpes');
await page.click('#fCaso button'); await page.waitForTimeout(200);
ok((await texto()).includes('Caso #1'), 'crea caso técnico');
await page.click('[data-estado=diagnostico]'); await page.waitForTimeout(100);
await page.selectOption('#fH select[name=tipo]', 'confirmada'); await page.fill('#fH input[name=texto]', 'Pines doblados');
await page.fill('#fH input[name=evidencia]', 'Revisión con lupa'); await page.click('#fH button'); await page.waitForTimeout(100);
await page.click('[data-estado=cotizado]'); await page.waitForTimeout(100);
await page.click('[data-estado=reparacion]'); await page.waitForTimeout(100);
ok((await texto()).includes('aprobó la cotización'), 'bloquea reparación sin aprobación del cliente');
await page.check('#aprobo'); await page.waitForTimeout(100);
await page.click('[data-estado=reparacion]'); await page.waitForTimeout(100);
await page.click('[data-estado=calidad]'); await page.waitForTimeout(100);
await page.click('[data-estado=listo]'); await page.waitForTimeout(100);
ok((await texto()).includes('controles de calidad'), 'bloquea "listo" sin control de calidad');
const radios = page.locator('input[type=radio][value=ok]');
for (let i = 0; i < await radios.count(); i++) await radios.nth(i).check();
await page.waitForTimeout(100);
await page.click('[data-estado=listo]'); await page.waitForTimeout(150);
await page.click('[data-estado=entregado]'); await confirmarDialogo(); await page.waitForTimeout(150);
ok((await texto()).includes('Entregado'), 'flujo técnico completo hasta entrega');
await shot('07-caso');

console.log('3b. Garantía');
const hace2Meses = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
await ir('#/tecnico/garantias');
ok((await textoCompleto()).includes('6 meses de garantía'), 'muestra la política vigente');
await page.fill('#fG input[name=modelo]', 'iPhone 13'); await page.selectOption('#fG select[name=condicion]', 'usado');
await page.fill('#fG input[name=fechaCompra]', hace2Meses); await page.fill('#fG textarea[name=sintomas]', 'No carga con ningún cable');
await page.click('#evaluar');
ok((await texto()).includes('Dentro del término'), 'evalúa garantía vigente');
await page.click('#fG button.primary'); await page.waitForTimeout(200);
ok((await texto()).includes('responder antes del'), 'crea caso de garantía con plazo de respuesta');
await page.selectOption('#fH select[name=tipo]', 'confirmada'); await page.fill('#fH input[name=texto]', 'Placa de carga defectuosa');
await page.fill('#fH input[name=evidencia]', 'Medición con amperímetro'); await page.click('#fH button'); await page.waitForTimeout(150);
await page.selectOption('#fR select[name=reparable]', 'no'); await page.selectOption('#fR select[name=tipo]', 'cambio');
await page.fill('#fR input[name=valorPagado]', '1.800.000'); await page.fill('#fR input[name=valorEquipoNuevo]', '1.500.000');
await page.click('#fR button');
ok((await page.locator('#errR').innerText()).includes('Según la política'), 'rechaza cambio por equipo de menor valor (antes de confirmar)');
await page.fill('#fR input[name=valorEquipoNuevo]', '2.000.000');
await page.click('#fR button'); await confirmarDialogo(); await page.waitForTimeout(200);
ok((await texto()).includes('excedente a pagar: $ 200.000 COP'), 'calcula excedente del cambio');
ok((await texto()).includes('respondida a tiempo'), 'marca garantía respondida a tiempo');
await shot('09-garantia');

const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
if (ancho > 390) console.log('    desbordan:', await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > 391 && !e.closest('.table-wrap') && !e.closest('#nav')).slice(0, 5).map((e) => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)).join(', ')));
ok(ancho <= 390, `sin desplazamiento horizontal en celular (${ancho}px)`);
await salir();

console.log('4. Bloqueo por intentos');
for (let i = 0; i < 5; i++) { await page.fill('input[name=usuario]', 'vera'); await page.fill('input[name=clave]', 'mala' + i); await page.click('#authForm button'); await page.waitForTimeout(250); }
await page.fill('input[name=clave]', 'Ventas.2026'); await page.click('#authForm button'); await page.waitForTimeout(250);
ok((await page.locator('#authErr').innerText()).includes('Demasiados intentos'), 'bloquea tras 5 intentos fallidos');

console.log('5. Escritorio');
await page.setViewportSize({ width: 1280, height: 900 });
await login('admin', 'Tienda.2026');
await ir('#/admin/metricas');
ok((await texto()).includes('Embudo por etapa'), 'panel de indicadores');
await shot('08-metricas-escritorio');
await ir('#/admin/auditoria');
const aud = await texto();
ok(aud.includes('inicio_sesion_fallido') && !aud.includes('3001234567') && !aud.includes('Ventas.2026'), 'auditoría sin datos sensibles');

ok(errores.length === 0, 'sin errores de consola ni de CSP' + (errores.length ? ': ' + errores.join(' | ') : ''));
await browser.close();
server.close();
console.log(fallos ? `\n${fallos} verificación(es) fallaron` : '\nTodas las verificaciones pasaron');
process.exit(fallos ? 1 : 0);
