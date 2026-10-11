// Contenido inicial. TODO lo que está aquí fue redactado como referencia general y
// queda en estado "pendiente" de validación hasta que la administración de ConectaOCTG
// lo revise y lo marque como verificado (con fuente, fecha y responsable).
// No hay precios, tasas, requisitos de E-Credit ni políticas de garantía inventadas:
// esos campos quedan vacíos para que los complete la administración.

const REF = { estado: 'pendiente', fuente: 'Referencia general redactada para el MVP; validar con la administración', actualizado: '2026-10-11', responsable: 'Sin asignar' };

export const CONOCIMIENTO = [
  { id: 'kb-imei', area: 'ventas', titulo: 'Cómo ver modelo, capacidad e IMEI', texto: 'Ajustes > General > Información muestra modelo, capacidad, número de serie e IMEI. Marcando *#06# también aparece el IMEI. Debe coincidir con el de la caja y la factura.', ...REF },
  { id: 'kb-bateria', area: 'tecnico', titulo: 'Salud de la batería', texto: 'Ajustes > Batería > Estado de la batería (el nombre exacto varía según la versión de iOS). Apple considera desgastada una batería por debajo de aproximadamente 80 % de capacidad máxima; iOS puede mostrar el aviso "Servicio".', ...REF },
  { id: 'kb-piezas', area: 'tecnico', titulo: 'Historial de piezas y servicio', texto: 'En modelos recientes, Ajustes > General > Información puede mostrar "Historial de piezas y servicio" con "Pieza original de Apple" o "Pieza desconocida". Disponibilidad según modelo y versión de iOS. Siempre informar al cliente.', ...REF },
  { id: 'kb-icloud', area: 'ventas', titulo: 'Bloqueo de activación (iCloud)', texto: 'Un equipo con Buscar activo y cuenta ajena queda bloqueado al restaurarlo. Al recibir un usado para venta, el dueño debe cerrar sesión de iCloud delante del asesor y luego borrar el equipo. Nunca comprar equipos con bloqueo ni ofrecer "desbloqueos".', ...REF },
  { id: 'kb-imei-col', area: 'ventas', titulo: 'Verificar IMEI reportado en Colombia', texto: 'Existe consulta pública en imeicolombia.com.co. La administración debe confirmar el procedimiento interno que se usa en la tienda y registrar aquí el paso a paso.', ...REF },
  { id: 'kb-esim', area: 'ventas', titulo: 'eSIM y bandeja SIM', texto: 'Algunos iPhone (por ejemplo, modelos vendidos en EE. UU. desde el iPhone 14) no tienen bandeja para SIM física. Confirmarlo antes de vender a un cliente que usa SIM física.', ...REF },
  { id: 'kb-garantia', area: 'general', titulo: 'Garantía legal en Colombia', texto: 'El Estatuto del Consumidor (Ley 1480 de 2011) establece la garantía legal, que es obligatoria. Los tiempos y condiciones que ofrece ConectaOCTG para equipos nuevos, reacondicionados, usados y reparaciones DEBEN ser registrados por la administración. Mientras no estén registrados, no se deben prometer tiempos al cliente.', ...REF },
  { id: 'kb-datos', area: 'general', titulo: 'Datos personales de clientes', texto: 'La Ley 1581 de 2012 regula el tratamiento de datos personales en Colombia. Pedir solo los datos necesarios, informar para qué se usan, obtener autorización y respetar cuando el cliente pide no ser contactado. Nunca pedir contraseñas, códigos de verificación ni la clave de Apple ID.', ...REF },
  { id: 'kb-humedad', area: 'tecnico', titulo: 'Indicador de humedad', texto: 'En la mayoría de iPhone el indicador de contacto con líquido está en la ranura de la bandeja SIM. Se ve rojo o rosado si tuvo contacto con líquido. Registrar su estado en la recepción.', ...REF },
  { id: 'kb-emparejamiento', area: 'tecnico', titulo: 'Emparejamiento de piezas', texto: 'En iPhone recientes la pantalla, batería, cámaras y el módulo de Face ID están asociados a la placa. Reemplazos sin calibración pueden generar avisos de "Pieza desconocida" o perder funciones (por ejemplo True Tone). El módulo de Face ID no se puede trasladar de un equipo a otro sin perder la función.', ...REF },
  { id: 'kb-ecredit-que', area: 'financiacion', titulo: 'E-Credit: qué puede y qué no puede hacer el asesor', texto: 'El asesor orienta al cliente y acompaña el proceso en la plataforma oficial de E-Credit. No garantiza aprobaciones, no inventa requisitos, no promete tasas y no guarda contraseñas de E-Credit ni del cliente. La decisión de crédito es de la entidad.', ...REF },
  { id: 'kb-habeas', area: 'financiacion', titulo: 'Consulta de información financiera del cliente', texto: 'La Ley 1266 de 2008 regula el manejo de información financiera (habeas data financiero). Cualquier consulta de cupo o historial requiere la autorización del cliente según el procedimiento oficial de la entidad.', ...REF }
];

