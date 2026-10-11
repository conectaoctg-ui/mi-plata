# ConectaOCTG Smart Assistant — Diseño del sistema (v0.1)

> Estado del documento: propuesta técnica del MVP. Los procesos reales de ConectaOCTG y de E-Credit **aún no han sido documentados por la empresa**; donde se mencionan, es como supuesto a validar.

---

## 1. Requisitos

### 1.1 Funcionales

| ID | Requisito | Módulo | Estado en v0.1 |
|----|-----------|--------|----------------|
| RF-01 | Iniciar sesión con usuario y clave; roles admin, supervisor, asesor y técnico | Seguridad | ✅ Modo local |
| RF-02 | Catálogo con modelo, capacidad, condición, precio, inventario, batería y garantía, cada dato con fuente, fecha y responsable | Ventas | ✅ |
| RF-03 | Marcar como "por confirmar" un precio con más de 7 días sin actualizar | Ventas | ✅ |
| RF-04 | Comparar entre 2 y 3 equipos resaltando las diferencias | Ventas | ✅ |
| RF-05 | Recomendar equipos con stock según presupuesto, uso, capacidad y condición, explicando por qué | Ventas | ✅ |
| RF-06 | Armar el argumento comercial solo con datos registrados | Ventas | ✅ |
| RF-07 | Calcular márgenes y descuento máximo con el margen mínimo autorizado (solo admin y supervisor) | Ventas | ✅ |
| RF-08 | Registrar clientes potenciales con datos mínimos, etapa, próxima acción, motivo de pérdida, autorización de contacto y "no contactar" | Clientes | ✅ |
| RF-09 | Lecciones por área, rol y nivel, con evaluación que explica cada error | Academia | ✅ 10 lecciones |
| RF-10 | Simulaciones con clientes ficticios, con retroalimentación y penalización de respuestas engañosas | Academia | ✅ 3 escenarios |
| RF-11 | Asignar capacitación, validar competencias y ver el progreso del equipo | Academia | ✅ |
| RF-12 | Guía de E-Credit por etapas que separe el concepto general del procedimiento oficial registrado | Financiación | ✅ (sin procedimiento oficial cargado) |
| RF-13 | Simulador educativo en COP: EA/MV, cargos, tabla de amortización, comparación con la tasa de usura registrada | Financiación | ✅ |
| RF-14 | Diagnóstico guiado por síntoma: preguntas, pasos, causas probables y cuándo escalar | Técnico | ✅ 8 síntomas |
| RF-15 | Casos técnicos con estados, hallazgos (síntoma / probable / confirmada), aprobación del cliente y 12 controles de calidad | Técnico | ✅ |
| RF-16 | Rechazar contraseñas y códigos escritos en los casos | Técnico | ✅ (detección por patrones) |
| RF-17 | Buscador sin tildes, con sinónimos, que muestre si cada resultado está verificado | Conocimiento | ✅ |
| RF-18 | Administrar usuarios, catálogo, conocimiento, configuración y procedimientos de E-Credit sin tocar el código | Admin | ✅ |
| RF-19 | Indicadores de capacitación, embudo, motivos de pérdida y casos técnicos | Admin | ✅ básicos |
| RF-20 | Auditoría de acciones relevantes sin datos sensibles | Admin | ✅ |
| RF-21 | Descargar y restaurar un respaldo | Admin | ✅ |
| RF-22 | Asistente conversacional con IA que responda usando la base de conocimiento | IA | ❌ Fase siguiente |
| RF-23 | Sincronizar entre dispositivos con un servidor | Plataforma | ❌ Fase siguiente |
| RF-24 | Integración con E-Credit | Financiación | ❌ Solo si hay API oficial y autorización |

### 1.2 No funcionales

