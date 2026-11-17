-- =====================================================================
--  ZAHO · Migración 4
--   1. Las ventas a crédito ya NO llevan recargo (cuestan lo mismo que de contado).
--   2. Cartera: recargo por mora a cuentas vencidas (porcentaje sobre lo vencido
--      o valor fijo), que se suma al saldo y a la cuota atrasada.
--
--  Ejecutar en Supabase → SQL Editor → Run (una sola vez, después de la 3).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sin recargo por crédito
--    registrar_venta toma el porcentaje de configuracion: queda en 0.
--    Las ventas ya registradas conservan el precio con el que se vendieron.
-- ---------------------------------------------------------------------
update public.configuracion set recargo_credito_pct = 0;
alter table public.configuracion alter column recargo_credito_pct set default 0;
comment on column public.configuracion.recargo_credito_pct is
  'En desuso: las ventas a crédito no llevan recargo. Los recargos se cobran por mora en recargos_cartera.';

-- ---------------------------------------------------------------------
-- 2. Recargos por mora
-- ---------------------------------------------------------------------
-- Idempotente: se puede volver a ejecutar si una corrida anterior quedó a medias.
do $$ begin
  create type public.tipo_recargo as enum ('porcentaje', 'valor');
exception when duplicate_object then null;
end $$;

create table if not exists public.recargos_cartera (
  id          uuid primary key default gen_random_uuid(),
  cuenta_id   uuid not null references public.cuentas_cobrar (id) on delete cascade,
  fecha       date not null default current_date,
  tipo        public.tipo_recargo not null,
  porcentaje  numeric(6,2) check (porcentaje is null or (porcentaje > 0 and porcentaje <= 100)),
  base        numeric(14,2) not null check (base > 0),             -- monto vencido al aplicarlo
  valor       numeric(14,2) not null check (valor > 0),
  cuota_id    uuid references public.cuotas (id) on delete set null, -- cuota vencida a la que se suma
  nota        text,
  created_by  uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint recargos_porcentaje_ck check (tipo <> 'porcentaje' or porcentaje is not null)
);
create index if not exists recargos_cartera_cuenta_idx on public.recargos_cartera (cuenta_id);

alter table public.recargos_cartera enable row level security;
drop policy if exists recargos_cartera_select on public.recargos_cartera;
drop policy if exists recargos_cartera_insert on public.recargos_cartera;
drop policy if exists recargos_cartera_update on public.recargos_cartera;
drop policy if exists recargos_cartera_delete on public.recargos_cartera;
create policy recargos_cartera_select on public.recargos_cartera for select to authenticated using (app.es_miembro());
create policy recargos_cartera_insert on public.recargos_cartera for insert to authenticated with check (app.tiene_permiso('cartera.editar'));
create policy recargos_cartera_update on public.recargos_cartera for update to authenticated using (app.tiene_permiso('cartera.editar')) with check (app.tiene_permiso('cartera.editar'));
create policy recargos_cartera_delete on public.recargos_cartera for delete to authenticated using (app.tiene_permiso('cartera.editar'));

-- v_cartera: el total incluye los recargos y la cuota atrasada suma su recargo.
-- (misma estructura de columnas; se agrega "mora" al final)
create or replace view public.v_cartera with (security_invoker = true) as
with rec as (
  select cuenta_id, sum(valor) as mora from public.recargos_cartera group by cuenta_id
), tot as (
  select cc.id,
         coalesce(cc.valor_total, (select sum(i.subtotal) from public.venta_items i where i.venta_id = cc.venta_id), 0)
           + coalesce(r.mora, 0) as total,
         coalesce(r.mora, 0) as mora
    from public.cuentas_cobrar cc
    left join rec r on r.cuenta_id = cc.id
), pag as (
  select cuenta_id, sum(valor) as pagado, max(fecha) as ultimo_abono
    from public.abonos group by cuenta_id
), prox as (
  -- próxima cuota con saldo del plan vigente (su valor incluye los recargos que se le sumaron)
  select distinct on (pp.cuenta_id) pp.cuenta_id, cu.fecha_vencimiento
    from public.planes_pago pp
    join public.cuotas cu on cu.plan_id = pp.id
    left join lateral (select coalesce(sum(aa.valor), 0) as aplicado
                         from public.abono_aplicaciones aa where aa.cuota_id = cu.id) ap on true
    left join lateral (select coalesce(sum(rc.valor), 0) as extra
                         from public.recargos_cartera rc where rc.cuota_id = cu.id) rx on true
   where pp.vigente and ap.aplicado < cu.valor + rx.extra
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
  case when t.total > 0 then least(100, round(coalesce(p.pagado, 0) * 100 / t.total)) else 0 end as pct_pagado,
  t.mora
from public.cuentas_cobrar cc
join tot t on t.id = cc.id
left join pag p  on p.cuenta_id  = cc.id
left join prox px on px.cuenta_id = cc.id;

/*
  registrar_recargo: solo para cuentas vencidas.
  El monto lo calcula la app (porcentaje sobre lo vencido, redondeado a la centena)
  y aquí se valida y se guarda junto con su registro en el seguimiento.
*/
create or replace function public.registrar_recargo(
  p_cuenta uuid, p_tipo public.tipo_recargo, p_porcentaje numeric, p_base numeric, p_valor numeric,
  p_cuota_numero int default null, p_nota text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_estado text; v_cuota uuid;
begin
  perform app.exigir('cartera.editar');
  select estado into v_estado from public.v_cartera where id = p_cuenta;
  if v_estado is null then raise exception 'Cuenta no encontrada'; end if;
  if v_estado <> 'vencida' then raise exception 'Solo se puede cobrar recargo a cuentas vencidas'; end if;
  if coalesce(p_valor, 0) <= 0 then raise exception 'El recargo debe ser mayor a cero'; end if;

  if p_cuota_numero is not null then
    select cu.id into v_cuota from public.cuotas cu join public.planes_pago pp on pp.id = cu.plan_id
     where pp.cuenta_id = p_cuenta and pp.vigente and cu.numero = p_cuota_numero;
  end if;

  insert into public.recargos_cartera (cuenta_id, tipo, porcentaje, base, valor, cuota_id, nota)
  values (p_cuenta, p_tipo, case when p_tipo = 'porcentaje' then p_porcentaje end, p_base, p_valor, v_cuota, nullif(trim(p_nota), ''))
  returning id into v_id;

  insert into public.gestiones_cobro (cuenta_id, tipo, nota)
  values (p_cuenta, 'Recargo', 'Recargo por mora ' ||
          case when p_tipo = 'porcentaje' then replace(rtrim(rtrim(p_porcentaje::text, '0'), '.'), '.', ',') || '% sobre $' || round(p_base) || ' vencido'
               else 'valor fijo' end || ': $' || round(p_valor) || coalesce(' · ' || nullif(trim(p_nota), ''), ''));
  return v_id;
end $$;

-- Verificación
select 'Recargo por crédito en configuración' as chequeo, recargo_credito_pct::text || '%' as resultado from public.configuracion
union all select 'Tabla de recargos por mora', count(*)::text || ' recargos' from public.recargos_cartera
union all select 'Columna mora en v_cartera', count(*)::text from information_schema.columns where table_name = 'v_cartera' and column_name = 'mora';
