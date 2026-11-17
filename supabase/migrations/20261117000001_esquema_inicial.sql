-- =====================================================================
--  ZAHO · Inventario — Esquema inicial (MER) para Supabase / PostgreSQL
--  Ejecutar completo en: Supabase → SQL Editor  (o `supabase db push`)
--
--  Contenido
--   0. Extensiones y esquema auxiliar
--   1. Tipos (enums)
--   2. Seguridad: perfiles y roles
--   3. Catálogos (marcas, categorías, bodegas, métodos de pago, config)
--   4. Maestros (clientes, comerciales, proveedores)
--   5. Inventario (productos, existencias, movimientos)
--   6. Ventas
--   7. Salidas de dinero
--   8. Cartera (cuentas por cobrar, planes, cuotas, abonos, gestiones)
--   9. Pedidos a proveedores
--  10. Triggers (updated_at, stock, pedidos automáticos)
--  11. Vistas de lectura (security_invoker)
--  12. Funciones RPC transaccionales
--  13. Row Level Security
--  14. Storage (comprobantes)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Extensiones y esquema auxiliar
-- ---------------------------------------------------------------------
-- gen_random_uuid() es nativo desde PostgreSQL 13 (no requiere pgcrypto)
create schema if not exists app;                   -- funciones internas (no expuestas por la API)

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.forma_pago         as enum ('contado', 'credito');
create type public.frecuencia_pago    as enum ('semanal', 'quincenal', 'mensual');
create type public.tipo_cuenta        as enum ('venta', 'prestamo', 'manual');
create type public.tipo_salida        as enum ('compra', 'transporte', 'operativo', 'prestamo', 'comerciales', 'otro');
create type public.estado_pedido      as enum ('enviado', 'confirmado', 'recibido');
create type public.tipo_movimiento    as enum (
  'inicial', 'venta', 'anulacion_venta', 'ajuste', 'traslado_salida', 'traslado_entrada', 'recepcion_pedido'
);
create type public.clave_plantilla    as enum ('recordatorio', 'vencida', 'gracias', 'prestamo');

-- ---------------------------------------------------------------------
-- 2. Seguridad: roles, permisos y perfiles de usuario
--    permiso = módulo + acción (ej. 'ventas.crear')
--    rol     = conjunto de permisos (creado y editado desde la app)
--    perfil  = usuario de Supabase Auth + su rol
-- ---------------------------------------------------------------------
create table public.permisos (
  clave        text primary key check (clave ~ '^[a-z_]+\.[a-z_]+$'),
  modulo       text not null,
  accion       text not null,
  descripcion  text not null,
  orden        smallint not null default 0,
  unique (modulo, accion)
);
comment on table public.permisos is 'Catálogo fijo: lo define el código de la app, no se edita desde la UI.';

create table public.roles (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  descripcion  text,
  es_admin     boolean not null default false,   -- acceso total; no depende de rol_permisos
  es_sistema   boolean not null default false,   -- no se puede borrar ni renombrar
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index roles_nombre_uq on public.roles (lower(trim(nombre)));
create unique index roles_un_admin_uq on public.roles (es_admin) where es_admin;

create table public.rol_permisos (
  rol_id   uuid not null references public.roles (id) on delete cascade,
  permiso  text not null references public.permisos (clave) on delete cascade,
  primary key (rol_id, permiso)
);

create table public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  nombre        text not null,
  email         text,
  telefono      text,
  rol_id        uuid references public.roles (id) on delete restrict,
  comercial_id  uuid,                                  -- FK se agrega tras crear comerciales
  activo        boolean not null default true,
  ultimo_acceso timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index perfiles_rol_idx on public.perfiles (rol_id);
comment on table public.perfiles is 'Usuarios de la app. Se crea automáticamente al crear el usuario en Supabase Auth.';

-- Catálogo de permisos: módulo × acción
insert into public.permisos (clave, modulo, accion, descripcion, orden)
select m.modulo || '.' || a.accion, m.modulo, a.accion,
       initcap(a.accion) || ' · ' || m.etiqueta, m.orden * 10 + a.orden
  from (values ('ventas','Ventas',1), ('clientes','Clientes',2), ('inventario','Inventario',3), ('cartera','Cartera',4),
               ('proveedores','Proveedores y pedidos',5), ('salidas','Salidas de dinero',6), ('comerciales','Comerciales',7),
               ('reportes','Reportes',8), ('usuarios','Usuarios y roles',9), ('configuracion','Configuración',10)
       ) m(modulo, etiqueta, orden)
 cross join (values ('ver',1), ('crear',2), ('editar',3), ('eliminar',4)) a(accion, orden)
 where not (m.modulo = 'reportes' and a.accion <> 'ver')
   and not (m.modulo = 'configuracion' and a.accion in ('crear','eliminar'));

-- Roles base
insert into public.roles (nombre, descripcion, es_admin, es_sistema) values
  ('Administrador', 'Acceso total a la aplicación', true, true),
  ('Vendedor', 'Registra ventas y clientes, consulta inventario', false, false),
  ('Cobrador', 'Gestiona la cartera: abonos, planes y seguimiento', false, false);

insert into public.rol_permisos (rol_id, permiso)
select r.id, p.clave from public.roles r
  join public.permisos p on p.clave = any (case r.nombre
    when 'Vendedor' then array['ventas.ver','ventas.crear','ventas.editar','clientes.ver','clientes.crear','clientes.editar',
                               'inventario.ver','cartera.ver','cartera.crear','comerciales.ver']
    when 'Cobrador' then array['cartera.ver','cartera.crear','cartera.editar','clientes.ver','clientes.editar','ventas.ver']
  end)
 where not r.es_admin;

-- ---------------------------------------------------------------------
-- 3. Catálogos
-- ---------------------------------------------------------------------
create table public.marcas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.bodegas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  es_punto_venta boolean not null default false,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.metodos_pago (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,
  orden       smallint not null default 0
);

-- Configuración del negocio (una sola fila)
create table public.configuracion (
  id                    boolean primary key default true check (id),   -- fuerza fila única
  nombre_negocio        text not null default 'ZAHO',
  recargo_credito_pct   numeric(5,2) not null default 10 check (recargo_credito_pct >= 0),
  resumen_diario        boolean not null default true,
  hora_resumen          time not null default '08:00',
  max_cuotas            smallint not null default 24 check (max_cuotas between 1 and 120),
  dias_vence_pronto     smallint not null default 3,
  updated_at            timestamptz not null default now()
);

create table public.plantillas_mensaje (
  clave       public.clave_plantilla primary key,
  texto       text not null,
  updated_at  timestamptz not null default now()
);
comment on column public.plantillas_mensaje.texto is 'Variables: {nombre}, ${saldo}, {fecha}';

-- ---------------------------------------------------------------------
-- 4. Maestros
-- ---------------------------------------------------------------------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 0),
  telefono    text,
  documento   text,
  ciudad      text,
  nota        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index clientes_documento_uq on public.clientes (documento) where documento is not null and documento <> '';