// Guía de E-Credit: etapas CONCEPTUALES. El flujo real de la plataforma debe ser documentado
// por la administración en cada etapa (campo "procedimientoOficial" vacío = desconocido).
export const ECREDIT_ETAPAS = [
  { id: 'consulta', nombre: 'Consulta de cupo', concepto: 'Verificar si el cliente podría acceder a financiación y por qué monto aproximado, con su autorización.', procedimientoOficial: '' },
  { id: 'simulacion', nombre: 'Simulación', concepto: 'Ver valores de cuota según monto, plazo y condiciones que entrega la plataforma oficial. Una simulación no es una aprobación.', procedimientoOficial: '' },
  { id: 'solicitud', nombre: 'Solicitud', concepto: 'Radicar la solicitud formal con los datos y documentos que pida la entidad.', procedimientoOficial: '' },
  { id: 'evaluacion', nombre: 'Evaluación', concepto: 'La entidad estudia la solicitud. El asesor no interviene en la decisión.', procedimientoOficial: '' },
  { id: 'aprobacion', nombre: 'Aprobación o negación', concepto: 'La entidad comunica el resultado. Si es negada, explicar con respeto y ofrecer alternativas (otro equipo, pago de contado).', procedimientoOficial: '' },
  { id: 'formalizacion', nombre: 'Formalización', concepto: 'Firma de documentos, pago de cuota inicial si aplica y entrega del equipo según el procedimiento oficial.', procedimientoOficial: '' }
];

export const ECREDIT_ERRORES = [
  'Decir "con seguridad se lo aprueban" o prometer una cuota antes de la simulación oficial.',
  'Presentar el saldo dividido entre los meses como si fuera la cuota real.',
  'Pedir o anotar la contraseña del cliente o códigos que le llegan al celular.',
  'Consultar la información del cliente sin su autorización.',
  'Entregar el equipo antes de completar la formalización.',
  'Confundir la simulación educativa de esta app con una oferta de E-Credit.'
];

