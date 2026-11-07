# ZAHO · Inventario

App de inventario, ventas, cartera y salidas para una tienda multimarca.
React + Vite + TypeScript + Tailwind CSS v4 + React Router. Sin backend: los datos son simulados.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila a dist/
```

## Datos simulados

- Los datos iniciales están en `src/data/` (un archivo por entidad: productos, ventas, cartera, salidas, pedidos, clientes, comerciales, proveedores, plantillas).
- Las fechas son relativas al día de hoy, así que siempre hay cuentas vencidas, por vencer y ventas recientes.
- Los cambios se guardan en `localStorage`. Para volver a los datos de ejemplo usa **"Restablecer datos de ejemplo"** al final del panel de Alertas.

## Estructura

```
src/
  data/                datos simulados
  types/               tipos del dominio
  lib/                 utilidades puras: fechas, formato, cálculos financieros
  store/               AppStore (datos + commit/toast) y UIStore (paneles y modales)
  components/ui/       componentes genéricos (Button, DataTable, Drawer, Modal…)
  components/layout/   TopBar, Sidebar, BottomNav, AppLayout, OverlayHost
  features/<módulo>/
    services/          lógica pura: recibe el estado y devuelve el nuevo
    hooks/             datos derivados y acciones para los componentes
    components/        UI del módulo
  pages/               una página por ruta; solo compone componentes
```

Flujo de datos: componente → hook → service → `commit()` del AppStore.
Para conectar un backend real, reemplaza el `commit`/`localStorage` del AppStore por llamadas a la API dentro de los services.

## Responsive

- **Celular**: barra inferior de navegación, tablas convertidas en tarjetas, paneles a pantalla completa y modales como hoja inferior.
- **Tablet**: menú lateral solo con íconos y tablas con scroll horizontal dentro de su contenedor.
- **Escritorio**: menú lateral con texto; desde 1280 px, columna fija de alertas.