create unique index clientes_nombre_uq    on public.clientes (lower(trim(nombre)));
create index clientes_telefono_idx        on public.clientes (telefono);

create table public.comerciales (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  telefono        text,
  comision_pct    numeric(5,2) not null default 0 check (comision_pct between 0 and 100),
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.perfiles
  add constraint perfiles_comercial_fk foreign key (comercial_id) references public.comerciales (id) on delete set null;

create table public.proveedores (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null unique,
  contacto            text,
  whatsapp            text,
  pedido_automatico   boolean not null default false,
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Cada marca la surte un solo proveedor (regla usada por los pedidos automáticos)
create table public.proveedor_marcas (
  proveedor_id  uuid not null references public.proveedores (id) on delete cascade,
  marca_id      uuid not null references public.marcas (id) on delete restrict,
  primary key (proveedor_id, marca_id),
  unique (marca_id)
);

-- ---------------------------------------------------------------------
-- 5. Inventario
--    producto = referencia/SKU (código + talla + color)
--    existencia = stock de ese producto en una bodega
--    movimiento = kardex; el stock se actualiza SOLO por movimientos
-- ---------------------------------------------------------------------
create table public.productos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,
  nombre        text not null,
  marca_id      uuid not null references public.marcas (id) on delete restrict,
  categoria_id  uuid not null references public.categorias (id) on delete restrict,
  talla         text not null,
  color         text not null default '—',
  costo         numeric(14,2) not null default 0 check (costo >= 0),
  precio        numeric(14,2) not null check (precio > 0),
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index productos_marca_idx     on public.productos (marca_id);
create index productos_categoria_idx on public.productos (categoria_id);

create table public.existencias (
  producto_id   uuid not null references public.productos (id) on delete cascade,
  bodega_id     uuid not null references public.bodegas (id) on delete restrict,
  stock         integer not null default 0 check (stock >= 0),
  stock_minimo  integer not null default 0 check (stock_minimo >= 0),
  updated_at    timestamptz not null default now(),
  primary key (producto_id, bodega_id)
);
create index existencias_bajo_minimo_idx on public.existencias (bodega_id) where stock < stock_minimo;

create table public.movimientos_inventario (
  id            bigint generated always as identity primary key,
  producto_id   uuid not null references public.productos (id) on delete cascade,
  bodega_id     uuid not null references public.bodegas (id) on delete restrict,
  tipo          public.tipo_movimiento not null,
  cantidad      integer not null check (cantidad <> 0),        -- + entra, - sale
  motivo        text,
  venta_id      uuid,                                          -- FKs se agregan abajo
  pedido_id     uuid,
  created_by    uuid references public.perfiles (id) default auth.uid(),
  created_at    timestamptz not null default now()
);
create index movimientos_producto_idx on public.movimientos_inventario (producto_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. Ventas
-- ---------------------------------------------------------------------
create sequence public.ventas_numero_seq start 1001;

create table public.ventas (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint not null unique default nextval('public.ventas_numero_seq'),
  codigo          text generated always as ('V-' || numero) stored,
  fecha           date not null default current_date,
  cliente_id      uuid references public.clientes (id) on delete set null,
  cliente_nombre  text not null default 'Cliente mostrador',   -- copia histórica
  telefono        text,
  comercial_id    uuid references public.comerciales (id) on delete set null,
  forma_pago      public.forma_pago not null,
  recargo_pct     numeric(5,2) not null default 0,              -- recargo vigente al vender a crédito
  created_by      uuid references public.perfiles (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ventas_credito_con_cliente check (forma_pago = 'contado' or cliente_id is not null)
);
alter sequence public.ventas_numero_seq owned by public.ventas.numero;
create index ventas_fecha_idx     on public.ventas (fecha desc);
create index ventas_cliente_idx   on public.ventas (cliente_id);
create index ventas_comercial_idx on public.ventas (comercial_id);

create table public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas (id) on delete cascade,
  producto_id     uuid not null references public.productos (id) on delete restrict,
  bodega_id       uuid not null references public.bodegas (id) on delete restrict,
  cantidad        integer not null check (cantidad > 0),
  precio_base     numeric(14,2) not null check (precio_base >= 0),   -- precio de lista
  precio_unitario numeric(14,2) not null check (precio_unitario >= 0), -- con recargo si es crédito
  costo_unitario  numeric(14,2) not null default 0,                  -- costo al momento de vender
  subtotal        numeric(14,2) generated always as (cantidad * precio_unitario) stored
);
create index venta_items_venta_idx    on public.venta_items (venta_id);
create index venta_items_producto_idx on public.venta_items (producto_id);

alter table public.movimientos_inventario
  add constraint movimientos_venta_fk foreign key (venta_id) references public.ventas (id) on delete set null;

-- ---------------------------------------------------------------------
-- 7. Salidas de dinero (gastos y préstamos otorgados)
-- ---------------------------------------------------------------------
create sequence public.salidas_numero_seq start 1;

create table public.salidas (
  id              uuid primary key default gen_random_uuid(),
  numero          bigint not null unique default nextval('public.salidas_numero_seq'),
  codigo          text generated always as ('G-' || lpad(numero::text, 2, '0')) stored,
  fecha           date not null default current_date,
  tipo            public.tipo_salida not null,
  tipo_otro       text,
  descripcion     text not null,
  valor           numeric(14,2) not null check (valor > 0),
  metodo_pago_id  uuid references public.metodos_pago (id) on delete set null,
  beneficiario    text,
  comprobante_path text,                       -- ruta en Storage (bucket comprobantes)
  created_by      uuid references public.perfiles (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter sequence public.salidas_numero_seq owned by public.salidas.numero;
create index salidas_fecha_idx on public.salidas (fecha desc);
create index salidas_tipo_idx  on public.salidas (tipo, fecha);

-- ---------------------------------------------------------------------
-- 8. Cartera
-- ---------------------------------------------------------------------
create sequence public.cuentas_numero_seq start 1;

create table public.cuentas_cobrar (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint not null unique default nextval('public.cuentas_numero_seq'),
  tipo              public.tipo_cuenta not null,
  venta_id          uuid unique references public.ventas (id) on delete cascade,
  salida_id         uuid unique references public.salidas (id) on delete cascade,
  cliente_id        uuid references public.clientes (id) on delete set null,
  cliente_nombre    text not null,
  telefono          text,
  comercial_id      uuid references public.comerciales (id) on delete set null,
  fecha_creacion    date not null default current_date,
  fecha_vencimiento date not null,
  valor_total       numeric(14,2) check (valor_total is null or valor_total > 0),
  concepto          text,
  nota              text,
  metodo_pago_id    uuid references public.metodos_pago (id) on delete set null,
  created_by        uuid references public.perfiles (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- reglas de integridad por tipo de cuenta
  constraint cuentas_venta_ck    check (tipo <> 'venta'    or (venta_id is not null and salida_id is null)),
  constraint cuentas_prestamo_ck check (tipo <> 'prestamo' or (salida_id is not null and venta_id is null and valor_total is not null)),
  constraint cuentas_manual_ck   check (tipo <> 'manual'   or (venta_id is null and salida_id is null and valor_total is not null))
);
alter sequence public.cuentas_numero_seq owned by public.cuentas_cobrar.numero;
create index cuentas_cliente_idx on public.cuentas_cobrar (cliente_id);
create index cuentas_vence_idx   on public.cuentas_cobrar (fecha_vencimiento);
comment on column public.cuentas_cobrar.valor_total is 'Null en cuentas de venta: el total sale de la venta (vista v_cartera).';

-- Plan de pagos: una cuenta puede rehacer su plan; solo uno está vigente
create table public.planes_pago (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references public.cuentas_cobrar (id) on delete cascade,
  frecuencia  public.frecuencia_pago not null,
  vigente     boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index planes_un_vigente_uq on public.planes_pago (cuenta_id) where vigente;

create table public.cuotas (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references public.planes_pago (id) on delete cascade,
  numero            smallint not null check (numero > 0),
  fecha_vencimiento date not null,
  valor             numeric(14,2) not null check (valor > 0),
  unique (plan_id, numero)
);

create table public.abonos (
  id              uuid primary key default gen_random_uuid(),
  cuenta_id       uuid not null references public.cuentas_cobrar (id) on delete cascade,
  plan_id         uuid references public.planes_pago (id) on delete set null, -- plan vigente al abonar (null = antes del plan)
  fecha           date not null default current_date,
  valor           numeric(14,2) not null check (valor > 0),
  etiqueta        text not null default 'Abono',
  metodo_pago_id  uuid references public.metodos_pago (id) on delete set null,
  created_by      uuid references public.perfiles (id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index abonos_cuenta_idx on public.abonos (cuenta_id, fecha);
create index abonos_fecha_idx  on public.abonos (fecha);

-- Cómo se repartió cada abono entre las cuotas (abono manual o automático)
create table public.abono_aplicaciones (
  abono_id  uuid not null references public.abonos (id) on delete cascade,
  cuota_id  uuid not null references public.cuotas (id) on delete cascade,
  valor     numeric(14,2) not null check (valor > 0),
  primary key (abono_id, cuota_id)
);

create table public.gestiones_cobro (
  id              uuid primary key default gen_random_uuid(),
  cuenta_id       uuid not null references public.cuentas_cobrar (id) on delete cascade,
  fecha           date not null default current_date,
  tipo            text not null,            -- Venta, Plan, Registro, Préstamo, Llamada, WhatsApp, Visita…
  nota            text not null default '',
  fecha_promesa   date,
  created_by      uuid references public.perfiles (id) default auth.uid(),
  created_at      timestamptz not null default now()
);
create index gestiones_cuenta_idx  on public.gestiones_cobro (cuenta_id, created_at);
create index gestiones_promesa_idx on public.gestiones_cobro (fecha_promesa) where fecha_promesa is not null;

-- ---------------------------------------------------------------------
-- 9. Pedidos a proveedores
-- ---------------------------------------------------------------------
create sequence public.pedidos_numero_seq start 101;

create table public.pedidos (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint not null unique default nextval('public.pedidos_numero_seq'),
  codigo            text generated always as ('O-' || numero) stored,
  fecha             date not null default current_date,
  proveedor_id      uuid not null references public.proveedores (id) on delete restrict,
  bodega_destino_id uuid not null references public.bodegas (id) on delete restrict,
  estado            public.estado_pedido not null default 'enviado',
  automatico        boolean not null default false,
  fecha_confirmado  timestamptz,
  fecha_recibido    timestamptz,
  created_by        uuid references public.perfiles (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter sequence public.pedidos_numero_seq owned by public.pedidos.numero;
create index pedidos_estado_idx on public.pedidos (estado) where estado <> 'recibido';

create table public.pedido_items (
  pedido_id   uuid not null references public.pedidos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad    integer not null check (cantidad > 0),
  primary key (pedido_id, producto_id)
);

alter table public.movimientos_inventario
  add constraint movimientos_pedido_fk foreign key (pedido_id) references public.pedidos (id) on delete set null;

-- =====================================================================
-- 10. Triggers
-- =====================================================================

-- updated_at automático
create or replace function app.tg_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfiles','roles','configuracion','plantillas_mensaje','clientes','comerciales','proveedores',
                           'productos','existencias','ventas','salidas','cuentas_cobrar','pedidos']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function app.tg_set_updated_at()',
                   'tg_' || t || '_updated_at', t);
  end loop;
end $$;

/*
  Perfil automático al crear un usuario en Auth.
  · El PRIMER usuario queda como Administrador.
  · Los demás toman el rol de raw_APP_meta_data.rol_id, que solo puede escribir
    la service key (Edge Function admin-usuarios). Nunca se lee el rol de
    user_metadata porque ese lo controla quien se registra.
  · Sin rol asignado el perfil queda inactivo (registro público = sin acceso).
*/
create or replace function app.tg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_primero boolean := not exists (select 1 from public.perfiles);
  v_rol     uuid;
begin
  if v_primero then
    select id into v_rol from public.roles where es_admin;
  else
    select id into v_rol from public.roles where id = nullif(new.raw_app_meta_data ->> 'rol_id', '')::uuid;
  end if;

  insert into public.perfiles (id, nombre, email, telefono, rol_id, comercial_id, activo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'telefono', ''),
    v_rol,
    nullif(new.raw_app_meta_data ->> 'comercial_id', '')::uuid,
    v_rol is not null
  );
  return new;
end $$;

-- Guardas: siempre debe quedar al menos un administrador activo
create or replace function app.tg_proteger_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.perfiles p join public.roles r on r.id = p.rol_id
                  where p.activo and r.es_admin) then
    raise exception 'Debe quedar al menos un administrador activo';
  end if;
  return null;
end $$;

create constraint trigger tg_perfiles_admin
  after update of rol_id, activo or delete on public.perfiles
  deferrable initially deferred
  for each row execute function app.tg_proteger_admin();

-- Los roles de sistema no se borran ni pierden su condición
create or replace function app.tg_proteger_rol() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.es_sistema then raise exception 'El rol % es del sistema y no se puede eliminar', old.nombre; end if;
    if exists (select 1 from public.perfiles where rol_id = old.id) then
      raise exception 'El rol % tiene usuarios asignados. Cámbialos de rol primero', old.nombre;
    end if;
    return old;
  end if;
  if old.es_sistema and (new.nombre <> old.nombre or new.es_admin <> old.es_admin or not new.es_sistema) then
    raise exception 'El rol % es del sistema y no se puede modificar', old.nombre;
  end if;
  if new.es_admin and not old.es_admin then raise exception 'Solo existe un rol administrador'; end if;
  return new;
end $$;

create trigger tg_roles_proteger
  before update or delete on public.roles
  for each row execute function app.tg_proteger_rol();

create trigger tg_auth_nuevo_usuario
  after insert on auth.users
  for each row execute function app.tg_nuevo_usuario();

-- Kardex → existencias: cada movimiento ajusta el stock de su bodega
create or replace function app.tg_aplicar_movimiento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.existencias (producto_id, bodega_id, stock)
  values (new.producto_id, new.bodega_id, 0)
  on conflict (producto_id, bodega_id) do nothing;

  update public.existencias
     set stock = stock + new.cantidad
   where producto_id = new.producto_id and bodega_id = new.bodega_id;
  -- el CHECK (stock >= 0) aborta la transacción si no hay stock suficiente
  return new;
end $$;

create trigger tg_movimiento_stock
  after insert on public.movimientos_inventario
  for each row execute function app.tg_aplicar_movimiento();

-- Pedido automático: si el stock cruza el mínimo y el proveedor de la marca está en automático
create or replace function app.tg_pedido_automatico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prov    uuid;
  v_pedido  uuid;
  v_cruza   boolean;
begin
  v_cruza := new.stock < new.stock_minimo
             and (old.stock >= old.stock_minimo or (new.stock <= 0 and old.stock > 0));
  if not v_cruza then return new; end if;

  select pm.proveedor_id into v_prov
    from public.productos p
    join public.proveedor_marcas pm on pm.marca_id = p.marca_id
    join public.proveedores pr on pr.id = pm.proveedor_id and pr.pedido_automatico and pr.activo
   where p.id = new.producto_id;
  if v_prov is null then return new; end if;

  -- ya está en un pedido abierto
  if exists (select 1 from public.pedido_items pi join public.pedidos pe on pe.id = pi.pedido_id
              where pi.producto_id = new.producto_id and pe.estado <> 'recibido') then
    return new;
  end if;

  insert into public.pedidos (proveedor_id, bodega_destino_id, automatico)
  values (v_prov, new.bodega_id, true) returning id into v_pedido;

  insert into public.pedido_items (pedido_id, producto_id, cantidad)
  values (v_pedido, new.producto_id, greatest(new.stock_minimo * 2 - new.stock, 1));
  return new;
end $$;

create trigger tg_existencias_pedido_auto
  after update of stock, stock_minimo on public.existencias
  for each row execute function app.tg_pedido_automatico();

-- =====================================================================
-- 11. Vistas (security_invoker = respetan RLS del usuario)
-- =====================================================================

-- Inventario plano: una fila por producto y bodega (equivale al tipo Product del front)
create or replace view public.v_inventario with (security_invoker = true) as
select
  p.id            as producto_id,
  e.bodega_id,
  p.codigo,
  m.nombre        as marca,
  p.nombre,
  c.nombre        as categoria,
  p.talla,
  p.color,
  b.nombre        as bodega,
  e.stock,
  e.stock_minimo,
  p.costo,
  p.precio,
  case when e.stock <= 0 then 'agotado'
       when e.stock < e.stock_minimo then 'bajo'
       else 'disponible' end as estado
from public.existencias e
join public.productos  p on p.id = e.producto_id
join public.marcas     m on m.id = p.marca_id
join public.categorias c on c.id = p.categoria_id
join public.bodegas    b on b.id = e.bodega_id
where p.activo;

-- Ventas con totales, costo y utilidad
create or replace view public.v_ventas as
select
  v.*,
  coalesce(sum(i.subtotal), 0)                                  as total,
  coalesce(sum(i.cantidad * i.precio_base), 0)                  as total_base,
  coalesce(sum(i.cantidad * i.costo_unitario), 0)               as costo,
  coalesce(sum(i.subtotal - i.cantidad * i.costo_unitario), 0)  as utilidad,
  coalesce(sum(i.cantidad), 0)                                  as unidades
from public.ventas v
left join public.venta_items i on i.venta_id = v.id
group by v.id;
alter view public.v_ventas set (security_invoker = true);

-- Cartera con total, pagado, saldo y estado
create or replace view public.v_cartera with (security_invoker = true) as
with tot as (
  select cc.id,
         coalesce(cc.valor_total, (select sum(i.subtotal) from public.venta_items i where i.venta_id = cc.venta_id), 0) as total
    from public.cuentas_cobrar cc
), pag as (
  select cuenta_id, sum(valor) as pagado, max(fecha) as ultimo_abono
    from public.abonos group by cuenta_id
), prox as (
  -- próxima cuota con saldo del plan vigente
  select distinct on (pp.cuenta_id) pp.cuenta_id, cu.fecha_vencimiento
    from public.planes_pago pp
    join public.cuotas cu on cu.plan_id = pp.id
    left join lateral (select coalesce(sum(aa.valor), 0) as aplicado
                         from public.abono_aplicaciones aa where aa.cuota_id = cu.id) ap on true
   where pp.vigente and ap.aplicado < cu.valor
   order by pp.cuenta_id, cu.numero
)
select
  cc.*,
  t.total,
  coalesce(p.pagado, 0)                                    as pagado,
  greatest(t.total - coalesce(p.pagado, 0), 0)             as saldo,
  p.ultimo_abono,
  coalesce(px.fecha_vencimiento, cc.fecha_vencimiento)     as vence_ref,
  coalesce(px.fecha_vencimiento, cc.fecha_vencimiento) - current_date as dias,
  case
    when t.total - coalesce(p.pagado, 0) <= 0 then 'pagada'
    when coalesce(px.fecha_vencimiento, cc.fecha_vencimiento) < current_date then 'vencida'
    when coalesce(px.fecha_vencimiento, cc.fecha_vencimiento) - current_date <= 3 then 'vence_pronto'
    else 'al_dia'
  end                                                      as estado,
  case when t.total > 0 then least(100, round(coalesce(p.pagado, 0) * 100 / t.total)) else 0 end as pct_pagado
from public.cuentas_cobrar cc
join tot t on t.id = cc.id
left join pag p  on p.cuenta_id  = cc.id
left join prox px on px.cuenta_id = cc.id;

-- Flujo de caja: ingresos (ventas de contado + abonos) y egresos (salidas)
create or replace view public.v_flujo_caja with (security_invoker = true) as
select v.fecha, 'ingreso'::text as sentido, 'venta_contado'::text as concepto, v.total as valor, v.id as origen_id
  from public.v_ventas v where v.forma_pago = 'contado'
union all
select a.fecha, 'ingreso', case when cc.tipo = 'prestamo' then 'prestamo_recuperado' else 'abono_cliente' end, a.valor, a.id
  from public.abonos a join public.cuentas_cobrar cc on cc.id = a.cuenta_id
union all
select s.fecha, 'egreso', s.tipo::text, s.valor, s.id
  from public.salidas s;

-- =====================================================================
-- 12. Funciones RPC (transaccionales). El front llama: supabase.rpc('nombre', {...})
-- =====================================================================

-- Helpers de permisos -------------------------------------------------
-- ¿El usuario actual tiene perfil activo con rol?
create or replace function app.es_miembro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and activo and rol_id is not null)
$$;

-- ¿Tiene AL MENOS UNO de estos permisos? (el rol administrador los tiene todos)
create or replace function app.tiene_permiso(variadic p_claves text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles pf
      join public.roles r on r.id = pf.rol_id
     where pf.id = auth.uid() and pf.activo
       and (r.es_admin or exists (select 1 from public.rol_permisos rp where rp.rol_id = r.id and rp.permiso = any (p_claves)))
  )
$$;

-- Lanza error si no tiene el permiso (para usar al inicio de las RPC)
create or replace function app.exigir(p_clave text) returns void
language plpgsql stable as $$
begin
  if not app.tiene_permiso(p_clave) then
    raise exception 'No tienes permiso para esta acción (%)', p_clave using errcode = '42501';
  end if;
end $$;

-- Para el front: perfil + permisos efectivos del usuario conectado
create or replace function public.mi_sesion() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', pf.id, 'nombre', pf.nombre, 'email', pf.email, 'activo', pf.activo,
    'rol', jsonb_build_object('id', r.id, 'nombre', r.nombre, 'es_admin', r.es_admin),
    'permisos', case when r.es_admin then (select jsonb_agg(clave order by orden) from public.permisos)
                     else coalesce((select jsonb_agg(permiso) from public.rol_permisos where rol_id = r.id), '[]'::jsonb) end
  )
  from public.perfiles pf left join public.roles r on r.id = pf.rol_id
  where pf.id = auth.uid()
$$;

-- Al iniciar sesión: marca el último acceso y devuelve la sesión
create or replace function public.registrar_acceso() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles set ultimo_acceso = now() where id = auth.uid() and activo;
  return public.mi_sesion();
end $$;

-- Guarda un rol y su lista de permisos en una sola transacción
create or replace function public.guardar_rol(p_id uuid, p_nombre text, p_descripcion text, p_permisos text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid := p_id; v_admin boolean;
begin
  perform app.exigir(case when p_id is null then 'usuarios.crear' else 'usuarios.editar' end);
  if coalesce(trim(p_nombre), '') = '' then raise exception 'Escribe el nombre del rol'; end if;
  if p_id is not null and p_id = (select rol_id from public.perfiles where id = auth.uid())
     and not exists (select 1 from public.roles where id = p_id and es_admin) then
    raise exception 'No puedes modificar los permisos de tu propio rol';
  end if;
  if exists (select 1 from unnest(p_permisos) x where x not in (select clave from public.permisos)) then
    raise exception 'Hay permisos que no existen';
  end if;
  if v_id is null then
    insert into public.roles (nombre, descripcion) values (trim(p_nombre), p_descripcion) returning id into v_id;
  else
    update public.roles set nombre = trim(p_nombre), descripcion = p_descripcion where id = v_id returning es_admin into v_admin;
    if not found then raise exception 'Rol no encontrado'; end if;
  end if;
  if coalesce(v_admin, false) then return v_id; end if;   -- el administrador no usa lista de permisos
  delete from public.rol_permisos where rol_id = v_id;
  insert into public.rol_permisos (rol_id, permiso) select v_id, unnest(p_permisos);
  return v_id;
end $$;

-- Inserta plan y cuotas desde JSON: [{"numero":1,"fecha_vencimiento":"2026-12-01","valor":50000}, ...]
create or replace function app.crear_plan(p_cuenta uuid, p_frecuencia public.frecuencia_pago, p_cuotas jsonb)
returns uuid language plpgsql as $$
declare v_plan uuid;
begin
  update public.planes_pago set vigente = false where cuenta_id = p_cuenta and vigente;
  insert into public.planes_pago (cuenta_id, frecuencia) values (p_cuenta, p_frecuencia) returning id into v_plan;
  insert into public.cuotas (plan_id, numero, fecha_vencimiento, valor)
  select v_plan, (q ->> 'numero')::smallint, (q ->> 'fecha_vencimiento')::date, (q ->> 'valor')::numeric
    from jsonb_array_elements(p_cuotas) q;
  update public.cuentas_cobrar
     set fecha_vencimiento = (select max(fecha_vencimiento) from public.cuotas where plan_id = v_plan)
   where id = p_cuenta;
  return v_plan;
end $$;

/*
  registrar_venta
  p_venta = {
    "cliente_id": uuid|null, "cliente_nombre": text, "telefono": text, "comercial_id": uuid|null,
    "forma_pago": "contado"|"credito",
    "items": [{"producto_id": uuid, "bodega_id": uuid, "cantidad": int}],
    -- solo crédito:
    "fecha_vencimiento": date, "abono_inicial": numeric, "metodo_pago_id": uuid|null,
    "plan": {"frecuencia": "mensual", "cuotas": [...]} | null
  }
*/
create or replace function public.registrar_venta(p_venta jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_rec     numeric := 0;
  v_pago    public.forma_pago := (p_venta ->> 'forma_pago')::public.forma_pago;
  v_cuenta  uuid;
  v_total   numeric;
  v_abono   numeric := coalesce((p_venta ->> 'abono_inicial')::numeric, 0);
  v_plan    uuid;
  it        jsonb;
begin
  perform app.exigir('ventas.crear');
  if jsonb_array_length(coalesce(p_venta -> 'items', '[]')) = 0 then raise exception 'Agrega al menos un producto'; end if;

  if v_pago = 'credito' then
    select recargo_credito_pct into v_rec from public.configuracion;
  end if;

  insert into public.ventas (cliente_id, cliente_nombre, telefono, comercial_id, forma_pago, recargo_pct)
  values ((p_venta ->> 'cliente_id')::uuid,
          coalesce(nullif(trim(p_venta ->> 'cliente_nombre'), ''), 'Cliente mostrador'),
          p_venta ->> 'telefono',
          (p_venta ->> 'comercial_id')::uuid,
          v_pago, v_rec)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p_venta -> 'items') loop
    if coalesce((select e.stock from public.existencias e
                  where e.producto_id = (it ->> 'producto_id')::uuid and e.bodega_id = (it ->> 'bodega_id')::uuid), 0) < (it ->> 'cantidad')::int then
      raise exception 'No hay stock suficiente de %',
        (select nombre || ' T' || talla from public.productos where id = (it ->> 'producto_id')::uuid);
    end if;

    insert into public.venta_items (venta_id, producto_id, bodega_id, cantidad, precio_base, precio_unitario, costo_unitario)
    select v_id, p.id, (it ->> 'bodega_id')::uuid, (it ->> 'cantidad')::int, p.precio,
           case when v_rec > 0 then round(p.precio * (1 + v_rec / 100) / 100) * 100 else p.precio end,
           p.costo
      from public.productos p where p.id = (it ->> 'producto_id')::uuid;

    insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, venta_id)
    values ((it ->> 'producto_id')::uuid, (it ->> 'bodega_id')::uuid, 'venta', -(it ->> 'cantidad')::int, v_id);
  end loop;

  if v_pago = 'credito' then
    select sum(subtotal) into v_total from public.venta_items where venta_id = v_id;
    v_abono := least(v_abono, v_total);

    insert into public.cuentas_cobrar (tipo, venta_id, cliente_id, cliente_nombre, telefono, comercial_id, fecha_vencimiento)
    select 'venta', v.id, v.cliente_id, v.cliente_nombre, v.telefono, v.comercial_id,
           coalesce((p_venta ->> 'fecha_vencimiento')::date, current_date + 30)
      from public.ventas v where v.id = v_id
    returning id into v_cuenta;

    if v_abono > 0 then
      insert into public.abonos (cuenta_id, valor, etiqueta, metodo_pago_id)
      values (v_cuenta, v_abono, 'Abono inicial', (p_venta ->> 'metodo_pago_id')::uuid);
    end if;

    if p_venta -> 'plan' is not null and jsonb_typeof(p_venta -> 'plan') = 'object' then
      v_plan := app.crear_plan(v_cuenta, (p_venta -> 'plan' ->> 'frecuencia')::public.frecuencia_pago, p_venta -> 'plan' -> 'cuotas');
    end if;

    insert into public.gestiones_cobro (cuenta_id, tipo, nota)
    values (v_cuenta, 'Venta', 'Venta a crédito');
  end if;

  return v_id;
end $$;

-- Anula una venta: devuelve el stock y elimina la venta (cascade a items y cartera)
create or replace function public.anular_venta(p_venta uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform app.exigir('ventas.eliminar');
  insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, motivo)
  select producto_id, bodega_id, 'anulacion_venta', cantidad, 'Anulación venta ' || (select codigo from public.ventas where id = p_venta)
    from public.venta_items where venta_id = p_venta;
  delete from public.ventas where id = p_venta;
end $$;

/*
  registrar_abono
  p_aplicaciones = [{"cuota_id": uuid, "valor": numeric}]  (calculado en la capa de dominio; [] si no hay plan)
*/
create or replace function public.registrar_abono(
  p_cuenta uuid, p_valor numeric, p_metodo uuid, p_aplicaciones jsonb default '[]'::jsonb, p_etiqueta text default 'Abono'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_abono uuid; v_saldo numeric; v_plan uuid;
begin
  perform app.exigir('cartera.crear');
  select saldo into v_saldo from public.v_cartera where id = p_cuenta;
  if v_saldo is null then raise exception 'Cuenta no encontrada'; end if;
  if p_valor <= 0 then raise exception 'Escribe el valor del abono'; end if;
  if p_valor > v_saldo then raise exception 'El abono supera el saldo (%)', v_saldo; end if;

  select id into v_plan from public.planes_pago where cuenta_id = p_cuenta and vigente;

  insert into public.abonos (cuenta_id, plan_id, valor, metodo_pago_id, etiqueta)
  values (p_cuenta, v_plan, p_valor, p_metodo, p_etiqueta) returning id into v_abono;

  insert into public.abono_aplicaciones (abono_id, cuota_id, valor)
  select v_abono, (a ->> 'cuota_id')::uuid, (a ->> 'valor')::numeric
    from jsonb_array_elements(p_aplicaciones) a
   where (a ->> 'valor')::numeric > 0;

  return v_abono;
end $$;

create or replace function public.aplicar_plan(p_cuenta uuid, p_frecuencia public.frecuencia_pago, p_cuotas jsonb, p_nota text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_plan uuid;
begin
  perform app.exigir('cartera.editar');
  v_plan := app.crear_plan(p_cuenta, p_frecuencia, p_cuotas);
  insert into public.gestiones_cobro (cuenta_id, tipo, nota) values (p_cuenta, 'Plan', coalesce(p_nota, 'Plan de pagos'));
  return v_plan;
end $$;

/*
  registrar_prestamo: crea la salida de dinero + su cuenta por cobrar
*/
create or replace function public.registrar_prestamo(
  p_beneficiario text, p_telefono text, p_valor numeric, p_metodo uuid, p_fecha date,
  p_vence date, p_nota text default null, p_plan jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_salida uuid; v_cuenta uuid;
begin
  perform app.exigir('salidas.crear');
  insert into public.salidas (fecha, tipo, descripcion, valor, metodo_pago_id, beneficiario)
  values (p_fecha, 'prestamo', 'Préstamo a ' || trim(p_beneficiario) || coalesce(' · ' || nullif(trim(p_nota), ''), ''),
          p_valor, p_metodo, trim(p_beneficiario))
  returning id into v_salida;

  insert into public.cuentas_cobrar (tipo, salida_id, cliente_nombre, telefono, fecha_creacion, fecha_vencimiento,
                                     valor_total, concepto, nota, metodo_pago_id)
  values ('prestamo', v_salida, trim(p_beneficiario), p_telefono, p_fecha, p_vence, p_valor,
          'Préstamo', p_nota, p_metodo)
  returning id into v_cuenta;

  if p_plan is not null then
    perform app.crear_plan(v_cuenta, (p_plan ->> 'frecuencia')::public.frecuencia_pago, p_plan -> 'cuotas');
  end if;

  insert into public.gestiones_cobro (cuenta_id, fecha, tipo, nota) values (v_cuenta, p_fecha, 'Préstamo', 'Préstamo entregado');
  return v_cuenta;
end $$;

/*
  registrar_cuenta_manual: deuda que no viene de una venta del sistema
  p = { "cliente_id", "cliente_nombre", "telefono", "comercial_id", "valor_total", "concepto", "nota",
        "fecha", "fecha_vencimiento", "abono_inicial", "metodo_pago_id", "plan": {"frecuencia","cuotas"} | null }
*/
create or replace function public.registrar_cuenta_manual(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cuenta uuid; v_total numeric := (p ->> 'valor_total')::numeric; v_abono numeric;
begin
  perform app.exigir('cartera.crear');
  v_abono := least(coalesce((p ->> 'abono_inicial')::numeric, 0), v_total);
  insert into public.cuentas_cobrar (tipo, cliente_id, cliente_nombre, telefono, comercial_id, fecha_creacion,
                                     fecha_vencimiento, valor_total, concepto, nota, metodo_pago_id)
  values ('manual', (p ->> 'cliente_id')::uuid, trim(p ->> 'cliente_nombre'), p ->> 'telefono', (p ->> 'comercial_id')::uuid,
          coalesce((p ->> 'fecha')::date, current_date), (p ->> 'fecha_vencimiento')::date, v_total,
          coalesce(nullif(trim(p ->> 'concepto'), ''), 'Cuenta por cobrar'), p ->> 'nota', (p ->> 'metodo_pago_id')::uuid)
  returning id into v_cuenta;
  if v_abono > 0 then
    insert into public.abonos (cuenta_id, fecha, valor, etiqueta, metodo_pago_id)
    values (v_cuenta, coalesce((p ->> 'fecha')::date, current_date), v_abono, 'Abono inicial', (p ->> 'metodo_pago_id')::uuid);
  end if;
  if jsonb_typeof(p -> 'plan') = 'object' then
    perform app.crear_plan(v_cuenta, (p -> 'plan' ->> 'frecuencia')::public.frecuencia_pago, p -> 'plan' -> 'cuotas');
  end if;
  insert into public.gestiones_cobro (cuenta_id, fecha, tipo, nota)
  values (v_cuenta, coalesce((p ->> 'fecha')::date, current_date), 'Registro', coalesce(nullif(trim(p ->> 'concepto'), ''), 'Cuenta por cobrar'));
  return v_cuenta;
end $$;

-- Ajuste de inventario a una cantidad absoluta (conteo físico, avería, pérdida…)
create or replace function public.ajustar_stock(p_producto uuid, p_bodega uuid, p_nuevo_stock int, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_actual int;
begin
  perform app.exigir('inventario.editar');
  select stock into v_actual from public.existencias where producto_id = p_producto and bodega_id = p_bodega for update;
  if coalesce(v_actual, 0) = p_nuevo_stock then return; end if;
  insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, motivo)
  values (p_producto, p_bodega, 'ajuste', p_nuevo_stock - coalesce(v_actual, 0), p_motivo);
end $$;

create or replace function public.trasladar_stock(p_producto uuid, p_desde uuid, p_hasta uuid, p_cantidad int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform app.exigir('inventario.editar');
  if p_desde = p_hasta then raise exception 'Las bodegas deben ser distintas'; end if;
  insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, motivo)
  values (p_producto, p_desde, 'traslado_salida', -p_cantidad, 'Traslado'),
         (p_producto, p_hasta, 'traslado_entrada', p_cantidad, 'Traslado');
end $$;

-- Avanza el pedido: enviado → confirmado → recibido (al recibir suma el stock)
create or replace function public.avanzar_pedido(p_pedido uuid)
returns public.estado_pedido language plpgsql security definer set search_path = public as $$
declare v public.pedidos%rowtype;
begin
  perform app.exigir('proveedores.editar');
  select * into v from public.pedidos where id = p_pedido for update;
  if v.estado = 'enviado' then
    update public.pedidos set estado = 'confirmado', fecha_confirmado = now() where id = p_pedido;
    return 'confirmado';
  elsif v.estado = 'confirmado' then
    insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, pedido_id, motivo)
    select producto_id, v.bodega_destino_id, 'recepcion_pedido', cantidad, p_pedido, 'Pedido ' || v.codigo
      from public.pedido_items where pedido_id = p_pedido;
    update public.pedidos set estado = 'recibido', fecha_recibido = now() where id = p_pedido;
    return 'recibido';
  end if;
  return v.estado;
end $$;

-- Crea un producto con su stock inicial en una bodega
create or replace function public.crear_producto(p_producto jsonb, p_bodega uuid, p_stock int, p_minimo int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform app.exigir('inventario.crear');
  insert into public.productos (codigo, nombre, marca_id, categoria_id, talla, color, costo, precio)
  values (p_producto ->> 'codigo', p_producto ->> 'nombre', (p_producto ->> 'marca_id')::uuid,
          (p_producto ->> 'categoria_id')::uuid, p_producto ->> 'talla', coalesce(p_producto ->> 'color', '—'),
          coalesce((p_producto ->> 'costo')::numeric, 0), (p_producto ->> 'precio')::numeric)
  returning id into v_id;
  insert into public.existencias (producto_id, bodega_id, stock_minimo) values (v_id, p_bodega, coalesce(p_minimo, 0));
  if coalesce(p_stock, 0) > 0 then
    insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, motivo)
    values (v_id, p_bodega, 'inicial', p_stock, 'Stock inicial');
  end if;
  return v_id;
end $$;

-- =====================================================================
-- 13. Row Level Security (por permisos)
--   · Lectura: cualquier usuario activo, salvo datos sensibles (salidas, usuarios).
--   · INSERT → <módulo>.crear · UPDATE → <módulo>.editar · DELETE → <módulo>.eliminar
--   · Las operaciones compuestas van por RPC (security definer) que validan
--     el permiso con app.exigir() antes de escribir.
-- =====================================================================
do $$
declare
  t text;
  -- tabla => módulos cuyo permiso habilita escribirla
  reglas jsonb := '{
    "marcas": ["inventario"], "categorias": ["inventario"], "bodegas": ["inventario"],
    "metodos_pago": ["configuracion"], "configuracion": ["configuracion"], "plantillas_mensaje": ["configuracion","cartera"],
    "clientes": ["clientes","ventas","cartera"], "comerciales": ["comerciales"],
    "proveedores": ["proveedores"], "proveedor_marcas": ["proveedores"], "pedidos": ["proveedores"], "pedido_items": ["proveedores"],
    "productos": ["inventario"], "existencias": ["inventario"], "movimientos_inventario": ["inventario"],
    "ventas": ["ventas"], "venta_items": ["ventas"],
    "salidas": ["salidas"],
    "cuentas_cobrar": ["cartera"], "planes_pago": ["cartera"], "cuotas": ["cartera"],
    "abonos": ["cartera"], "abono_aplicaciones": ["cartera"], "gestiones_cobro": ["cartera"],
    "roles": ["usuarios"], "rol_permisos": ["usuarios"]
  }';
  -- tablas cuya lectura exige permiso de ver (el resto: cualquier miembro)
  lectura jsonb := '{ "salidas": ["salidas.ver","reportes.ver"] }';
  sel text;
  function_args text;
begin
  for t in select jsonb_object_keys(reglas) loop
    sel := case when lectura ? t
                then 'app.tiene_permiso(' || (select string_agg(quote_literal(x), ',') from jsonb_array_elements_text(lectura -> t) x) || ')'
                else 'app.es_miembro()' end;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (%s)', t || '_select', t, sel);
    foreach function_args in array array['insert:crear', 'update:editar', 'delete:eliminar'] loop
      execute format(
        case split_part(function_args, ':', 1)
          when 'insert' then 'create policy %I on public.%I for insert to authenticated with check (app.tiene_permiso(%s))'
          when 'update' then 'create policy %I on public.%I for update to authenticated using (app.tiene_permiso(%4$s)) with check (app.tiene_permiso(%4$s))'
          else 'create policy %I on public.%I for delete to authenticated using (app.tiene_permiso(%s))'
        end,
        t || '_' || split_part(function_args, ':', 1), t,
        (select string_agg(quote_literal(m || '.' || split_part(function_args, ':', 2)), ',') from jsonb_array_elements_text(reglas -> t) m),
        (select string_agg(quote_literal(m || '.' || split_part(function_args, ':', 2)), ',') from jsonb_array_elements_text(reglas -> t) m));
    end loop;
  end loop;
end $$;

-- Catálogo de permisos: solo lectura
alter table public.permisos enable row level security;
create policy permisos_select on public.permisos for select to authenticated using (app.es_miembro());

-- Perfiles: cada quien ve el suyo; con usuarios.ver se ven todos.
-- Se crean desde la Edge Function (service key); aquí solo se editan.
alter table public.perfiles enable row level security;
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = auth.uid() or app.tiene_permiso('usuarios.ver'));
create policy perfiles_update on public.perfiles for update to authenticated
  using (app.tiene_permiso('usuarios.editar', 'usuarios.eliminar'))
  with check (app.tiene_permiso('usuarios.editar', 'usuarios.eliminar'));

-- Reglas anti-escalamiento al editar perfiles desde la app
create or replace function app.tg_perfil_cambios() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_soy_admin boolean;
begin
  if auth.uid() is null then return new; end if;              -- service key / SQL editor
  select coalesce(r.es_admin, false) into v_soy_admin
    from public.perfiles p left join public.roles r on r.id = p.rol_id where p.id = auth.uid();
  if new.id = auth.uid() and (new.rol_id is distinct from old.rol_id or new.activo <> old.activo) then
    raise exception 'No puedes cambiar tu propio rol ni desactivarte';
  end if;
  if not coalesce(v_soy_admin, false) and (
       exists (select 1 from public.roles where id = new.rol_id and es_admin)
    or exists (select 1 from public.roles where id = old.rol_id and es_admin)) then
    raise exception 'Solo un administrador puede asignar o modificar administradores';
  end if;
  if new.activo <> old.activo and not app.tiene_permiso('usuarios.eliminar') then
    raise exception 'No tienes permiso para activar o desactivar usuarios';
  end if;
  new.email := old.email;                                      -- el correo solo cambia en Auth
  return new;
end $$;

create trigger tg_perfiles_cambios
  before update on public.perfiles
  for each row execute function app.tg_perfil_cambios();

-- Las funciones internas se usan desde RLS y RPC: permiso de ejecución a usuarios autenticados
grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;
-- El esquema `app` no se expone en la API REST, así que estas funciones solo se usan desde SQL/RPC.


-- =====================================================================
-- 14. Storage: comprobantes de salidas
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

create policy comprobantes_leer on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and app.es_miembro());
create policy comprobantes_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and app.es_miembro());
create policy comprobantes_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and app.tiene_permiso('salidas.eliminar'));