| ID | Requisito | Cómo se cumple hoy |
|----|-----------|--------------------|
| RNF-01 | Español, se usa bien en celular y en computador | Diseño adaptable y prueba automática a 390 px de ancho |
| RNF-02 | Sin costo de infraestructura en el MVP | Archivos estáticos, sin dependencias externas en tiempo de ejecución |
| RNF-03 | Montos en COP como enteros, con formato `$ 1.800.000 COP` | `money.js`, con pruebas |
| RNF-04 | Mínimo privilegio | Matriz `permissions.js`; la capa de servicio vuelve a leer el rol en cada operación |
| RNF-05 | Claves nunca en texto plano | PBKDF2-SHA256 con 210.000 iteraciones y sal aleatoria |
| RNF-06 | Protección contra fuerza bruta | Bloqueo de 5 min tras 5 intentos fallidos |
| RNF-07 | Cierre de sesión por inactividad | 30 min, con la sesión guardada en `sessionStorage` |
| RNF-08 | Protección contra XSS | Todo dato variable se escapa (`esc`), más Content-Security-Policy sin `unsafe-inline` |
| RNF-09 | Recolección mínima (Ley 1581 de 2012) | Sin cédula ni dirección; teléfono solo con autorización |
| RNF-10 | Confirmación humana en acciones irreversibles | Diálogo en: eliminar, no contactar, entregar o cancelar un caso, restaurar y descargar respaldo |
| RNF-11 | Funcionar sin conexión | Service worker (solo en HTTPS) |
| RNF-12 | Mantenible sin compilación | JavaScript con módulos ES, sin framework; las pruebas usan `node:test` |

---

## 2. Arquitectura

### 2.1 Opciones comparadas

| Criterio | A. Estático + modo local (**v0.1**) | B. Estático + Firebase (Auth + Firestore + reglas) | C. Next.js + Postgres (Supabase o Vercel) |
|---|---|---|---|
| Costo inicial | $0 | $0 dentro del plan gratuito (cupos según el plan vigente de Google: **verificar**) | $0–$25 USD/mes según el plan (**verificar precios vigentes**) |
| Seguridad multiusuario | ❌ Datos en un solo navegador | ✅ Reglas aplicadas en el servidor | ✅ Backend propio con RLS |
| Mantenimiento | Muy bajo | Bajo; el repositorio ya usa Firebase en "Mi Plata" | Medio a alto: hay que mantener un servidor |
| Escalabilidad | 1 dispositivo | Alta | Alta |
| Integración con IA | Necesitaría un backend aparte | Cloud Functions como intermediario | Rutas de API |
| Encaje con lo que ya existe | Total | Alto (`firestore.rules` y Vercel ya en uso) | Requiere una migración |

**Recomendación:**
- **A** para validar contenidos y flujos con el equipo, lo que ya está construido.
- Después pasar a **B**, porque reutiliza Firebase y Vercel, que el repositorio ya usa, y tiene el menor costo total.

La capa `Repo` se diseñó para que el cambio de A a B consista en reemplazar el almacenamiento y repetir las comprobaciones en las reglas de Firestore.

### 2.2 Componentes

```
┌──────────────────────── Navegador (PWA) ────────────────────────┐
│ UI (js/ui/*)  →  Repo (js/data/repo.js): permisos + auditoría   │
│                    │                                            │
│ Lógica pura (js/core/*): dinero, financiación, CRM, casos,       │
│ academia, búsqueda, catálogo, autenticación  ← pruebas unitarias │
│                    │                                            │
│ Almacenamiento: LocalStore (hoy) │ Firestore (fase 4)           │
└──────────────────────────────────┼──────────────────────────────┘
                                   ▼
            Firebase Auth + Firestore + reglas por rol (fase 4)
            Cloud Function "asistente" → API de IA (fase 5, opcional)
            E-Credit: enlace externo; NO hay integración
```

- **Base de conocimiento documental:** la colección `conocimiento`, con estado, fuente, fecha y responsable.
- **Búsqueda y recuperación:** `search.js`, local, por palabras y sinónimos. Con IA, ese mismo índice daría los fragmentos para responder (RAG) y la respuesta citaría los artículos verificados.
- **IA mediante interfaz controlada:**
  - Hoy no hay IA. Cuando se agregue, irá detrás de una Cloud Function que oculta la clave de la API.
  - Se enviarán solo artículos verificados y nunca datos de clientes.
  - Las respuestas se marcarán como generadas por IA y tendrán límites de uso.
  - El costo se estima cuando se definan el volumen y el modelo.
- **Ambientes:** un proyecto de Firebase para desarrollo y otro para producción. En v0.1, cada navegador es su propio ambiente.

---

## 3. Mapa de pantallas y flujos

