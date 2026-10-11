# Bienvenida conectaoctg (onboarding de nuevos empleados)

App web instalable (PWA) para guiar a los nuevos empleados de conectaoctg, una tienda de venta y servicio técnico solo para iPhone.

- **Inicio**: progreso general, la siguiente tarea y los contactos clave.
- **Ruta**: lista de tareas del día 1, la semana 1, la semana 2 y el mes 1.
- **Cursos**: 5 módulos con lecciones y quiz (se aprueba con 80 %). Primero aparecen los del cargo de cada empleado.
- **Taller**: asistente de diagnóstico por síntoma y orden de recepción para imprimir.
- **Ayuda**: buscador de preguntas frecuentes, lecciones y diagnósticos.

## Editar el contenido
Todo el contenido está en `content.js`. Los textos marcados con `⚠️ EDITAR` son políticas
internas (garantías, precios, contactos, horario) que la administración debe completar.
En la app se ven resaltados como "⚠️ Pendiente".

## Datos
- El progreso de cada empleado se guarda solo en su propio navegador (`localStorage`). No se sincroniza.
- Los datos de clientes de la orden de recepción **no se guardan**: solo sirven para imprimir o guardar como PDF.

## Uso
Es una app estática. Con el `vercel.json` actual queda publicada en `/onboarding/`.
Para probarla en tu computador: `python3 -m http.server` desde la raíz del repositorio y abrir `http://localhost:8000/onboarding/`.
