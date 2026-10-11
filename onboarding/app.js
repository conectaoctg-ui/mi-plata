// =====================================================================
// ONBOARDING conectaoctg - lógica de la app
// El contenido vive en content.js (window.ONBOARDING).
// El progreso se guarda solo en este navegador (localStorage).
// =====================================================================
(function () {
  const C = window.ONBOARDING;
  const STORE_KEY = 'conectaoctg-onboarding-v1';
  const APROBADO = 80; // % mínimo para aprobar un quiz

  // ---------- Estado ----------
  const vacio = () => ({ perfil: null, tareas: {}, quiz: {}, leidos: {} });
  let state = vacio();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) state = Object.assign(vacio(), JSON.parse(raw));
  } catch (e) { /* almacenamiento no disponible: la app funciona sin guardar */ }

  const guardar = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { }
  };

  // ---------- Utilidades ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Resalta los textos pendientes de completar por la administración
  const fmt = (t) => esc(t).replace(/⚠️ EDITAR:?([^.]*\.?)/g, '<span class="note">⚠️ Pendiente:$1</span>');
  const view = $('#view');

  const totalTareas = () => C.ruta.reduce((n, e) => n + e.tareas.length, 0);
  const tareasHechas = () => C.ruta.reduce((n, e) => n + e.tareas.filter((t) => state.tareas[t.id]).length, 0);
  const modsAprobados = () => C.modulos.filter((m) => (state.quiz[m.id] || 0) >= APROBADO).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  const recomendado = (m) => {
    const rol = state.perfil && state.perfil.rol;
    return m.area === 'General' || rol === 'Todos' || m.area === rol;
  };

  // ---------- Navegación ----------
  let tabActual = 'inicio';
  const tabs = { inicio: renderInicio, ruta: renderRuta, cursos: renderCursos, taller: renderTaller, ayuda: renderAyuda };

  function ir(tab, ...args) {
    tabActual = tab;
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    tabs[tab](...args);
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.tabbar button').forEach((b) => b.addEventListener('click', () => ir(b.dataset.tab)));

  // ---------- Perfil ----------
  function mostrarBienvenida() {
    $('#wEmpresa').textContent = C.empresa.nombre;
    $('#wLema').textContent = C.empresa.lema;
    if (state.perfil) {
      $('#pfNombre').value = state.perfil.nombre;
      $('#pfRol').value = state.perfil.rol;
    }
    $('#welcome').classList.remove('hidden');
  }

  $('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.perfil = { nombre: $('#pfNombre').value.trim(), rol: $('#pfRol').value, desde: (state.perfil && state.perfil.desde) || new Date().toISOString().slice(0, 10) };
    guardar();
    $('#welcome').classList.add('hidden');
    pintarHeader();
    ir('inicio');
  });

  $('#btnPerfil').addEventListener('click', mostrarBienvenida);

  function pintarHeader() {
    $('#hEmpresa').textContent = C.empresa.nombre;
    $('#btnPerfil').textContent = state.perfil ? '👤 ' + state.perfil.nombre : 'Perfil';
  }

  // ---------- INICIO ----------
  function renderInicio() {
    const p = state.perfil || { nombre: '', rol: '' };
    const tPct = pct(tareasHechas(), totalTareas());
    const qPct = pct(modsAprobados(), C.modulos.length);
    const siguiente = C.ruta.flatMap((e) => e.tareas.map((t) => ({ ...t, etapa: e.titulo }))).find((t) => !state.tareas[t.id]);
    const sigModulo = C.modulos.filter(recomendado).find((m) => (state.quiz[m.id] || 0) < APROBADO);

    view.innerHTML = `
      <h2>¡Hola, ${esc(p.nombre)}! 👋</h2>
      <p class="muted">${esc(C.empresa.lema)} · Cargo: ${esc(p.rol === 'Todos' ? 'Ventas y técnico' : p.rol)}</p>

      <div class="grid">
        <div class="card clickable" data-go="ruta">
          <div class="muted">Ruta de ingreso</div>
          <div class="big-num">${tPct}%</div>
          <div class="progress"><div style="width:${tPct}%"></div></div>
          <small class="muted">${tareasHechas()} de ${totalTareas()} tareas</small>
        </div>
        <div class="card clickable" data-go="cursos">
          <div class="muted">Cursos aprobados</div>
          <div class="big-num">${modsAprobados()}/${C.modulos.length}</div>
          <div class="progress"><div style="width:${qPct}%"></div></div>
          <small class="muted">Se aprueba con ${APROBADO}% o más</small>
        </div>
      </div>

      <h3 style="margin-top:1.5rem">Lo siguiente para ti</h3>
      ${siguiente ? `<div class="card clickable" data-go="ruta"><span class="tag">${esc(siguiente.etapa)}</span><p style="margin:.5rem 0 0">${esc(siguiente.texto)}</p></div>` : '<div class="card"><span class="tag ok">Ruta completa 🎉</span></div>'}
      ${sigModulo ? `<div class="card clickable" data-mod="${sigModulo.id}"><div class="row"><span class="icon-lg">${sigModulo.icono}</span><div><strong>${esc(sigModulo.titulo)}</strong><div class="muted">${esc(sigModulo.resumen)}</div></div></div></div>` : ''}

      <h3 style="margin-top:1.5rem">¿A quién acudo?</h3>
      <div class="card">
        ${C.empresa.contactos.map((c) => `<div class="row between" style="padding:.35rem 0"><strong>${esc(c.rol)}</strong><span>${fmt(c.detalle)}</span></div>`).join('')}
        <p class="muted" style="margin:.5rem 0 0">🕘 ${fmt(C.empresa.horario)}</p>
      </div>
    `;
    view.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => ir(el.dataset.go)));
    view.querySelectorAll('[data-mod]').forEach((el) => el.addEventListener('click', () => ir('cursos', el.dataset.mod)));
  }

  // ---------- RUTA ----------
  function renderRuta() {
    view.innerHTML = `
      <h2>Ruta de ingreso</h2>
      <p class="muted">Marca cada tarea cuando la completes. Tu progreso se guarda en este dispositivo.</p>
      ${C.ruta.map((e) => {
        const hechas = e.tareas.filter((t) => state.tareas[t.id]).length;
        return `<div class="card">
          <div class="row between"><h3 style="margin:0">${esc(e.titulo)}</h3><span class="tag ${hechas === e.tareas.length ? 'ok' : ''}">${hechas}/${e.tareas.length}</span></div>
          ${e.tareas.map((t) => `<label class="check ${state.tareas[t.id] ? 'done' : ''}"><input type="checkbox" data-t="${t.id}" ${state.tareas[t.id] ? 'checked' : ''}><span>${esc(t.texto)}</span></label>`).join('')}
        </div>`;
      }).join('')}
    `;
    view.querySelectorAll('input[data-t]').forEach((cb) => cb.addEventListener('change', () => {
      if (cb.checked) state.tareas[cb.dataset.t] = new Date().toISOString().slice(0, 10);
      else delete state.tareas[cb.dataset.t];
      guardar();
      renderRuta();
    }));
  }

  // ---------- CURSOS ----------
  function renderCursos(modId) {
    if (modId) return renderModulo(modId);
    const lista = [...C.modulos].sort((a, b) => recomendado(b) - recomendado(a));
    view.innerHTML = `
      <h2>Cursos</h2>
      <p class="muted">Lee cada módulo y luego presenta el quiz. Primero aparecen los recomendados para tu cargo.</p>
      ${lista.map((m) => {
        const nota = state.quiz[m.id];
        const estado = nota == null ? '' : nota >= APROBADO ? `<span class="tag ok">Aprobado ${nota}%</span>` : `<span class="tag warn">${nota}% · repetir</span>`;
        return `<div class="card clickable" data-mod="${m.id}">
          <div class="row"><span class="icon-lg">${m.icono}</span>
            <div style="flex:1"><strong>${esc(m.titulo)}</strong> ${recomendado(m) ? '' : '<small class="muted">(opcional)</small>'}
              <div class="muted">${esc(m.resumen)}</div>
              <div style="margin-top:.35rem"><span class="tag">${esc(m.area)}</span> ${estado}</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    `;
    view.querySelectorAll('[data-mod]').forEach((el) => el.addEventListener('click', () => renderModulo(el.dataset.mod)));
  }

  function renderModulo(id) {
    const m = C.modulos.find((x) => x.id === id);
    if (!m) return renderCursos();
    state.leidos[id] = true;
    guardar();
    view.innerHTML = `
      <button class="back">‹ Cursos</button>
      <h2>${m.icono} ${esc(m.titulo)}</h2>
      <p class="muted">${esc(m.resumen)}</p>
      ${m.lecciones.map((l, i) => `
        <details class="card lesson" ${i === 0 ? 'open' : ''}>
          <summary>${i + 1}. ${esc(l.titulo)}</summary>
          <ul>${l.contenido.map((c) => `<li>${fmt(c)}</li>`).join('')}</ul>
        </details>`).join('')}
      <button class="btn primary block" id="btnQuiz">Presentar quiz (${m.quiz.length} preguntas)</button>
    `;
    $('.back').addEventListener('click', () => renderCursos());
    $('#btnQuiz').addEventListener('click', () => renderQuiz(m));
    window.scrollTo(0, 0);
  }

  function renderQuiz(m) {
    let i = 0;
    let aciertos = 0;
    const paso = () => {
      if (i >= m.quiz.length) return fin();
      const q = m.quiz[i];
      view.innerHTML = `
        <button class="back">‹ ${esc(m.titulo)}</button>
        <div class="muted">Pregunta ${i + 1} de ${m.quiz.length}</div>
        <div class="progress"><div style="width:${pct(i, m.quiz.length)}%"></div></div>
        <div class="card"><h3>${esc(q.p)}</h3>
          ${q.o.map((o, k) => `<button class="option" data-k="${k}">${esc(o)}</button>`).join('')}
          <div id="next"></div>
        </div>`;
      $('.back').addEventListener('click', () => renderModulo(m.id));
      view.querySelectorAll('.option').forEach((b) => b.addEventListener('click', () => {
        const k = Number(b.dataset.k);
        if (k === q.r) aciertos++;
        view.querySelectorAll('.option').forEach((x) => {
          x.disabled = true;
          if (Number(x.dataset.k) === q.r) x.classList.add('correct');
        });
        if (k !== q.r) b.classList.add('wrong');
        $('#next').innerHTML = `<button class="btn primary block" style="margin-top:.5rem">${i + 1 < m.quiz.length ? 'Siguiente' : 'Ver resultado'}</button>`;
        $('#next button').addEventListener('click', () => { i++; paso(); });
      }));
    };
    const fin = () => {
      const nota = pct(aciertos, m.quiz.length);
      state.quiz[m.id] = Math.max(state.quiz[m.id] || 0, nota);
      guardar();
      const ok = nota >= APROBADO;
      view.innerHTML = `
        <div class="card" style="text-align:center">
          <div style="font-size:3rem">${ok ? '🎉' : '📖'}</div>
          <div class="big-num">${nota}%</div>
          <p>${aciertos} de ${m.quiz.length} correctas</p>
          <p class="muted">${ok ? '¡Módulo aprobado!' : `Necesitas ${APROBADO}% para aprobar. Repasa el módulo e inténtalo de nuevo.`}</p>
          <button class="btn" id="bRepasar">Repasar</button><button class="btn primary" id="bCursos">Ir a cursos</button>
        </div>`;
      $('#bRepasar').addEventListener('click', () => renderModulo(m.id));
      $('#bCursos').addEventListener('click', () => renderCursos());
    };
    paso();
  }

  // ---------- TALLER ----------
  function renderTaller(sub) {
    if (sub === 'orden') return renderOrden();
    if (sub) return renderSintoma(sub);
    view.innerHTML = `
      <h2>Taller</h2>
      <div class="card clickable" id="goOrden">
        <div class="row"><span class="icon-lg">📋</span><div><strong>Orden de recepción</strong><div class="muted">Formulario para recibir un iPhone e imprimirlo para firma.</div></div></div>
      </div>
      <h3 style="margin-top:1.5rem">Asistente de diagnóstico</h3>
      <p class="muted">Guía orientativa para el mostrador. No reemplaza el diagnóstico del técnico.</p>
      <div class="grid">
        ${C.diagnostico.map((d) => `<div class="card clickable" data-s="${d.id}"><strong>${esc(d.sintoma)}</strong></div>`).join('')}
      </div>
    `;
    $('#goOrden').addEventListener('click', renderOrden);
    view.querySelectorAll('[data-s]').forEach((el) => el.addEventListener('click', () => renderSintoma(el.dataset.s)));
  }

  function renderSintoma(id) {
    const d = C.diagnostico.find((x) => x.id === id);
    if (!d) return renderTaller();
    view.innerHTML = `
      <button class="back">‹ Taller</button>
      <h2>${esc(d.sintoma)}</h2>
      <div class="card"><h3>1. Pregúntale al cliente</h3><ul>${d.preguntas.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div>
      <div class="card"><h3>2. Revisa paso a paso</h3>
        ${d.pasos.map((p, i) => `<label class="check"><input type="checkbox"><span>${i + 1}. ${esc(p)}</span></label>`).join('')}
      </div>
      <div class="card" style="border-color:var(--warn)"><h3>3. Cuándo pasar al técnico</h3><p style="margin:0">${esc(d.derivar)}</p></div>
    `;
    $('.back').addEventListener('click', () => renderTaller());
    view.querySelectorAll('.check input').forEach((cb) => cb.addEventListener('change', () => cb.parentElement.classList.toggle('done', cb.checked)));
  }

  // Los datos del cliente NO se guardan en el navegador: solo se usan para imprimir.
  function renderOrden() {
    const hoy = new Date().toLocaleDateString('es-CO');
    view.innerHTML = `
      <button class="back no-print">‹ Taller</button>
      <div class="card">
        <div class="row between"><h2 style="margin:0">Orden de recepción · ${esc(C.empresa.nombre)}</h2><span class="muted">${hoy}</span></div>
      </div>
      <div class="card"><h3>Cliente</h3>
        <div class="form-grid">
          <label>Nombre<input></label><label>Cédula<input></label><label>WhatsApp<input inputmode="tel"></label>
        </div>
      </div>
      <div class="card"><h3>Equipo</h3>
        <div class="form-grid">
          <label>Modelo<input placeholder="Ej.: iPhone 13 Pro"></label><label>Color / capacidad<input></label>
          <label>IMEI / serie<input inputmode="numeric"></label>
          <label>¿Abierto o reparado antes?<select><option></option><option>No</option><option>Sí</option><option>No sabe</option></select></label>
          <label>Indicador de humedad (SIM)<select><option></option><option>Normal</option><option>Activado (rojo)</option><option>No se pudo revisar</option></select></label>
          <label>¿Enciende?<select><option></option><option>Sí</option><option>No</option></select></label>
        </div>
        <label>Falla reportada por el cliente<textarea></textarea></label>
        <label>Estado físico (rayones, golpes, vidrio trasero, marco)<textarea></textarea></label>
      </div>
      <div class="card"><h3>Pruebas de ingreso</h3>
        <table class="check-table">
          <tr><th>Función</th><th>OK</th><th>Falla</th><th>No se probó</th></tr>
          ${C.recepcionChecks.map((c, i) => `<tr><td>${esc(c)}</td>${['ok', 'falla', 'np'].map((v) => `<td><input type="radio" name="rc${i}" value="${v}"></td>`).join('')}</tr>`).join('')}
        </table>
      </div>
      <div class="card"><h3>Condiciones</h3>
        <ul class="muted" style="margin:0;padding-left:1.2rem">
          <li>El valor final se confirma después del diagnóstico técnico.</li>
          <li>Equipos con humedad o golpes fuertes pueden presentar fallas adicionales durante o después de la reparación.</li>
          <li>Se recomienda al cliente tener copia de seguridad de su información.</li>
          <li>${fmt('⚠️ EDITAR: tiempo de garantía y plazo máximo para reclamar el equipo.')}</li>
        </ul>
        <div class="form-grid" style="margin-top:1rem">
          <label>Tiempo estimado<input></label><label>Abono<input inputmode="numeric"></label><label>Recibido por<input value="${esc((state.perfil && state.perfil.nombre) || '')}"></label>
        </div>
        <div class="form-grid" style="margin-top:2.5rem">
          <div style="border-top:1px solid var(--text);padding-top:.3rem">Firma del cliente</div>
          <div style="border-top:1px solid var(--text);padding-top:.3rem">Firma de la tienda</div>
        </div>
      </div>
      <div class="no-print"><button class="btn primary block" id="btnPrint">🖨️ Imprimir / guardar PDF</button></div>
    `;
    $('.back').addEventListener('click', () => renderTaller());
    $('#btnPrint').addEventListener('click', () => window.print());
  }

  // ---------- AYUDA ----------
  function renderAyuda() {
    view.innerHTML = `
      <h2>Ayuda rápida</h2>
      <input class="search" id="q" type="search" placeholder="Buscar: batería, IMEI, garantía, Face ID…">
      <div id="res"></div>
    `;
    const pintar = (txt) => {
      const n = txt.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const faqs = C.faq.filter((f) => !n || norm(f.p + ' ' + f.r).includes(n));
      // También busca dentro de las lecciones y del asistente
      const lecs = !n ? [] : C.modulos.flatMap((m) => m.lecciones.filter((l) => norm(l.titulo + ' ' + l.contenido.join(' ')).includes(n)).map((l) => ({ m, l })));
      const diags = !n ? [] : C.diagnostico.filter((d) => norm(d.sintoma + ' ' + d.pasos.join(' ')).includes(n));
      $('#res').innerHTML =
        faqs.map((f) => `<details class="card"><summary>${esc(f.p)}</summary><p style="margin:0">${fmt(f.r)}</p></details>`).join('') +
        lecs.map(({ m, l }) => `<div class="card clickable" data-mod="${m.id}"><span class="tag">Curso · ${esc(m.titulo)}</span><p style="margin:.4rem 0 0">${esc(l.titulo)}</p></div>`).join('') +
        diags.map((d) => `<div class="card clickable" data-s="${d.id}"><span class="tag warn">Diagnóstico</span><p style="margin:.4rem 0 0">${esc(d.sintoma)}</p></div>`).join('') ||
        '<p class="muted">Sin resultados. Pregúntale a tu líder.</p>';
      $('#res').querySelectorAll('[data-mod]').forEach((el) => el.addEventListener('click', () => ir('cursos', el.dataset.mod)));
      $('#res').querySelectorAll('[data-s]').forEach((el) => el.addEventListener('click', () => ir('taller', el.dataset.s)));
    };
    $('#q').addEventListener('input', (e) => pintar(e.target.value));
    pintar('');
  }

  // ---------- Arranque ----------
  pintarHeader();
  if (!state.perfil) mostrarBienvenida();
  ir('inicio');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
  }
})();