```
Acceso (configuración inicial / iniciar sesión)
└── Inicio (según el rol: avance, seguimientos, casos, alertas para el admin)
    ├── Ventas iPhone: Catálogo · Recomendar · Comparar · Revisar un usado · Márgenes*
    ├── Clientes: Lista por etapa · Seguimientos de hoy · Nuevo/Editar · No contactar
    ├── Financiación: Guía E-Credit · Simulador educativo · Errores frecuentes
    ├── Servicio técnico: Diagnóstico guiado · Casos · Recibir equipo · Detalle del caso
    ├── Academia: Lecciones · Lección + evaluación · Simulaciones · Mi progreso · Equipo*
    ├── Buscar
    └── Administración*: Indicadores · Usuarios · Catálogo · Conocimiento · Configuración · Auditoría · Respaldo
(* según permisos)
```

**Flujo de venta:**
1. Saludo.
2. Preguntas de descubrimiento, registradas como cliente en etapa "nuevo".
3. Recomendar: 2 o 3 opciones con su razón.
4. Comparar.
5. Objeciones, con el argumento comercial construido solo con datos registrados.
6. Si pide financiación: la Guía E-Credit y la plataforma oficial. La simulación educativa es solo para formación.
7. Cerrar como ganada, o perdida con motivo.
8. Entrega con checklist.

**Flujo técnico:**
1. Diagnóstico guiado.
2. Recibir equipo; se rechazan contraseñas.
3. Diagnóstico con hallazgos.
4. Falla confirmada con evidencia, solo por un técnico.
5. Cotizado.
6. Aprobación del cliente.
7. Reparación.
8. Control de calidad (12 puntos).
9. Listo.
10. Entregado, con confirmación.

En cualquier momento el caso puede pasar a "escalado".

---

## 4. Modelo de datos y permisos

### 4.1 Colecciones

| Colección | Campos principales | Notas |
|---|---|---|
| `usuarios` | id, nombre, usuario, rol, activo, creado | |
| `credenciales` | userId → {sal, hash, iteraciones} | En modo servidor lo reemplaza Firebase Auth |
| `catalogo` | modelo, capacidadGB, condicion, color, precio, costo, stock, saludBateria, garantiaMeses, usos[], notas, **fuente, actualizado, responsable**, demo | `costo` oculto a asesores y técnicos |
| `conocimiento` | titulo, texto, area, **estado (pendiente/verificado), fuente, actualizado, responsable** | |
| `config` | garantías, tasa de usura (+fuente y fecha), margen mínimo, enlace y contacto de E-Credit (+fuente) | |
| `ecreditEtapas` | id, nombre, concepto, **procedimientoOficial, fuente, actualizado, responsable** | |
| `leads` | nombre, telefono, canal, etapa, interes, presupuesto, objeciones, proximaAccion, proximaFecha, motivoPerdida, autorizaContacto, noContactar, asesorId | Sin cédula |
| `casos` | numero, modelo, sintomas, antecedentes, pruebas, estadoFisico, humedad, estado, hallazgos[], clienteAprobo, calidad{}, historial[] | Sin datos del cliente en v0.1 |
| `lecciones`, `escenarios`, `diagnosticos` | Contenido | Hoy se editan mediante respaldo JSON |
| `progreso`, `roleplays`, `asignaciones`, `competencias` | Avance por usuario | |
| `auditoria` | fecha, usuario, accion, entidad, entidadId, detalle filtrado | Se eliminan los campos sensibles |

### 4.2 Matriz de permisos (resumen; la fuente es `js/core/permissions.js`)

| Acción | Admin | Supervisor | Asesor | Técnico |
|---|:-:|:-:|:-:|:-:|
| Ver catálogo / conocimiento | ✅ | ✅ | ✅ | ✅ |
| Ver costo, calcular margen | ✅ | ✅ | ❌ | ❌ |
| Editar catálogo, conocimiento, configuración | ✅ | ❌ | ❌ | ❌ |
| Clientes propios / de todos | ✅/✅ | ✅/✅ | ✅/❌ | ❌/❌ |
| Simulador de financiación | ✅ | ✅ | ✅ | ❌ |
| Recibir equipo / ver casos | ✅ | ✅ | ✅ | ✅ |
| Confirmar falla, reparar, control de calidad, entregar | ✅ | ❌ | ❌ | ✅ |
| Asignar capacitación, validar competencias, ver equipo | ✅ | ✅ | ❌ | ❌ |
| Usuarios, auditoría, respaldo | ✅ | ❌ | ❌ | ❌ |