export const DIAGNOSTICOS = [
  {
    id: 'no-enciende', sintoma: 'No enciende / pantalla negra',
    preguntas: ['¿Se mojó o se cayó?', '¿Vibra o suena al conectarlo?', '¿Desde cuándo pasa?'],
    pasos: ['Conectar a un cargador y cable que funcionen, 15 a 30 minutos.', 'Reinicio forzado (iPhone 8 y posteriores): subir volumen, bajar volumen, mantener el botón lateral hasta ver el logo.', 'Si vibra o suena pero no hay imagen, anotarlo.', 'Revisar el indicador de humedad en la ranura SIM.'],
    causas: ['Batería descargada o dañada', 'Pantalla dañada (si vibra o suena)', 'Puerto de carga', 'Falla de placa'],
    escalar: 'Si tras carga y reinicio forzado no hay ninguna señal, pasar a técnico para medición con fuente.'
  },
  {
    id: 'no-carga', sintoma: 'No carga o carga intermitente',
    preguntas: ['¿Pasa con cualquier cable?', '¿La carga inalámbrica funciona?'],
    pasos: ['Probar con cable y cargador de la tienda que funcionen.', 'Inspeccionar el puerto con linterna.', 'Limpiar con herramienta plástica o de madera, con el equipo apagado.', 'Comparar carga por cable vs. inalámbrica.'],
    causas: ['Suciedad en el puerto', 'Cable o cargador dañado', 'Flex/puerto de carga dañado'],
    escalar: 'Si después de la limpieza sigue igual, pasar a técnico para evaluar el puerto.'
  },
  {
    id: 'bateria', sintoma: 'La batería dura poco o se apaga sola',
    preguntas: ['¿Se apaga con porcentaje alto?', '¿La pantalla o la tapa se ve levantada?'],
    pasos: ['Revisar el estado de la batería en Ajustes.', 'Revisar el consumo por app en Ajustes > Batería.', 'Observar si el equipo está abombado. NO presionarlo.'],
    causas: ['Desgaste de batería', 'Consumo anormal de una app', 'Batería hinchada (riesgo)'],
    escalar: 'Batería hinchada: pasar de inmediato a técnico y aislar el equipo.'
  },
  {
    id: 'pantalla', sintoma: 'Pantalla rota, líneas, manchas o táctil que no responde',
    preguntas: ['¿Se cayó o recibió presión?', '¿Falla una zona o toda la pantalla?'],
    pasos: ['Diferenciar vidrio roto vs. imagen dañada.', 'Arrastrar un ícono por toda la pantalla para probar el táctil.', 'Retirar protector dañado y volver a probar.', 'Revisar historial de piezas.'],
    causas: ['Vidrio y panel dañados', 'Protector defectuoso', 'Pantalla reemplazada antes con pieza no original'],
    escalar: 'Cotización por técnico, informando posibles avisos de pieza y True Tone.'
  },
  {
    id: 'faceid', sintoma: 'Face ID no funciona',
    preguntas: ['¿Se cayó o se mojó?', '¿Le cambiaron la pantalla antes?', '¿Qué mensaje aparece?'],
    pasos: ['Limpiar la zona de cámara y sensores.', 'Intentar configurar de nuevo en Ajustes > Face ID y código.', 'Anotar el mensaje exacto.'],
    causas: ['Suciedad en sensores', 'Flex dañado en reparación anterior', 'Daño del módulo (requiere técnico)'],
    escalar: 'Siempre a técnico. No prometer reparación antes de su evaluación.'
  },
  {
    id: 'liquido', sintoma: 'Se mojó',
    preguntas: ['¿Cuándo?', '¿Con qué líquido?', '¿Lo intentaron cargar?'],
    pasos: ['Indicar que no lo cargue ni lo encienda repetidamente.', 'No usar arroz ni secador.', 'Revisar indicador de humedad.', 'Registrar advertencia: puede haber daños ocultos.'],
    causas: ['Corrosión en placa o conectores', 'Daño en componentes por cortocircuito'],
    escalar: 'Pasar a técnico lo antes posible: la corrosión avanza con el tiempo.'
  },
  {
    id: 'logo', sintoma: 'Se queda en la manzana o se reinicia solo',
    preguntas: ['¿Pasó después de una actualización?', '¿Tiene copia de seguridad?'],
    pasos: ['Reinicio forzado.', 'Modo recuperación con computador: intentar primero "Actualizar" (conserva datos).', '"Restaurar" borra todo: solo con autorización escrita del cliente.', 'Anotar si se reinicia en ciclos regulares.'],
    causas: ['Falla de software', 'Sensor o flex dañado (reinicios en ciclo)', 'Falla de almacenamiento o placa'],
    escalar: 'Si la actualización falla o hay reinicios en ciclo, pasar a técnico.'
  },
  {
    id: 'audio', sintoma: 'No se escucha o no lo escuchan en llamadas',
    preguntas: ['¿En llamadas, música o ambos?', '¿Hay audífonos Bluetooth conectados?'],
    pasos: ['Desactivar Bluetooth.', 'Revisar modo silencio y volumen.', 'Limpiar rejillas con cepillo suave.', 'Grabar nota de voz y reproducirla.'],
    causas: ['Rejillas sucias', 'Audio desviado a Bluetooth', 'Altavoz o micrófono dañado'],
    escalar: 'Si persiste tras limpieza, pasar a técnico.'
  }
];

