// Buscador local: sin tildes, sin mayúsculas, por palabras, con sinónimos del negocio.

const STOP = new Set(['de', 'la', 'el', 'en', 'y', 'a', 'que', 'los', 'las', 'un', 'una', 'por', 'para', 'con', 'se', 'del', 'al', 'mi', 'es', 'no', 'como', 'lo', 'su', 'o']);

const SINONIMOS = {
  bateria: ['pila', 'carga', 'autonomia'],
  pantalla: ['display', 'vidrio', 'tactil', 'touch'],
  credito: ['financiacion', 'ecredit', 'cuotas', 'financiar'],
  financiacion: ['credito', 'ecredit', 'cuotas'],
  ecredit: ['credito', 'financiacion'],
  garantia: ['devolucion', 'reclamo'],
  mojado: ['liquido', 'agua', 'humedad'],
  mojo: ['mojado', 'liquido', 'humedad'],
  moje: ['mojado', 'liquido', 'humedad'],
  liquido: ['mojado', 'agua', 'humedad'],
  icloud: ['bloqueo', 'activacion', 'appleid'],
  precio: ['valor', 'costo'],
  faceid: ['face', 'rostro']
};

export function normalizar(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokens(t) {
  return normalizar(t).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
}

// Raíz simple: quita las 2 últimas letras de palabras largas (bateria/baterias, cargar/carga).
export function raiz(w) {
  return w.length > 5 ? w.slice(0, w.length - 2) : w;
}

function expandir(toks) {
  const set = new Set(toks);
  for (const t of toks) (SINONIMOS[t] || []).forEach((s) => set.add(s));
  return [...set];
}

/**
 * Busca en una lista de documentos { id, titulo, texto, tipo, ... }.
 * Puntaje: coincidencia en título vale más que en texto; frase exacta suma extra.
 */
export function buscar(docs, consulta, { limite = 20 } = {}) {
  const q = tokens(consulta);
  if (!q.length) return [];
  const terms = expandir(q);
  const frase = normalizar(consulta);
  const res = [];
  for (const d of docs) {
    const tit = normalizar(d.titulo);
    const txt = normalizar(d.texto);
    let score = 0;
    let originales = 0;
    for (const term of terms) {
      const t = raiz(term);
      const enTit = tit.includes(t);
      const enTxt = txt.includes(t);
      if (enTit) score += 3;
      if (enTxt) score += 1;
      if ((enTit || enTxt) && q.includes(term)) originales++;
    }
    if (frase.length > 3 && (tit + ' ' + txt).includes(frase)) score += 4;
    // Todas las palabras de la consulta deben aparecer (o un sinónimo de ellas)
    const cubiertas = q.every((w) => [w, ...(SINONIMOS[w] || [])].map(raiz).some((t) => tit.includes(t) || txt.includes(t)));
    if (score > 0 && cubiertas) res.push({ ...d, score: score + originales });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limite);
}
