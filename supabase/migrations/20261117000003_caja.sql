-- =====================================================================
--  ZAHO · Migración 3: módulo de CAJA (reemplaza "Salidas de dinero")
--
--   1. Permisos salidas.* → caja.*  (roles, políticas RLS, RPC y storage)
--   2. Cuentas de dinero (efectivo, Nequi, banco) con saldo inicial
--   3. Cada medio de pago entra a una cuenta; la venta de contado guarda su medio de pago
--   4. Movimientos propios de caja (otros ingresos, traslados, ajustes) y arqueos
--   5. Vistas v_libro_caja y v_saldos_caja (el libro se arma con ventas, abonos,
--      salidas y movimientos: nada se registra dos veces)
--   6. RPC registrar_traslado y registrar_arqueo
--
--  Ejecutar en Supabase → SQL Editor → Run (una sola vez, después de la 2).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Permisos: salidas → caja
-- ---------------------------------------------------------------------
insert into public.permisos (clave, modulo, accion, descripcion, orden)
select replace(clave, 'salidas.', 'caja.'), 'caja', accion, initcap(accion) || ' · Caja', orden
  from public.permisos where modulo = 'salidas'
on conflict (clave) do nothing;

update public.rol_permisos set permiso = replace(permiso, 'salidas.', 'caja.') where permiso like 'salidas.%';
delete from public.permisos where modulo = 'salidas';

drop policy if exists salidas_select on public.salidas;
drop policy if exists salidas_insert on public.salidas;
drop policy if exists salidas_update on public.salidas;
drop policy if exists salidas_delete on public.salidas;
create policy salidas_select on public.salidas for select to authenticated using (app.tiene_permiso('caja.ver', 'reportes.ver'));
create policy salidas_insert on public.salidas for insert to authenticated with check (app.tiene_permiso('caja.crear'));
create policy salidas_update on public.salidas for update to authenticated using (app.tiene_permiso('caja.editar')) with check (app.tiene_permiso('caja.editar'));
create policy salidas_delete on public.salidas for delete to authenticated using (app.tiene_permiso('caja.eliminar'));

drop policy if exists comprobantes_borrar on storage.objects;
create policy comprobantes_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and app.tiene_permiso('caja.eliminar'));