Reglas adicionales:
- Nadie valida sus propias competencias.
- Siempre debe quedar al menos un administrador activo.
- "No contactar" no se puede revertir desde la edición normal.

---

## 5. Plan de pruebas y criterios de aceptación

| Tipo | Qué cubre | Herramienta | Resultado v0.1 |
|---|---|---|---|
| Unitarias de lógica | Formato y lectura de COP, conversión EA/MV, amortización (valor de referencia $ 94.560 para $ 1.000.000 al 2 % MV en 12 meses), cuadre exacto del capital, entradas inválidas, usura, márgenes, permisos, CRM, estados técnicos, búsqueda, academia, simulaciones, catálogo, hash y bloqueo, auditoría | `node --test` | **26/26 ✅** |
| Capa de servicio | Accesos indebidos por rol, actor con rol falsificado en memoria, usuario desactivado, último admin, aislamiento de clientes por asesor, flujo técnico, respaldo, datos corruptos | `node --test` | **15/15 ✅** |
| Punta a punta | Configuración inicial, clave débil, CRUD de admin, menús por rol, bloqueo de rutas por URL, simulador, consentimiento, no contactar, quiz, simulación no ética, buscador, flujo técnico completo, bloqueo por intentos, auditoría sin datos sensibles, sin errores de consola ni CSP, sin desplazamiento horizontal a 390 px | Playwright/Chromium | **36/36 ✅** |
| Estático | Variables no usadas o no definidas | ESLint | ✅ sin errores |

**Criterios de aceptación del MVP (fase 2):**
- Todas las pruebas en verde.
- Ningún precio, tasa, requisito o garantía aparece sin fuente, o sin la etiqueta "desconocido/pendiente".
- Un asesor no puede ver costos, clientes ajenos ni administración, ni por el menú ni por URL.

**Pendiente de verificar (no hecho):**
- Pruebas con usuarios reales de la tienda.
- Lectores de pantalla.
- Safari en iOS.
- Despliegue en Vercel.
- Pruebas de las reglas de Firestore, que todavía no existen.
- Revisión de los contenidos por la administración.

---

## 6. MVP priorizado (impacto / costo / riesgo)

| Prioridad | Entregable | Impacto | Costo | Riesgo | Estado |
|---|---|---|---|---|---|
| 1 | Academia (lecciones, quiz, simulaciones, progreso) | Alto: acorta la capacitación | Bajo | Bajo | ✅ |
| 2 | Ventas: catálogo con fuente y vigencia, recomendación, comparación | Alto | Bajo | Medio: depende de que la administración mantenga los precios | ✅ |
| 3 | Simulador educativo COP + guía E-Credit | Alto: reduce errores de procedimiento | Bajo | Medio: el contenido oficial de E-Credit no está documentado | ✅ (falta cargar el procedimiento oficial) |
| 4 | Servicio técnico: diagnóstico y casos con control de calidad | Alto | Medio | Bajo | ✅ |
| 5 | Clientes con consentimiento | Medio | Bajo | Medio (datos personales) | ✅ (usar con datos reales solo en modo servidor) |
| 6 | Panel de administración y auditoría | Medio | Medio | Bajo | ✅ |
| 7 | **Modo servidor (Firebase Auth + Firestore + reglas probadas en el emulador)** | Muy alto: habilita el uso real con varios usuarios | Medio | Medio | ❌ Siguiente |
| 8 | Asistente con IA sobre conocimiento verificado | Medio | Variable (por uso) | Alto (precisión) | ❌ Después de 7 |
| 9 | Integración con E-Credit | Medio | Desconocido | Alto | ❌ Solo con API oficial y autorización |

### Fases

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Requisitos | Este documento. Faltan los procesos reales de la tienda |
| 2 | MVP en modo local | Construido y probado |
| 3 | E-Credit | Guía y simulador listos. Falta que la administración cargue el procedimiento oficial |
| 4 | Modo servidor, inventario multiusuario | Pendiente |
| 5 | Pruebas de seguridad y usabilidad con personas reales | Pendiente |
| 6 | Despliegue controlado y medición | Pendiente |