const q = (p, o, r, explica) => ({ p, o, r, explica });

export const LECCIONES = [
  {
    id: 'gen-1', area: 'general', nivel: 1, minutos: 5, titulo: 'Bienvenida y reglas de la casa',
    bloques: ['ConectaOCTG se especializa solo en iPhone: venta y servicio técnico.', 'Ningún equipo de cliente pasa al taller sin orden de servicio.', 'Nunca revisar fotos, mensajes ni apps personales del cliente.', 'Nunca pedir contraseñas, códigos de verificación ni la clave del Apple ID.', 'Ante dudas de precio, garantía, financiación o diagnóstico: preguntar antes de prometer.'],
    quiz: [
      q('Un cliente pide reparar un Android. ¿Qué hacemos?', ['Lo recibimos igual', 'Explicamos con amabilidad que somos especialistas solo en iPhone', 'Lo mandamos a otro taller sin decirle'], 1, 'La especialización es parte de nuestra promesa al cliente.'),
      q('¿Qué hacemos si no conocemos la garantía de un equipo?', ['Decir "un año"', 'Preguntar a la administración antes de prometer', 'No mencionarla'], 1, 'Nunca se inventan políticas: se confirman.'),
      q('¿Podemos pedir el código de verificación que le llega al cliente?', ['Sí, para agilizar', 'No, nunca', 'Solo si el cliente quiere'], 1, 'Los códigos y contraseñas son personales. Pedirlos expone al cliente a fraudes.')
    ]
  },
  {
    id: 'ven-1', area: 'ventas', nivel: 1, minutos: 8, roles: ['vendedor'], titulo: 'Conoce y revisa un iPhone',
    bloques: ['Ajustes > General > Información: modelo, capacidad, serie e IMEI. *#06# también muestra el IMEI.', 'Revisar salud de batería e historial de piezas antes de ofrecer un usado o reacondicionado.', 'Verificar que el equipo no tenga cuenta iCloud ajena.', 'Confiar en Ajustes, no en la apariencia, para identificar el modelo.'],
    quiz: [
      q('¿Dónde se ve el IMEI?', ['Ajustes > General > Información', 'App Store', 'Ajustes > Pantalla'], 0, 'También se puede marcar *#06#.'),
      q('Un vendedor externo ofrece un iPhone con iCloud ajeno. ¿Qué hacemos?', ['Lo compramos más barato', 'No lo compramos', 'Lo compramos y lo desbloqueamos'], 1, 'Un equipo con bloqueo de activación no se puede usar y suele indicar procedencia irregular.'),
      q('¿Qué debe saber el cliente de un equipo usado?', ['Solo el precio', 'Salud de batería, piezas cambiadas y garantía', 'Nada más que el color'], 1, 'La transparencia evita reclamos y genera confianza.')
    ]
  },
  {
    id: 'ven-2', area: 'ventas', nivel: 2, minutos: 10, roles: ['vendedor'], titulo: 'Nuevo, reacondicionado y usado',
    bloques: ['Nuevo: sellado, sin uso previo.', 'Reacondicionado: revisado y restaurado; puede tener piezas reemplazadas. Explicar cuáles según el historial.', 'Usado: vendido en el estado en que está; informar estado físico, batería y piezas.', 'La garantía de cada condición la define la administración. Si no está registrada, se confirma antes de ofrecer.'],
    quiz: [
      q('¿Qué se informa de un reacondicionado?', ['Que es nuevo', 'Qué piezas se cambiaron y su garantía registrada', 'Nada'], 1, 'Decir que un reacondicionado es nuevo es engañoso.'),
      q('La garantía de un usado no está registrada en la app. ¿Qué hacemos?', ['Prometer 6 meses', 'Confirmar con la administración antes de ofrecer', 'Decir que no tiene'], 1, 'Información desconocida se confirma; nunca se inventa.')
    ]
  },
  {
    id: 'cli-1', area: 'clientes', nivel: 1, minutos: 10, roles: ['vendedor'], titulo: 'Recibir, escuchar y calificar al cliente',
    bloques: ['Saludo: presentarse por el nombre y preguntar en qué se le puede ayudar.', 'Preguntas de descubrimiento: equipo actual y qué le molesta, uso principal, espacio que necesita, nuevo o usado, presupuesto.', 'Escuchar más de lo que se habla. Repetir lo entendido para confirmar.', 'Recomendar 2 o 3 opciones que encajen, no todo el catálogo.', 'Registrar la etapa y la próxima acción en Clientes, solo con datos autorizados.'],
    quiz: [
      q('¿Qué va antes de mostrar equipos?', ['El precio', 'Preguntar qué necesita', 'Mostrar el más caro'], 1, 'Sin entender la necesidad, la recomendación es al azar.'),
      q('¿Cuántas opciones conviene mostrar?', ['Todas', 'Una', 'Dos o tres que encajen'], 2, 'Pocas opciones relevantes facilitan la decisión.')
    ]
  },
  {
    id: 'cli-2', area: 'clientes', nivel: 2, minutos: 12, roles: ['vendedor'], titulo: 'Objeciones sin engaños',
    bloques: ['"Está caro": mostrar qué incluye (garantía registrada, revisión, batería) y ofrecer una alternativa de menor precio.', '"En otro lado es más barato": preguntar qué incluye esa oferta, sin hablar mal de la competencia.', '"Lo voy a pensar": "Claro, ¿qué te genera duda?"', 'Prohibido: inventar urgencia ("solo hoy") si no es cierta, prometer aprobaciones de crédito o garantías no registradas.', 'Si el cliente pide no ser contactado, se marca "No contactar" y se respeta.'],
    quiz: [
      q('El cliente dice "lo voy a pensar". Mejor respuesta:', ['"Solo hoy tiene descuento" (sin ser cierto)', '"Claro, ¿qué te genera duda?"', '"Bueno, chao"'], 1, 'Inventar urgencia es presión indebida y engañosa.'),
      q('Un cliente pidió que no lo llamen más. ¿Qué hacemos?', ['Llamar una última vez', 'Marcar "No contactar" y respetarlo', 'Escribirle por WhatsApp'], 1, 'Es un derecho del cliente y una obligación legal.')
    ]
  },
  {
    id: 'fin-1', area: 'financiacion', nivel: 1, minutos: 12, roles: ['vendedor'], titulo: 'Financiación: conceptos básicos en COP',
    bloques: ['Precio de contado: lo que cuesta pagando de una vez.', 'Cuota inicial: lo que se paga al comienzo.', 'Saldo financiado: precio menos cuota inicial.', 'Intereses: costo de financiar el saldo, según la tasa y el plazo.', 'Cargos: seguros, estudio u otros, si la entidad los cobra.', 'La cuota real NO es el saldo dividido entre los meses: incluye intereses y cargos.', 'Tasas: EA (efectiva anual) y MV (mensual vencida) son formas distintas de expresar la tasa. Hay que saber cuál se está usando.'],
    quiz: [
      q('Saldo de $ 1.200.000 a 12 meses. ¿La cuota es $ 100.000?', ['Sí', 'No necesariamente: hay intereses y posibles cargos', 'Solo si es E-Credit'], 1, 'Dividir el saldo entre los meses ignora intereses y cargos.'),
      q('¿Qué es el saldo financiado?', ['El precio de contado', 'Precio menos cuota inicial', 'La suma de las cuotas'], 1, 'Es la parte del precio que se financia.'),
      q('Un 2 % MV y un 2 % EA, ¿son lo mismo?', ['Sí', 'No: una es mensual y otra anual', 'Depende del cliente'], 1, 'Un 2 % mensual equivale a cerca de 26,8 % efectivo anual.')
    ]
  },
  {
    id: 'fin-2', area: 'financiacion', nivel: 2, minutos: 12, roles: ['vendedor'], titulo: 'Proceso con E-Credit: qué hacer y qué no',
    bloques: ['Diferenciar: consulta de cupo, simulación, solicitud, evaluación, aprobación y formalización. El detalle real de cada etapa lo registra la administración en la Guía E-Credit.', 'Pedir autorización al cliente antes de consultar su información (Ley 1266 de 2008).', 'Nunca garantizar aprobación ni prometer cuotas antes de la simulación oficial.', 'Explicar cuota, costos, plazo y condiciones usando solo la información oficial que entregue la plataforma.', 'No guardar ni pedir contraseñas: el cliente las digita él mismo.', 'La simulación de esta app es educativa: no reemplaza la de E-Credit.'],
    quiz: [
      q('El cliente pregunta "¿me lo aprueban seguro?"', ['"Sí, seguro"', '"La decisión es de la entidad; podemos hacer la consulta con tu autorización"', '"Si pagas más inicial, sí"'], 1, 'El asesor no decide ni garantiza aprobaciones.'),
      q('¿Qué valor de cuota se le comunica al cliente como oferta?', ['El de la simulación educativa de esta app', 'El que entrega la plataforma oficial', 'El saldo dividido entre meses'], 1, 'Solo la información oficial es una oferta.'),
      q('¿Antes de consultar el cupo se necesita…?', ['Nada', 'La autorización del cliente', 'Su contraseña de correo'], 1, 'La información financiera requiere autorización del titular.')
    ]
  },
  {
    id: 'tec-1', area: 'tecnico', nivel: 1, minutos: 10, titulo: 'Recepción de equipos',
    bloques: ['Todo lo que no quede escrito en la orden, no existe.', 'Registrar: modelo, síntoma con palabras del cliente, antecedentes, estado físico, indicador de humedad y pruebas de ingreso.', 'No registrar contraseñas ni códigos del cliente.', 'Advertir riesgos (equipos mojados o golpeados) por escrito.', 'Recomendar copia de seguridad.'],
    quiz: [
      q('¿Dónde está el indicador de humedad en la mayoría de iPhone?', ['Ranura de la SIM', 'Detrás de la cámara', 'Botón lateral'], 0, 'Se revisa con linterna en la ranura de la bandeja SIM.'),
      q('El cliente ofrece dejar su código de desbloqueo anotado. ¿Qué hacemos?', ['Anotarlo en la orden', 'No registrarlo; se prueba con el cliente presente o según el procedimiento autorizado', 'Pegarlo en el equipo'], 1, 'Registrar códigos expone al cliente y a la tienda.')
    ]
  },
  {
    id: 'tec-2', area: 'tecnico', nivel: 2, minutos: 12, roles: ['tecnico'], titulo: 'Síntoma, causa probable y falla confirmada',
    bloques: ['Síntoma: lo que el cliente reporta ("no carga").', 'Causa probable: hipótesis sin confirmar ("puerto sucio").', 'Falla confirmada: comprobada con una prueba o medición ("pines doblados vistos con lupa").', 'Solo se cotiza una reparación sobre fallas confirmadas o con la incertidumbre explicada al cliente.', 'Casos delicados (placa, Face ID, líquido) se escalan a un técnico autorizado.'],
    quiz: [
      q('"Creo que es la batería" es…', ['Falla confirmada', 'Causa probable', 'Síntoma'], 1, 'Sin prueba que lo confirme, es una hipótesis.'),
      q('¿Qué se necesita para marcar una falla como confirmada?', ['Intuición', 'Describir la prueba o medición que la confirma', 'Que el cliente lo diga'], 1, 'La evidencia evita reparaciones innecesarias.')
    ]
  },
  {
    id: 'tec-3', area: 'tecnico', nivel: 2, minutos: 12, roles: ['tecnico'], titulo: 'Seguridad en el taller y control de calidad',
    bloques: ['Pulsera y tapete antiestáticos.', 'Desconectar la batería antes de cualquier otro conector.', 'Baterías hinchadas o perforadas pueden incendiarse: no doblarlas ni perforarlas; seguir el protocolo de la tienda.', 'Organizar tornillos por posición: tienen longitudes distintas.', 'Antes de entregar, completar los 12 controles de calidad de la app.'],
    quiz: [
      q('¿Qué se desconecta primero?', ['Pantalla', 'Batería', 'Cámara'], 1, 'Evita cortos que dañan la placa.'),
      q('¿Se puede entregar un equipo con controles de calidad pendientes?', ['Sí, si el cliente tiene prisa', 'No', 'Solo si es garantía'], 1, 'La app bloquea el paso a "Listo" hasta completarlos.')
    ]
  }
];