create or replace function public.registrar_prestamo(
  p_beneficiario text, p_telefono text, p_valor numeric, p_metodo uuid, p_fecha date,
  p_vence date, p_nota text default null, p_plan jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_salida uuid; v_cuenta uuid;
begin
  perform app.exigir('caja.crear');
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

-- ---------------------------------------------------------------------
-- 2. Cuentas de dinero
-- ---------------------------------------------------------------------
create type public.tipo_cuenta_dinero as enum ('efectivo', 'billetera', 'banco');

create table public.cuentas_dinero (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  tipo           public.tipo_cuenta_dinero not null,
  saldo_inicial  numeric(14,2) not null default 0 check (saldo_inicial >= 0),
  fecha_inicial  date not null default current_date,
  orden          smallint not null default 0,
  activa         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index cuentas_dinero_nombre_uq on public.cuentas_dinero (lower(trim(nombre)));
comment on column public.cuentas_dinero.fecha_inicial is 'Los movimientos anteriores a esta fecha ya están incluidos en saldo_inicial.';

create trigger tg_cuentas_dinero_updated_at before update on public.cuentas_dinero
  for each row execute function app.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Medio de pago → cuenta, y medio de pago en ventas de contado
-- ---------------------------------------------------------------------
alter table public.metodos_pago add column cuenta_id uuid references public.cuentas_dinero (id) on delete set null;
alter table public.ventas add column metodo_pago_id uuid references public.metodos_pago (id) on delete set null;

-- Cuentas por defecto (solo si no hay ninguna) y asignación de medios de pago
insert into public.cuentas_dinero (nombre, tipo, orden)
select v.nombre, v.tipo::public.tipo_cuenta_dinero, v.orden
  from (values ('Caja general', 'efectivo', 1), ('Nequi', 'billetera', 2), ('Bancolombia', 'banco', 3)) v(nombre, tipo, orden)
 where not exists (select 1 from public.cuentas_dinero);

update public.metodos_pago mp set cuenta_id = c.id
  from public.cuentas_dinero c
 where mp.cuenta_id is null
   and c.nombre = case mp.nombre when 'Efectivo' then 'Caja general' when 'Nequi' then 'Nequi' else 'Bancolombia' end;

-- La venta guarda su medio de pago (contado) o el del abono inicial (crédito)
create or replace function public.registrar_venta(p_venta jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid;
  v_rec     numeric := 0;
  v_pago    public.forma_pago := (p_venta ->> 'forma_pago')::public.forma_pago;
  v_metodo  uuid := nullif(p_venta ->> 'metodo_pago_id', '')::uuid;
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

  insert into public.ventas (cliente_id, cliente_nombre, telefono, comercial_id, forma_pago, recargo_pct, metodo_pago_id)
  values ((p_venta ->> 'cliente_id')::uuid,
          coalesce(nullif(trim(p_venta ->> 'cliente_nombre'), ''), 'Cliente mostrador'),
          p_venta ->> 'telefono',
          (p_venta ->> 'comercial_id')::uuid,
          v_pago, v_rec,
          case when v_pago = 'contado' then v_metodo end)
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
      values (v_cuenta, v_abono, 'Abono inicial', v_metodo);
    end if;

    if p_venta -> 'plan' is not null and jsonb_typeof(p_venta -> 'plan') = 'object' then
      v_plan := app.crear_plan(v_cuenta, (p_venta -> 'plan' ->> 'frecuencia')::public.frecuencia_pago, p_venta -> 'plan' -> 'cuotas');
    end if;

    insert into public.gestiones_cobro (cuenta_id, tipo, nota)
    values (v_cuenta, 'Venta', 'Venta a crédito');
  end if;

  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 4. Movimientos propios de caja y arqueos
-- ---------------------------------------------------------------------
create type public.tipo_mov_caja   as enum ('ingreso', 'egreso');
create type public.origen_mov_caja as enum ('manual', 'traslado', 'ajuste');

create table public.cierres_caja (
  id              uuid primary key default gen_random_uuid(),
  cuenta_id       uuid not null references public.cuentas_dinero (id) on delete restrict,
  fecha           date not null default current_date,
  saldo_sistema   numeric(14,2) not null,
  saldo_contado   numeric(14,2) not null check (saldo_contado >= 0),
  diferencia      numeric(14,2) generated always as (saldo_contado - saldo_sistema) stored,
  conteo          jsonb,                       -- billetes y monedas: {"50000": 2, "20000": 3, ...}
  nota            text,
  created_by      uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  unique (cuenta_id, fecha)                    -- un arqueo por cuenta y día
);

create table public.movimientos_caja (
  id            uuid primary key default gen_random_uuid(),
  fecha         date not null default current_date,
  cuenta_id     uuid not null references public.cuentas_dinero (id) on delete restrict,
  tipo          public.tipo_mov_caja not null,
  origen        public.origen_mov_caja not null default 'manual',
  categoria     text not null,
  concepto      text not null,
  valor         numeric(14,2) not null check (valor > 0),
  traslado_id   uuid,                                                   -- une las dos patas de un traslado
  cierre_id     uuid references public.cierres_caja (id) on delete cascade, -- ajuste generado por un arqueo
  created_by    uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);
create index movimientos_caja_cuenta_idx   on public.movimientos_caja (cuenta_id, fecha);
create index movimientos_caja_traslado_idx on public.movimientos_caja (traslado_id) where traslado_id is not null;

-- Borrar una pata de un traslado borra también la otra
create or replace function app.tg_borrar_traslado() returns trigger
language plpgsql as $$
begin
  if old.traslado_id is not null then
    delete from public.movimientos_caja where traslado_id = old.traslado_id and id <> old.id;
  end if;
  return old;
end $$;
create trigger tg_movimientos_caja_traslado after delete on public.movimientos_caja
  for each row execute function app.tg_borrar_traslado();

-- ---------------------------------------------------------------------
-- 5. Libro de caja y saldos
-- ---------------------------------------------------------------------
create or replace function app.cuenta_de_metodo(p_metodo uuid) returns uuid
language sql stable as $$
  select coalesce(
    (select cuenta_id from public.metodos_pago where id = p_metodo),
    (select id from public.cuentas_dinero where tipo = 'efectivo' and activa order by orden limit 1)
  )
$$;

create or replace view public.v_libro_caja with (security_invoker = true) as
with lineas as (
  select c.fecha_inicial as fecha, c.id as cuenta_id, 'ingreso'::text as tipo, 'inicial'::text as origen,
         'Saldo inicial · ' || c.nombre as concepto, c.saldo_inicial as valor, c.id as ref_id, 0 as orden, c.created_at
    from public.cuentas_dinero c where c.saldo_inicial > 0
  union all
  -- (v_ventas se creó antes de existir ventas.metodo_pago_id: el medio de pago se lee de la tabla)
  select v.fecha, app.cuenta_de_metodo(ve.metodo_pago_id), 'ingreso', 'venta', 'Venta ' || v.codigo || ' · ' || v.cliente_nombre,
         v.total, v.id, 1, v.created_at
    from public.v_ventas v join public.ventas ve on ve.id = v.id
   where v.forma_pago = 'contado'
  union all
  select a.fecha, app.cuenta_de_metodo(a.metodo_pago_id), 'ingreso',
         case when cc.tipo = 'prestamo' then 'recuperado' else 'abono' end,
         case when cc.tipo = 'prestamo' then 'Devolución de préstamo' else a.etiqueta end || ' · ' || cc.cliente_nombre,
         a.valor, a.id, 1, a.created_at
    from public.abonos a join public.cuentas_cobrar cc on cc.id = a.cuenta_id
  union all
  select s.fecha, app.cuenta_de_metodo(s.metodo_pago_id), 'egreso',
         case when s.tipo = 'prestamo' then 'prestamo' else 'gasto' end, s.codigo || ' · ' || s.descripcion,
         s.valor, s.id, 3, s.created_at
    from public.salidas s
  union all
  select m.fecha, m.cuenta_id, m.tipo::text, m.origen::text, m.concepto, m.valor, m.id,
         case m.origen when 'traslado' then 2 when 'ajuste' then 4 else 1 end, m.created_at
    from public.movimientos_caja m
)
select l.fecha, l.cuenta_id, c.nombre as cuenta, l.tipo, l.origen, l.concepto, l.valor,
       case when l.tipo = 'ingreso' then l.valor else 0 end as entrada,
       case when l.tipo = 'egreso'  then l.valor else 0 end as salida,
       sum(case when l.tipo = 'ingreso' then l.valor else -l.valor end)
         over (partition by l.cuenta_id order by l.fecha, l.orden, l.created_at, l.ref_id) as saldo_cuenta,
       l.ref_id
  from lineas l
  join public.cuentas_dinero c on c.id = l.cuenta_id
 where l.origen = 'inicial' or l.fecha >= c.fecha_inicial;   -- lo anterior ya está en el saldo inicial

create or replace view public.v_saldos_caja with (security_invoker = true) as
select c.id as cuenta_id, c.nombre, c.tipo, c.saldo_inicial, c.fecha_inicial,
       coalesce(sum(l.entrada) filter (where l.origen <> 'inicial'), 0) as entradas,
       coalesce(sum(l.salida), 0) as salidas,
       c.saldo_inicial + coalesce(sum(l.entrada) filter (where l.origen <> 'inicial'), 0) - coalesce(sum(l.salida), 0) as saldo,
       coalesce(sum(l.entrada) filter (where l.fecha = current_date and l.origen <> 'inicial'), 0) as entradas_hoy,
       coalesce(sum(l.salida)  filter (where l.fecha = current_date), 0) as salidas_hoy
  from public.cuentas_dinero c
  left join public.v_libro_caja l on l.cuenta_id = c.id
 where c.activa
 group by c.id;

-- ---------------------------------------------------------------------
-- 6. RPC: traslado y arqueo (atómicos)
-- ---------------------------------------------------------------------
create or replace function public.registrar_traslado(p_desde uuid, p_hasta uuid, p_valor numeric, p_fecha date default current_date, p_concepto text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_t uuid := gen_random_uuid(); v_disp numeric; v_a text; v_b text;
begin
  perform app.exigir('caja.crear');
  if p_desde = p_hasta then raise exception 'Las cuentas deben ser distintas'; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'Escribe el valor'; end if;
  select nombre into v_a from public.cuentas_dinero where id = p_desde;
  select nombre into v_b from public.cuentas_dinero where id = p_hasta;
  if v_a is null or v_b is null then raise exception 'Cuenta no encontrada'; end if;

  select coalesce(sum(case when tipo = 'ingreso' then valor else -valor end), 0) into v_disp
    from public.v_libro_caja where cuenta_id = p_desde and fecha <= p_fecha;
  if p_valor > v_disp then raise exception 'En % hay % a esa fecha. No alcanza para el traslado.', v_a, v_disp; end if;

  insert into public.movimientos_caja (fecha, cuenta_id, tipo, origen, categoria, concepto, valor, traslado_id) values
    (p_fecha, p_desde, 'egreso',  'traslado', 'Traslado', coalesce(nullif(trim(p_concepto), ''), 'Traslado de ' || v_a || ' a ' || v_b) || ' (sale)',  p_valor, v_t),
    (p_fecha, p_hasta, 'ingreso', 'traslado', 'Traslado', coalesce(nullif(trim(p_concepto), ''), 'Traslado de ' || v_a || ' a ' || v_b) || ' (entra)', p_valor, v_t);
  return v_t;
end $$;

create or replace function public.registrar_arqueo(p_cuenta uuid, p_contado numeric, p_conteo jsonb default null, p_nota text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_sis numeric; v_dif numeric; v_nombre text;
begin
  perform app.exigir('caja.editar');
  select nombre into v_nombre from public.cuentas_dinero where id = p_cuenta;
  if v_nombre is null then raise exception 'Cuenta no encontrada'; end if;
  if exists (select 1 from public.cierres_caja where cuenta_id = p_cuenta and fecha = current_date) then
    raise exception 'Ya hiciste el arqueo de % hoy', v_nombre;
  end if;

  select coalesce(sum(case when tipo = 'ingreso' then valor else -valor end), 0) into v_sis
    from public.v_libro_caja where cuenta_id = p_cuenta and fecha <= current_date;

  insert into public.cierres_caja (cuenta_id, saldo_sistema, saldo_contado, conteo, nota)
  values (p_cuenta, v_sis, p_contado, p_conteo, nullif(trim(p_nota), ''))
  returning id into v_id;

  v_dif := p_contado - v_sis;
  if v_dif <> 0 then
    insert into public.movimientos_caja (cuenta_id, tipo, origen, categoria, concepto, valor, cierre_id)
    values (p_cuenta, case when v_dif > 0 then 'ingreso' else 'egreso' end::public.tipo_mov_caja, 'ajuste', 'Arqueo',
            case when v_dif > 0 then 'Sobrante' else 'Faltante' end || ' en arqueo de ' || v_nombre || coalesce(' · ' || nullif(trim(p_nota), ''), ''),
            abs(v_dif), v_id);
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 7. Seguridad de las tablas nuevas
-- ---------------------------------------------------------------------
alter table public.cuentas_dinero   enable row level security;
alter table public.movimientos_caja enable row level security;
alter table public.cierres_caja     enable row level security;

create policy cuentas_dinero_select on public.cuentas_dinero for select to authenticated using (app.es_miembro());
create policy cuentas_dinero_insert on public.cuentas_dinero for insert to authenticated with check (app.tiene_permiso('caja.editar'));
create policy cuentas_dinero_update on public.cuentas_dinero for update to authenticated using (app.tiene_permiso('caja.editar')) with check (app.tiene_permiso('caja.editar'));
create policy cuentas_dinero_delete on public.cuentas_dinero for delete to authenticated using (app.tiene_permiso('caja.eliminar'));

create policy movimientos_caja_select on public.movimientos_caja for select to authenticated using (app.tiene_permiso('caja.ver', 'reportes.ver'));
create policy movimientos_caja_insert on public.movimientos_caja for insert to authenticated with check (app.tiene_permiso('caja.crear'));
create policy movimientos_caja_update on public.movimientos_caja for update to authenticated using (app.tiene_permiso('caja.editar')) with check (app.tiene_permiso('caja.editar'));
create policy movimientos_caja_delete on public.movimientos_caja for delete to authenticated using (app.tiene_permiso('caja.eliminar'));

create policy cierres_caja_select on public.cierres_caja for select to authenticated using (app.tiene_permiso('caja.ver', 'reportes.ver'));
create policy cierres_caja_insert on public.cierres_caja for insert to authenticated with check (app.tiene_permiso('caja.editar'));
create policy cierres_caja_delete on public.cierres_caja for delete to authenticated using (app.tiene_permiso('caja.eliminar'));

grant execute on all functions in schema app to authenticated;

-- Verificación
select 'Permisos de Caja' as chequeo, count(*)::text as resultado from public.permisos where modulo = 'caja'
union all select 'Permisos viejos de Salidas', count(*)::text from public.permisos where modulo = 'salidas'
union all select 'Cuentas de dinero', string_agg(nombre, ', ' order by orden) from public.cuentas_dinero
union all select 'Medios de pago asignados', string_agg(mp.nombre || ' → ' || c.nombre, ', ' order by mp.orden)
  from public.metodos_pago mp join public.cuentas_dinero c on c.id = mp.cuenta_id;
