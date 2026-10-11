// =====================================================================
// CONTENIDO DE ONBOARDING - conectaoctg (venta y servicio técnico iPhone)
// ---------------------------------------------------------------------
// Este archivo concentra TODO el contenido de la app. Para adaptarlo a la
// realidad de la tienda basta con editar los textos de aquí abajo.
// Los textos marcados con "⚠️ EDITAR" son políticas internas que deben
// ser confirmadas por la administración antes de usar la app con personal.
// =====================================================================

window.ONBOARDING = {
  empresa: {
    nombre: 'conectaoctg',
    lema: 'Venta y servicio técnico exclusivo para iPhone',
    contactos: [
      { rol: 'Administración', detalle: '⚠️ EDITAR: nombre y WhatsApp' },
      { rol: 'Jefe de taller', detalle: '⚠️ EDITAR: nombre y WhatsApp' },
      { rol: 'Líder de ventas', detalle: '⚠️ EDITAR: nombre y WhatsApp' }
    ],
    horario: '⚠️ EDITAR: horario de apertura y cierre de la tienda'
  },

  // ------------------------------------------------------------------
  // RUTA DE INGRESO (checklist por etapas)
  // ------------------------------------------------------------------
  ruta: [
    {
      id: 'dia1',
      titulo: 'Día 1 · Bienvenida',
      tareas: [
        { id: 'd1-1', texto: 'Recorrido por la tienda: mostrador, vitrinas, bodega y taller' },
        { id: 'd1-2', texto: 'Conocer al equipo y a quién acudir para cada tema' },
        { id: 'd1-3', texto: 'Leer las reglas de la casa (módulo "Cultura y políticas")' },
        { id: 'd1-4', texto: 'Recibir accesos: caja/POS, WhatsApp de la tienda, inventario' },
        { id: 'd1-5', texto: 'Aprender el protocolo de apertura y cierre' }
      ]
    },
    {
      id: 'semana1',
      titulo: 'Semana 1 · Producto y procesos',
      tareas: [
        { id: 's1-1', texto: 'Completar el módulo "Conoce el iPhone" y aprobar su quiz' },
        { id: 's1-2', texto: 'Completar el módulo "Recepción de equipos" y aprobar su quiz' },
        { id: 's1-3', texto: 'Observar al menos 5 ventas reales junto a un compañero' },
        { id: 's1-4', texto: 'Observar al menos 5 recepciones de equipos en taller' },
        { id: 's1-5', texto: 'Llenar 3 órdenes de servicio de práctica (supervisadas)' }
      ]
    },
    {
      id: 'semana2',
      titulo: 'Semana 2 · Práctica guiada',
      tareas: [
        { id: 's2-1', texto: 'Completar el módulo "Venta consultiva" y aprobar su quiz' },
        { id: 's2-2', texto: 'Completar el módulo "Servicio técnico" y aprobar su quiz' },
        { id: 's2-3', texto: 'Atender clientes con acompañamiento' },
        { id: 's2-4', texto: 'Hacer revisión completa de un iPhone usado (checklist de compra)' },
        { id: 's2-5', texto: 'Usar el Asistente de diagnóstico en 3 casos reales' }
      ]
    },
    {
      id: 'mes1',
      titulo: 'Mes 1 · Autonomía',
      tareas: [
        { id: 'm1-1', texto: 'Completar todos los módulos con quiz ≥ 80%' },
        { id: 'm1-2', texto: 'Atender clientes de forma autónoma' },
        { id: 'm1-3', texto: 'Reunión de retroalimentación con administración' },
        { id: 'm1-4', texto: 'Definir metas personales para el mes 2' }
      ]
    }
  ],

  // ------------------------------------------------------------------
  // MÓDULOS DE FORMACIÓN (lecciones + quiz)
  // ------------------------------------------------------------------
  modulos: [
    {
      id: 'cultura',
      icono: '🏠',
      titulo: 'Cultura y políticas',
      area: 'General',
      resumen: 'Quiénes somos, cómo trabajamos y las reglas básicas.',
      lecciones: [
        {
          titulo: 'Quiénes somos',
          contenido: [
            'conectaoctg se especializa SOLO en iPhone: venta y servicio técnico. Esa especialización es nuestra promesa al cliente: sabemos de iPhone más que una tienda general.',
            'No vendemos ni reparamos Android, tablets de otras marcas ni otros equipos. Si un cliente lo pide, se le explica con amabilidad que somos especialistas en iPhone.',
            '⚠️ EDITAR: misión, historia y valores de la tienda.'
          ]
        },
        {
          titulo: 'Reglas de la casa',
          contenido: [
            'Ningún equipo de cliente sale del mostrador sin orden de servicio firmada.',
            'Nunca pedir ni anotar el código de desbloqueo del cliente en lugares visibles. Si se necesita para pruebas, se registra en la orden y se borra al entregar. ⚠️ EDITAR según la política de la tienda.',
            'Nunca revisar fotos, mensajes ni apps personales del cliente.',
            'Todo dinero recibido se registra en caja en el momento.',
            'Ante cualquier duda de precio, garantía o diagnóstico: preguntar antes de prometer.'
          ]
        },
        {
          titulo: 'Garantías (marco general)',
          contenido: [
            'En Colombia, el Estatuto del Consumidor (Ley 1480 de 2011) establece la garantía legal. Es obligatoria y no se puede negar.',
            '⚠️ EDITAR: tiempo de garantía que ofrece la tienda para equipos nuevos, usados/seminuevos y para cada tipo de reparación.',
            '⚠️ EDITAR: qué anula la garantía (golpes, humedad, equipo abierto por terceros, etc.).',
            'Siempre explicar la garantía al cliente ANTES de cerrar la venta o la reparación, y dejarla por escrito en la factura u orden.'
          ]
        }
      ],
      quiz: [
        {
          p: '¿Qué hacemos si un cliente trae un celular Android para reparar?',
          o: ['Lo recibimos y lo enviamos a otro taller', 'Le explicamos con amabilidad que somos especialistas solo en iPhone', 'Lo intentamos reparar igual'],
          r: 1
        },
        {
          p: '¿Puede un equipo de cliente pasar al taller sin orden de servicio?',
          o: ['Sí, si el cliente tiene prisa', 'Sí, si es cliente conocido', 'No, nunca'],
          r: 2
        },
        {
          p: '¿Cuándo se le explica la garantía al cliente?',
          o: ['Solo si pregunta', 'Antes de cerrar la venta o reparación, y por escrito', 'Cuando vuelve con un reclamo'],
          r: 1
        }
      ]
    },

    {
      id: 'iphone',
      icono: '📱',
      titulo: 'Conoce el iPhone',
      area: 'Ventas',
      resumen: 'Cómo identificar modelos, capacidades y revisar el estado de un equipo.',
      lecciones: [
        {
          titulo: 'Identificar el modelo',
          contenido: [
            'Ruta: Ajustes > General > Información. Ahí se ve el nombre del modelo, la capacidad, el número de serie y el IMEI.',
            'Marcando *#06# se muestra el IMEI. Debe coincidir con el de Ajustes y con el de la bandeja SIM (en modelos que lo traen grabado).',
            'Desde el iPhone 14 en Estados Unidos, algunos modelos son solo eSIM (sin bandeja física). Confirmar siempre si el equipo tiene bandeja SIM antes de venderlo a un cliente que usa SIM física.',
            'Los modelos "Pro" se diferencian por cámaras triples y materiales; los "Plus"/"Pro Max" por tamaño de pantalla. Ante duda, confiar en Ajustes, no en la apariencia.'
          ]
        },
        {
          titulo: 'Salud de la batería',
          contenido: [
            'Ruta: Ajustes > Batería > Estado de la batería (el nombre exacto puede variar según la versión de iOS).',
            'Apple considera que una batería está desgastada cuando su capacidad máxima baja de alrededor del 80%. En ese punto iOS puede mostrar "Servicio" y recomendar reemplazo.',
            'Si aparece "Pieza desconocida" o un mensaje similar, la batería probablemente fue reemplazada por una no original o no fue emparejada. Hay que informarlo al cliente.'
          ]
        },
        {
          titulo: 'Historial de piezas',
          contenido: [
            'En modelos recientes, Ajustes > General > Información muestra "Historial de piezas y servicio" cuando se ha cambiado pantalla, batería o cámara.',
            'Puede indicar "Pieza original de Apple" o "Pieza desconocida". Esto es clave al comprar o vender un usado: el cliente debe saber qué piezas se cambiaron.',
            'La disponibilidad de este menú depende del modelo y de la versión de iOS.'
          ]
        },
        {
          titulo: 'Bloqueo de activación (iCloud)',
          contenido: [
            'Un iPhone con "Buscar mi iPhone" activo y cuenta iCloud ajena queda bloqueado al restaurarlo. NO se puede usar sin la contraseña del dueño.',
            'Al comprar o recibir un usado para la venta: el vendedor debe cerrar sesión de iCloud delante de nosotros (Ajustes > [nombre] > Cerrar sesión) y luego borrar el equipo.',
            'Nunca comprar un equipo con bloqueo de activación ni ofrecer "desbloquear iCloud". Además de ser un riesgo legal, suele ser señal de equipo robado.'
          ]
        }
      ],
      quiz: [
        {
          p: '¿Dónde se ve el modelo, capacidad e IMEI de un iPhone?',
          o: ['Ajustes > General > Información', 'Ajustes > Pantalla', 'App Store'],
          r: 0
        },
        {
          p: '¿Qué código muestra el IMEI al marcarlo?',
          o: ['*#21#', '*#06#', '#31#'],
          r: 1
        },
        {
          p: '¿Desde qué porcentaje aproximado Apple considera desgastada la batería?',
          o: ['95%', '80%', '50%'],
          r: 1
        },
        {
          p: 'Un vendedor ofrece un iPhone con iCloud ajeno activo. ¿Qué hacemos?',
          o: ['Lo compramos más barato', 'Lo compramos y luego lo desbloqueamos', 'No lo compramos'],
          r: 2
        }
      ]
    },

    {
      id: 'ventas',
      icono: '🤝',
      titulo: 'Venta consultiva',
      area: 'Ventas',
      resumen: 'Cómo atender, recomendar el iPhone correcto y cerrar la venta.',
      lecciones: [
        {
          titulo: 'Los 5 pasos de la venta',
          contenido: [
            '1. Saludar: contacto visual, sonrisa y presentarse por el nombre. Ej.: "¡Hola! Bienvenido a conectaoctg, soy ___. ¿En qué te ayudo?"',
            '2. Preguntar: entender qué necesita ANTES de mostrar equipos (ver "Preguntas clave").',
            '3. Recomendar: máximo 2 o 3 opciones que encajen con lo que dijo. Demasiadas opciones confunden.',
            '4. Resolver objeciones: escuchar, validar y responder con datos.',
            '5. Cerrar y acompañar: proponer el siguiente paso, ofrecer accesorios útiles, explicar garantía y ayudar a pasar la información del celular anterior.'
          ]
        },
        {
          titulo: 'Preguntas clave',
          contenido: [
            '¿Qué iPhone usas hoy y qué es lo que más te molesta de él?',
            '¿Para qué lo usas más: fotos/video, redes, trabajo, juegos?',
            '¿Cuánto espacio sueles necesitar? ¿Se te llena el celular?',
            '¿Lo prefieres nuevo o seminuevo/usado en buen estado?',
            '¿Qué presupuesto tienes en mente? (preguntarlo con naturalidad, no al inicio)'
          ]
        },
        {
          titulo: 'Objeciones frecuentes',
          contenido: [
            '"Está caro" → Mostrar qué incluye (garantía, revisión, estado de batería) y comparar con una alternativa de menor precio.',
            '"En otro lado está más barato" → Preguntar qué incluye esa oferta: ¿garantía escrita? ¿batería al 100%? ¿piezas originales? ¿IMEI verificado?',
            '"Lo voy a pensar" → "Claro. ¿Qué es lo que te genera duda?" Muchas veces hay una duda concreta que se puede resolver.',
            '"¿Es original?" → Mostrar Ajustes > General > Información e historial de piezas delante del cliente.'
          ]
        },
        {
          titulo: 'Checklist de entrega de un equipo vendido',
          contenido: [
            'Encender el equipo delante del cliente y verificar que esté sin cuenta iCloud previa.',
            'Mostrar estado de batería e historial de piezas.',
            'Probar llamada, cámara, Face ID/Touch ID, carga y altavoces.',
            'Entregar factura con IMEI y condiciones de garantía.',
            'Ofrecer ayuda para transferir datos (Inicio rápido) y crear/iniciar Apple ID.',
            'Ofrecer protector de pantalla y forro (venta complementaria útil, no forzada).'
          ]
        }
      ],
      quiz: [
        {
          p: '¿Qué se hace ANTES de mostrar equipos?',
          o: ['Hablar del precio', 'Preguntar qué necesita el cliente', 'Mostrar el más caro'],
          r: 1
        },
        {
          p: '¿Cuántas opciones conviene recomendar?',
          o: ['Todas las que hay', 'Solo una', 'Dos o tres que encajen'],
          r: 2
        },
        {
          p: 'El cliente dice "lo voy a pensar". ¿Mejor respuesta?',
          o: ['"Bueno, chao"', '"Claro, ¿qué te genera duda?"', '"Solo hoy tiene descuento" (aunque no sea cierto)'],
          r: 1
        }
      ]
    },

    {
      id: 'recepcion',
      icono: '📋',
      titulo: 'Recepción de equipos',
      area: 'Servicio técnico',
      resumen: 'Cómo recibir un iPhone para reparación sin problemas posteriores.',
      lecciones: [
        {
          titulo: 'Por qué la recepción es crítica',
          contenido: [
            'La mayoría de los reclamos en servicio técnico vienen de una mala recepción: "mi celular no tenía ese rayón", "antes sí servía el Face ID".',
            'Regla de oro: todo lo que no quede escrito en la orden, no existe.'
          ]
        },
        {
          titulo: 'Paso a paso',
          contenido: [
            '1. Datos del cliente: nombre, cédula y WhatsApp.',
            '2. Datos del equipo: modelo, color, capacidad, IMEI/serie.',
            '3. Falla reportada con las palabras del cliente.',
            '4. Estado físico: rayones, golpes, vidrio trasero, marco, cámaras. Tomar fotos.',
            '5. Pruebas previas (si enciende): pantalla táctil, Face ID/Touch ID, cámaras, micrófono, altavoz, carga, señal, WiFi.',
            '6. Revisar indicador de humedad en la ranura SIM (se vuelve rojo/rosado al contacto con líquido).',
            '7. Preguntar si ha sido abierto o reparado antes.',
            '8. Informar tiempo estimado y que el precio final se confirma tras el diagnóstico.',
            '9. Firma del cliente y copia de la orden.'
          ]
        },
        {
          titulo: 'Riesgos que hay que advertir',
          contenido: [
            'Equipos mojados o muy golpeados pueden dejar de encender durante la reparación. Advertirlo y dejarlo escrito.',
            'Al abrir un iPhone se pierde parte de la resistencia al agua original aunque se use adhesivo nuevo.',
            'Funciones como Face ID y True Tone pueden verse afectadas por reemplazos de piezas. Lo confirma el técnico antes de cotizar.',
            'Recomendar al cliente hacer copia de seguridad (iCloud o computador) antes de dejar el equipo.'
          ]
        }
      ],
      quiz: [
        {
          p: '¿Dónde está el indicador de humedad en la mayoría de iPhone?',
          o: ['En la ranura de la SIM', 'Detrás de la cámara', 'En el botón de encendido'],
          r: 0
        },
        {
          p: 'Un cliente dice que el rayón "no estaba antes". ¿Qué nos protege?',
          o: ['Nuestra memoria', 'Orden de servicio con estado físico y fotos', 'Nada'],
          r: 1
        },
        {
          p: '¿Qué se le recomienda al cliente antes de dejar el equipo?',
          o: ['Hacer copia de seguridad', 'Borrar todas sus apps', 'Quitarle el forro y nada más'],
          r: 0
        }
      ]
    },

    {
      id: 'tecnico',
      icono: '🔧',
      titulo: 'Servicio técnico iPhone',
      area: 'Servicio técnico',
      resumen: 'Reparaciones más comunes, buenas prácticas y seguridad en el taller.',
      lecciones: [
        {
          titulo: 'Reparaciones más comunes',
          contenido: [
            'Pantalla (vidrio roto, táctil fallando, manchas, líneas).',
            'Batería (desgaste, se apaga, se hincha).',
            'Puerto de carga (suciedad, pines dañados).',
            'Cámaras (lente roto, no enfoca, cámara negra).',
            'Vidrio trasero.',
            'Altavoz/micrófono.',
            'Fallas de software (logo de Apple en bucle, actualización fallida).',
            'Daño por líquido.'
          ]
        },
        {
          titulo: 'Seguridad en el taller',
          contenido: [
            'Usar pulsera antiestática y tapete ESD.',
            'Desconectar SIEMPRE el conector de la batería antes de desconectar o conectar cualquier otra pieza.',
            'Las baterías de litio hinchadas o perforadas pueden incendiarse: no doblarlas ni perforarlas. Tener a mano un recipiente con arena o un recipiente ignífugo. ⚠️ EDITAR: protocolo de la tienda.',
            'Organizar tornillos según su posición: en iPhone hay tornillos de longitudes distintas y uno mal puesto puede dañar la placa.',
            'Al aplicar calor (para despegar pantalla o vidrio), hacerlo de forma controlada.'
          ]
        },
        {
          titulo: 'Emparejamiento de piezas',
          contenido: [
            'En los iPhone recientes, varias piezas (pantalla, batería, cámara, Face ID) están asociadas a la placa. Si se cambian sin calibrarse, iOS puede mostrar avisos de "Pieza desconocida" o perder funciones.',
            'El sensor de Face ID (proyector de puntos) está emparejado a la placa: no se puede reemplazar por uno de otro equipo sin que deje de funcionar.',
            'True Tone puede perderse al cambiar la pantalla si no se transfieren los datos de la pantalla original con el programador adecuado.',
            'Antes de cotizar, el técnico debe explicar al cliente qué funciones pueden verse afectadas.'
          ]
        },
        {
          titulo: 'Control de calidad antes de entregar',
          contenido: [
            'Táctil en toda la pantalla (probar arrastrando un ícono por todos los bordes).',
            'Face ID/Touch ID, cámaras frontal y trasera (foto y video), flash.',
            'Llamada: auricular, altavoz y micrófono.',
            'Carga por cable y, si aplica, MagSafe/inalámbrica.',
            'Señal, WiFi, Bluetooth.',
            'Botones físicos y sensor de proximidad (la pantalla debe apagarse al acercar el oído en una llamada).',
            'Revisar avisos en Ajustes (piezas, batería).',
            'Limpiar el equipo antes de entregarlo.'
          ]
        }
      ],
      quiz: [
        {
          p: '¿Qué se desconecta primero al abrir un iPhone?',
          o: ['La pantalla', 'La batería', 'La cámara'],
          r: 1
        },
        {
          p: '¿Por qué hay que organizar los tornillos por posición?',
          o: ['Por estética', 'Tienen longitudes distintas y uno mal puesto puede dañar la placa', 'No importa'],
          r: 1
        },
        {
          p: '¿Se puede pasar el sensor de Face ID de un iPhone a otro sin problemas?',
          o: ['Sí, siempre', 'No, está emparejado a la placa', 'Solo en modelos Pro'],
          r: 1
        },
        {
          p: '¿Cómo se prueba el sensor de proximidad?',
          o: ['La pantalla debe apagarse al acercar el oído en una llamada', 'Subiendo el brillo', 'Abriendo la cámara'],
          r: 0
        }
      ]
    }
  ],

  // ------------------------------------------------------------------
  // ASISTENTE DE DIAGNÓSTICO (orientativo, NO reemplaza al técnico)
  // ------------------------------------------------------------------
  diagnostico: [
    {
      id: 'no-enciende',
      sintoma: 'No enciende / pantalla negra',
      preguntas: ['¿Se mojó o se cayó?', '¿Vibra o suena al conectarlo?', '¿Desde cuándo?'],
      pasos: [
        'Conectar a un cargador y cable que sepamos que funcionan durante 15-30 min.',
        'Intentar reinicio forzado: subir volumen, bajar volumen y mantener el botón lateral hasta ver el logo (iPhone 8 y posteriores).',
        'Si vibra o suena pero no se ve nada: probable pantalla.',
        'Si no da ninguna señal: posible batería, puerto de carga o placa.',
        'Revisar indicador de humedad en la ranura SIM.'
      ],
      derivar: 'Si después del reinicio forzado y carga no hay ninguna señal, pasar al técnico para medición con fuente/amperímetro.'
    },
    {
      id: 'no-carga',
      sintoma: 'No carga o carga intermitente',
      preguntas: ['¿Pasa con cualquier cable?', '¿Carga inalámbrica sí funciona?'],
      pasos: [
        'Probar con un cable y cargador de la tienda que funcionen.',
        'Inspeccionar el puerto con linterna: es muy común encontrar pelusa compactada.',
        'Limpiar con herramienta plástica o de madera (nunca metálica) con el equipo apagado.',
        'Si carga de forma inalámbrica pero no por cable: probable puerto o flex de carga.',
        'Si aparece "Accesorio no compatible" con cables buenos: posible puerto dañado.'
      ],
      derivar: 'Si después de limpieza sigue igual, cotizar cambio de puerto/flex de carga con el técnico.'
    },
    {
      id: 'bateria',
      sintoma: 'La batería dura poco / se apaga sola',
      preguntas: ['¿Se apaga con porcentaje alto?', '¿La pantalla o la tapa se ve levantada?'],
      pasos: [
        'Revisar Ajustes > Batería > Estado de la batería.',
        'Si la capacidad está por debajo de ~80% o dice "Servicio": recomendar cambio de batería.',
        'Revisar qué apps consumen más en Ajustes > Batería.',
        'Si la pantalla está levantada o el equipo está abombado: posible batería hinchada. NO presionar. Manipular con cuidado.'
      ],
      derivar: 'Batería hinchada: pasar de inmediato al técnico y guardar en zona segura.'
    },
    {
      id: 'pantalla',
      sintoma: 'Pantalla rota, líneas, manchas o táctil no responde',
      preguntas: ['¿Se cayó o recibió presión?', '¿El táctil falla en una zona o en toda la pantalla?'],
      pasos: [
        'Revisar si solo el vidrio está roto o también la imagen (manchas, líneas, sin imagen).',
        'Probar el táctil arrastrando un ícono por toda la pantalla.',
        'Retirar protector de pantalla dañado: a veces causa fallas de táctil.',
        'Verificar si la pantalla ya fue cambiada antes (Ajustes > General > Información > historial de piezas).'
      ],
      derivar: 'Cotizar cambio de pantalla e informar sobre True Tone y avisos de pieza según el tipo de repuesto.'
    },
    {
      id: 'faceid',
      sintoma: 'Face ID no funciona',
      preguntas: ['¿Se cayó o se mojó?', '¿Le cambiaron la pantalla antes?', '¿Aparece algún mensaje?'],
      pasos: [
        'Limpiar la parte superior de la pantalla (cámara y sensores).',
        'Ir a Ajustes > Face ID y código e intentar configurar de nuevo.',
        'Si aparece "Face ID no disponible" o "No se puede activar Face ID": posible daño de componentes.',
        'Preguntar por reparaciones anteriores: un cambio de pantalla mal hecho puede dañar el flex del sensor.'
      ],
      derivar: 'Face ID requiere diagnóstico del técnico: no prometer reparación hasta que lo evalúe.'
    },
    {
      id: 'liquido',
      sintoma: 'Se mojó',
      preguntas: ['¿Cuándo se mojó?', '¿Con qué líquido (agua, mar, gaseosa)?', '¿Lo intentaron cargar?'],
      pasos: [
        'Indicar al cliente NO cargarlo ni intentar encenderlo repetidamente.',
        'No usar arroz ni secador: no reemplaza la limpieza interna.',
        'Revisar indicador de humedad en la ranura SIM.',
        'Recibir con advertencia escrita: puede tener daños ocultos que aparezcan después.'
      ],
      derivar: 'Pasar al técnico lo antes posible para apertura y limpieza. El tiempo juega en contra por la corrosión.'
    },
    {
      id: 'logo',
      sintoma: 'Se queda en la manzana / se reinicia solo',
      preguntas: ['¿Pasó después de una actualización?', '¿Tiene copia de seguridad?'],
      pasos: [
        'Intentar reinicio forzado.',
        'Conectar a computador con iTunes/Finder y entrar en modo recuperación.',
        'Intentar primero "Actualizar" (conserva datos). "Restaurar" BORRA todo: solo con autorización escrita del cliente.',
        'Si se reinicia en ciclos regulares (por ejemplo cada pocos minutos), puede ser un sensor o flex desconectado/dañado.'
      ],
      derivar: 'Si la actualización falla o hay reinicios en ciclo, pasar al técnico.'
    },
    {
      id: 'audio',
      sintoma: 'No se escucha / no lo escuchan en llamadas',
      preguntas: ['¿Pasa en llamadas, en música o en ambos?', '¿Con audífonos Bluetooth conectados?'],
      pasos: [
        'Desconectar Bluetooth para descartar audífonos conectados.',
        'Revisar que el modo silencio y el volumen estén correctos.',
        'Limpiar rejillas de altavoz y micrófono con cepillo suave.',
        'Grabar una nota de voz y reproducirla para separar falla de micrófono vs. altavoz.'
      ],
      derivar: 'Si persiste tras limpieza, cotizar cambio de altavoz/micrófono con el técnico.'
    }
  ],

  // ------------------------------------------------------------------
  // PREGUNTAS FRECUENTES Y GLOSARIO
  // ------------------------------------------------------------------
  faq: [
    { p: '¿Qué es el IMEI?', r: 'Número único de 15 dígitos que identifica el equipo en la red celular. Se ve marcando *#06# o en Ajustes > General > Información.' },
    { p: '¿Cómo verifico si un IMEI está reportado en Colombia?', r: 'Se puede consultar en el portal imeicolombia.com.co. ⚠️ EDITAR: confirmar el procedimiento que usa la tienda.' },
    { p: '¿Qué es el bloqueo de activación?', r: 'Protección de Apple que exige el Apple ID del dueño para usar el equipo tras borrarlo. Nunca comprar ni recibir para venta equipos con este bloqueo.' },
    { p: '¿Qué es Inicio rápido?', r: 'Función de Apple para pasar datos de un iPhone viejo a uno nuevo acercándolos. Útil al entregar un equipo vendido.' },
    { p: '¿Qué es True Tone?', r: 'Función que ajusta el color de la pantalla según la luz ambiente. Puede perderse al cambiar la pantalla si no se transfieren sus datos.' },
    { p: '¿Qué es DFU?', r: 'Modo de restauración de bajo nivel. Se usa cuando el modo recuperación no funciona. Borra los datos: solo con autorización del cliente.' },
    { p: '¿Qué es una eSIM?', r: 'SIM digital integrada en el equipo. Algunos iPhone (por ejemplo, modelos de EE. UU. desde el iPhone 14) no tienen bandeja para SIM física.' },
    { p: '¿Qué es "Pieza desconocida"?', r: 'Aviso de iOS cuando detecta una pieza no original o no emparejada (pantalla, batería, cámara). Se debe informar al cliente.' },
    { p: '¿Cuánto cuesta una reparación?', r: '⚠️ EDITAR: dónde consultar la lista de precios actualizada. Nunca dar precio final sin diagnóstico del técnico.' },
    { p: '¿Qué medios de pago aceptamos?', r: '⚠️ EDITAR: efectivo, transferencia, tarjetas, financiación, etc.' }
  ],

  // ------------------------------------------------------------------
  // CHECKLIST DE RECEPCIÓN (formulario imprimible)
  // ------------------------------------------------------------------
  recepcionChecks: [
    'Pantalla / táctil',
    'Face ID / Touch ID',
    'Cámara trasera',
    'Cámara frontal',
    'Flash',
    'Altavoz',
    'Auricular',
    'Micrófono',
    'Carga por cable',
    'Carga inalámbrica / MagSafe',
    'Señal / SIM',
    'WiFi / Bluetooth',
    'Botones (volumen, lateral, silencio)',
    'Sensor de proximidad',
    'Vibración'
  ]
};