export const ESCENARIOS = [
  {
    id: 'esc-presupuesto', area: 'ventas', titulo: 'Cliente con presupuesto ajustado', cliente: 'Laura (ficticia), estudiante',
    inicio: 'a',
    nodos: {
      a: { cliente: 'Hola, quiero un iPhone pero no tengo mucha plata.', opciones: [
        { texto: '¡Hola, Laura! Con gusto te ayudo. ¿Qué celular usas hoy y para qué lo usas más?', puntos: 2, feedback: 'Excelente: abres con preguntas de descubrimiento.', siguiente: 'b' },
        { texto: 'Tenemos el iPhone más nuevo, te lo muestro.', puntos: 0, feedback: 'Mostrar el más caro sin preguntar ignora lo que dijo del presupuesto.', siguiente: 'b' },
        { texto: 'Si no tienes plata, mejor vuelve después.', puntos: -1, feedback: 'Respuesta irrespetuosa: se pierde el cliente y la reputación.', siguiente: 'b' }
      ] },
      b: { cliente: 'Uso más que todo redes y fotos. Tengo como un millón y medio.', opciones: [
        { texto: 'Te muestro 2 o 3 opciones dentro de ese valor, con el estado de batería y la garantía de cada una.', puntos: 2, feedback: 'Bien: opciones acotadas y transparentes.', siguiente: 'c' },
        { texto: 'Con eso no alcanza para nada bueno.', puntos: 0, feedback: 'Desanima al cliente y no ofrece alternativas.', siguiente: 'c' }
      ] },
      c: { cliente: 'Este usado me gusta, ¿es original la pantalla?', opciones: [
        { texto: 'Mira, revisemos juntos el historial de piezas en Ajustes.', puntos: 2, feedback: 'Excelente: verificas con el cliente en lugar de afirmar.', siguiente: 'd' },
        { texto: 'Sí, todo es original, tranquila.', puntos: -1, feedback: 'Afirmar sin verificar puede ser engañoso.', siguiente: 'd' }
      ] },
      d: { cliente: 'Lo voy a pensar.', opciones: [
        { texto: 'Claro. ¿Hay algo que te genere duda? Si quieres te dejo los datos por escrito.', puntos: 2, feedback: 'Bien: identificas la objeción real sin presionar.' },
        { texto: 'Solo hoy te lo dejo con descuento (aunque no sea cierto).', puntos: -1, feedback: 'Inventar urgencia es presión indebida.' },
        { texto: 'Bueno.', puntos: 0, feedback: 'Pierdes la oportunidad de resolver la duda.' }
      ] }
    }
  },
  {
    id: 'esc-credito', area: 'financiacion', titulo: '¿Me aprueban seguro?', cliente: 'Andrés (ficticio), trabajador independiente',
    inicio: 'a',
    nodos: {
      a: { cliente: 'Quiero sacarlo a cuotas. ¿Me lo aprueban seguro?', opciones: [
        { texto: 'La decisión es de la entidad. Con tu autorización podemos hacer la consulta en la plataforma oficial.', puntos: 2, feedback: 'Correcto: claro y sin promesas.', siguiente: 'b' },
        { texto: 'Sí, a todo el mundo se lo aprueban.', puntos: -1, feedback: 'Garantizar aprobaciones es engañoso.', siguiente: 'b' }
      ] },
      b: { cliente: '¿Y cuánto me quedaría la cuota? Son 1.800.000 a 12 meses.', opciones: [
        { texto: 'La cuota exacta la da la simulación oficial; depende de la tasa, cargos y plazo. ¿La hacemos?', puntos: 2, feedback: 'Correcto: no improvisas una cifra.', siguiente: 'c' },
        { texto: 'Te quedan 150.000 al mes.', puntos: -1, feedback: 'Dividir el saldo entre meses no es la cuota real.', siguiente: 'c' }
      ] },
      c: { cliente: 'Me pide un código que me llegó al celular, ¿te lo dicto?', opciones: [
        { texto: 'No, ese código es personal. Escríbelo tú directamente donde lo pide la plataforma.', puntos: 2, feedback: 'Excelente protección de datos del cliente.' },
        { texto: 'Sí, dímelo y yo lo pongo.', puntos: -1, feedback: 'Nunca se manejan códigos ni contraseñas del cliente.' }
      ] }
    }
  },
  {
    id: 'esc-mojado', area: 'tecnico', titulo: 'Equipo mojado en el mostrador', cliente: 'Camila (ficticia)',
    inicio: 'a',
    nodos: {
      a: { cliente: 'Se me cayó al agua ayer y lo dejé en arroz. ¿Me lo arreglan hoy?', opciones: [
        { texto: 'Lo recibimos para diagnóstico. No puedo prometer el resultado hasta que el técnico lo abra; te explico los riesgos.', puntos: 2, feedback: 'Correcto: no prometes diagnóstico ni tiempos sin evaluación.', siguiente: 'b' },
        { texto: 'Sí, en una hora queda como nuevo.', puntos: -1, feedback: 'Prometer sin diagnóstico genera reclamos.', siguiente: 'b' }
      ] },
      b: { cliente: 'Te dejo la clave para que lo prueben: 1234…', opciones: [
        { texto: 'Gracias, pero no registramos claves. Si hace falta probar algo, lo haremos contigo presente o según el procedimiento autorizado.', puntos: 2, feedback: 'Excelente: proteges los datos del cliente.', siguiente: 'c' },
        { texto: 'Listo, la anoto en la orden.', puntos: -1, feedback: 'Las claves no se registran.', siguiente: 'c' }
      ] },
      c: { cliente: '¿Qué tengo que firmar?', opciones: [
        { texto: 'La orden con el estado del equipo, el indicador de humedad y la advertencia de posibles daños ocultos.', puntos: 2, feedback: 'Recepción completa.' },
        { texto: 'Nada, tranquila.', puntos: 0, feedback: 'Sin orden firmada no hay respaldo para nadie.' }
      ] }
    }
  }
];

