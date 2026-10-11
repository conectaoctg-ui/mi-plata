# ConectaOCTG Smart Assistant

App web para capacitar y asistir a los empleados de ConectaOCTG en:
- venta de iPhone,
- atención de clientes,
- orientación en financiación con E-Credit,
- servicio técnico de iPhone.

El diseño completo (requisitos, arquitectura, pantallas, datos y permisos, pruebas y priorización) está en [`docs/DISENO.md`](docs/DISENO.md).

## Estado: v0.1 en **modo local de evaluación**

- Los datos se guardan **solo en el navegador** donde se usa la app. No se sincronizan entre dispositivos.
- **No uses datos reales de clientes** hasta activar el modo servidor (fase 4). En modo local, cualquier persona con acceso a ese navegador podría leer o alterar los datos.
- La app **no está conectada a E-Credit**. La simulación de financiación es educativa.
- Todo el contenido de capacitación y conocimiento está marcado **"pendiente de validar"** hasta que la administración lo revise.
- El catálogo empieza vacío. Hay un botón para cargar equipos **DEMO con precios ficticios** solo para probar.

## Uso

```bash
cd smart-assistant
npx serve -l 5173 .          # o cualquier servidor estático
# abrir http://localhost:5173
```

La primera vez se crea la cuenta de administrador. Desde **Administración** se crean los demás usuarios y se cargan el catálogo, el conocimiento verificado, la política de garantías, la tasa de usura vigente y el procedimiento oficial de E-Credit.

## Pruebas

```bash
npm test                      # 41 pruebas de lógica y permisos (node:test, sin dependencias)
npm run test:e2e              # 36 verificaciones en Chromium (requiere Playwright)
npx eslint .                  # análisis estático
```

## Estructura

```
js/core/   lógica pura (dinero, financiación, permisos, CRM, casos técnicos, academia, búsqueda, catálogo, autenticación, auditoría)
js/data/   contenido inicial, almacenamiento local y capa de servicio (permisos + auditoría)
js/ui/     pantallas
tests/     pruebas unitarias y de punta a punta
docs/      diseño
```
