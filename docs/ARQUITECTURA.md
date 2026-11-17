# Arquitectura por capas · ZAHO

## Las capas

```
┌──────────────────────────────────────────────────────────────┐
│  presentation/   React: páginas, componentes, hooks, stores  │  ← lo que ve el usuario
├──────────────────────────────────────────────────────────────┤
│  application/    casos de uso + puertos (interfaces)         │  ← qué hace el negocio
├──────────────────────────────────────────────────────────────┤
│  domain/         entidades + reglas puras (precios, cuotas,  │  ← reglas, sin dependencias
│                  repartos de abonos, estados de cartera)     │
└──────────────────────────────────────────────────────────────┘
        ▲ implementa los puertos
┌──────────────────────────────────────────────────────────────┐
│  infrastructure/ Supabase (cliente, mappers, repositorios),  │  ← cómo se guarda
│                  datos locales de demo, container            │
└──────────────────────────────────────────────────────────────┘
   shared/  utilidades transversales (fechas, formato COP, constantes)
   config/  variables de entorno
```

**Regla de dependencias** (de afuera hacia adentro, nunca al revés):

| Capa | Puede importar | Nunca importa |
|---|---|---|
| `domain` | `shared` | React, Supabase, `application`, `infrastructure` |
| `application` | `domain`, `shared` | React, Supabase |
| `infrastructure` | `application/ports`, `domain`, `shared`, `config` | `presentation` |
| `presentation` | todas (vía `container` para infraestructura) | `@supabase/supabase-js` directamente |

## Estructura

```
src/
  domain/
    entities/index.ts        Product, Sale, CarteraEntry, Salida… (tipos del negocio)
    rules/finance.ts         unitPrice, saleTotal, planPreview, computeCuotas, allocate, buildCarRows…
  application/
    ports/repositories.ts    interfaces: ProductRepository, SaleRepository, CarteraRepository…
    use-cases/               registerSale, registerPayment, applyPaymentPlan, registerLoan,
                             transferStock, adjustStock, loadAppData…
  infrastructure/
    supabase/client.ts       cliente único + traducción de errores de Postgres
    supabase/mappers.ts      fila BD ⇄ entidad de dominio
    supabase/repositories/   una clase por puerto (usa tablas, vistas y RPC)
    local/seed/              datos simulados (modo demo)
    container.ts             composition root: elige la implementación
  presentation/
    App.tsx, pages/, components/, features/<módulo>/{components,hooks,services}, store/, lib/selectors.ts
  shared/lib/                dates.ts, format.ts, constants.ts
  config/env.ts              VITE_DATA_SOURCE, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
supabase/
  migrations/                esquema SQL versionado
  seed.sql                   datos iniciales
```

## Flujo de una operación (ejemplo: venta a crédito)

```
SaleDrawer (presentation)
   └─ useSaleActions().save(draft)                    hook
        └─ registerSale(repos, input)                 application/use-cases/ventas.ts
             ├─ saleTotal(), planPreview()            domain/rules/finance.ts   (cálculo puro)
             └─ repos.sales.register(cmd)             puerto SaleRepository
                  └─ SupabaseSales.register           infrastructure
                       └─ rpc('registrar_venta')      PostgreSQL: venta + ítems + kardex + cartera
                                                      en UNA transacción (todo o nada)
```

Por qué así:
- **Reglas en el dominio**: el cálculo de cuotas o del reparto de un abono se prueba sin base de datos ni React.
- **Atomicidad en la BD**: lo que toca varias tablas (venta + stock + cartera) va en una función SQL; si algo falla no queda nada a medias.
- **Puertos**: se puede cambiar Supabase por otra base o una API propia escribiendo otra implementación de `Repositories`, sin tocar la UI ni los casos de uso.

## Modos de datos

`.env.local` (ver `.env.example`):

| `VITE_DATA_SOURCE` | Qué pasa |
|---|---|
| `local` (por defecto) | La app funciona como antes: `AppStore` + `localStorage` + `features/*/services`. |
| `supabase` | `getRepositories()` entrega los repositorios de Supabase para los casos de uso. |

## Estado de la migración y siguiente paso

Hecho:
- Código reorganizado en capas; la app compila y funciona igual en modo `local`.
- Esquema SQL, RPC, vistas, RLS y Storage validados (venta a crédito, pedido automático, abonos por cuota, traslado, préstamo, anulación).
- Puertos, casos de uso clave y repositorios Supabase completos.

Módulo **Usuarios** (primer módulo hecho 100 % con la arquitectura nueva):
- `domain/rules/permisos.ts` (catálogo de permisos y reglas) → `application/use-cases/usuarios.ts` → puertos `application/ports/acceso.ts`.
- Implementaciones: `infrastructure/local/accessRepository.ts` (demo) y `infrastructure/supabase/repositories/access.ts` (tablas + RPC `guardar_rol` + Edge Function `admin-usuarios`).
- UI: `presentation/features/usuarios`. Sirve de plantilla para migrar los demás módulos.

**Login y cierre de sesión**:
- Puerto `application/ports/auth.ts` → casos de uso `application/use-cases/auth.ts` (`iniciarSesion`, `cerrarSesion`).
- Supabase: `signInWithPassword` + RPC `registrar_acceso()` (marca último acceso y devuelve rol y permisos). Demo: hash SHA-256 en `localStorage`.
- `presentation/store/SessionStore.tsx` expone `sesion` y `can(permiso)`. `App.tsx` muestra el login si no hay sesión, protege cada ruta con su permiso `<módulo>.ver` y el menú lateral/inferior solo muestra los módulos permitidos.
- Botones dentro de los módulos: hoy solo el módulo Usuarios los oculta según permisos; en los demás se agrega `can('<módulo>.crear')` etc. al migrarlos (la base de datos ya los bloquea de todos modos).

Pendiente — conectar la UI a Supabase módulo por módulo:
1. Agregar **TanStack Query** (`@tanstack/react-query`) para caché, carga y refresco de datos remotos.
2. En cada `features/<módulo>/hooks`, cuando `isRemote()`:
   ```ts
   const repos = getRepositories()
   const { data } = useQuery({ queryKey: ['ventas'], queryFn: () => repos.sales.list() })
   const save = useMutation({
     mutationFn: (input: RegisterSaleInput) => registerSale(repos, input),
     onSuccess: r => { r.ok ? toast(r.msg ?? '') : toast(r.error); qc.invalidateQueries() },
   })
   ```
   Los componentes no cambian: siguen recibiendo las mismas entidades del dominio.
3. Cuando todos los módulos migren, `features/*/services` (lógica en memoria) y `infrastructure/local` se pueden retirar o dejar solo como modo demo.
4. Para crecer: paginar listados (`.range()`), mover reportes pesados a vistas materializadas, y si se abren más tiendas, agregar `tienda_id` + RLS por tienda.
