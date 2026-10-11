// Simulador de conversaciones con clientes FICTICIOS.
// Cada escenario es un grafo de nodos; cada opción tiene puntos y retroalimentación.
// Puntos: 2 = excelente, 1 = aceptable, 0 = débil, -1 = práctica no ética o engañosa.

export function iniciar(escenario) {
  if (!escenario?.nodos?.[escenario.inicio]) throw new Error('Escenario mal definido');
  return { escenarioId: escenario.id, nodo: escenario.inicio, pasos: [], terminado: false };
}

export function nodoActual(escenario, estado) {
  return escenario.nodos[estado.nodo];
}

export function elegir(escenario, estado, indiceOpcion) {
  if (estado.terminado) throw new Error('La simulación ya terminó');
  const nodo = nodoActual(escenario, estado);
  const op = nodo.opciones[indiceOpcion];
  if (!op) throw new Error('Opción no válida');
  const maxNodo = Math.max(...nodo.opciones.map((o) => o.puntos));
  const pasos = [...estado.pasos, { nodo: estado.nodo, cliente: nodo.cliente, respuesta: op.texto, puntos: op.puntos, max: maxNodo, feedback: op.feedback }];
  const siguiente = op.siguiente && escenario.nodos[op.siguiente] ? op.siguiente : null;
  return { ...estado, pasos, nodo: siguiente, terminado: !siguiente };
}

export function evaluar(estado) {
  const obtenidos = estado.pasos.reduce((s, p) => s + Math.max(0, p.puntos), 0);
  const maximo = estado.pasos.reduce((s, p) => s + p.max, 0);
  const faltasEticas = estado.pasos.filter((p) => p.puntos < 0);
  const nota = maximo ? obtenidos / maximo : 0;
  let nivel;
  if (faltasEticas.length) nivel = 'Requiere corrección: hubo respuestas engañosas o de presión indebida';
  else if (nota >= 0.85) nivel = 'Excelente';
  else if (nota >= 0.6) nivel = 'Bien, con puntos por mejorar';
  else nivel = 'Necesita practicar más';
  return {
    nota: faltasEticas.length ? Math.min(nota, 0.5) : nota,
    obtenidos,
    maximo,
    nivel,
    faltasEticas: faltasEticas.length,
    mejoras: estado.pasos.filter((p) => p.puntos < p.max).map((p) => ({ cliente: p.cliente, respuesta: p.respuesta, feedback: p.feedback }))
  };
}