// Datos FICTICIOS para probar el catálogo. Se cargan solo si el administrador lo pide
// y se muestran con la etiqueta "DEMO". Precios inventados a propósito: NO usar con clientes.
export const CATALOGO_DEMO = [
  { modelo: 'iPhone DEMO A', capacidadGB: 128, condicion: 'usado', color: 'Negro', precio: 1500000, costo: 1250000, stock: 2, saludBateria: 88, usos: ['redes', 'basico'], notas: 'Equipo ficticio de demostración' },
  { modelo: 'iPhone DEMO B', capacidadGB: 256, condicion: 'reacondicionado', color: 'Azul', precio: 2400000, costo: 2000000, stock: 1, saludBateria: 100, usos: ['fotos', 'redes', 'trabajo'], notas: 'Equipo ficticio de demostración' },
  { modelo: 'iPhone DEMO C', capacidadGB: 256, condicion: 'nuevo', color: 'Blanco', precio: 4200000, costo: 3700000, stock: 3, usos: ['fotos', 'juegos', 'trabajo'], notas: 'Equipo ficticio de demostración' },
  { modelo: 'iPhone DEMO D', capacidadGB: 64, condicion: 'usado', color: 'Rojo', precio: 900000, costo: 700000, stock: 0, saludBateria: 81, usos: ['basico'], notas: 'Equipo ficticio sin stock' }
].map((e, i) => ({ ...e, id: 'demo-' + (i + 1), demo: true, fuente: 'DEMO ficticio', actualizado: '2026-10-11', responsable: 'Sistema (demo)' }));
