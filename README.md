# ZAHO · Inventario

App de inventario, ventas, cartera y salidas para una tienda multimarca.
React + Vite + TypeScript + Tailwind CSS v4 + React Router. Modo demo con datos simulados (localStorage) y esquema listo para Supabase.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compila a dist/
```

## Datos simulados

- Los datos iniciales están en `src/data/` (un archivo por entidad: productos, ventas, cartera, salidas, pedidos, clientes, comerciales, proveedores, plantillas).
- Las fechas son relativas al día de hoy, así que siempre hay cuentas vencidas, por vencer y ventas recientes.
- Los cambios se guardan en `localStorage`. La app arranca vacía: la primera vez pide crear el administrador. Para borrar todo usa **"Borrar datos locales"** al final del panel de Alertas.

## Estructura (arquitectura por capas)

```
src/
  domain/              entidades y reglas de negocio puras (precios, cuotas, abonos)
  application/         puertos (interfaces de repositorio) y casos de uso
  infrastructure/      Supabase (cliente, mappers, repositorios), datos demo, container
  presentation/        React: páginas, componentes, features/<módulo>, stores
  shared/              fechas, formato, constantes
  config/              variables de entorno
supabase/
  migrations/          esquema SQL (MER) para Supabase
  seed.sql             datos iniciales
docs/
  MER.md               diagrama entidad-relación y cómo ejecutarlo
  ARQUITECTURA.md      capas, reglas de dependencia y plan de migración
```

- Base de datos: ver [docs/MER.md](docs/MER.md).
- Arquitectura y cómo conectar la UI a Supabase: ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- Configuración: copia `.env.example` como `.env.local`.

## Responsive

- **Celular**: barra inferior de navegación, tablas convertidas en tarjetas, paneles a pantalla completa y modales como hoja inferior.
- **Tablet**: menú lateral solo con íconos y tablas con scroll horizontal dentro de su contenedor.
- **Escritorio**: menú lateral con texto; desde 1280 px, columna fija de alertas.
