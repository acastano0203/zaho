-- =====================================================================
--  ZAHO · Migración 8 · Módulo Pedidos
--   Los pedidos a proveedores salen de "Proveedores" y tienen su propio
--   módulo y permisos (pedidos.ver / crear / editar / eliminar).
--   · Los roles que tenían permisos de Proveedores reciben los mismos en Pedidos
--     (nadie pierde acceso).
--   · Escribir pedidos y avanzar su estado exige permisos de Pedidos.
--   · "Proveedores" pasa a llamarse "Proveedores y marcas".
--
--  Ejecutar en Supabase → SQL Editor → Run (después de la 7).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Permisos
-- ---------------------------------------------------------------------
insert into public.permisos (clave, modulo, accion, descripcion, orden)
select 'pedidos.' || a.accion, 'pedidos', a.accion, initcap(a.accion) || ' · Pedidos', 45 + a.orden
  from (values ('ver',1), ('crear',2), ('editar',3), ('eliminar',4)) a(accion, orden)
on conflict (clave) do nothing;

update public.permisos set descripcion = initcap(accion) || ' · Proveedores y marcas' where modulo = 'proveedores';

-- Solo la primera vez: copiar a Pedidos lo que cada rol tenía en Proveedores
insert into public.rol_permisos (rol_id, permiso)
select rp.rol_id, replace(rp.permiso, 'proveedores.', 'pedidos.')
  from public.rol_permisos rp
 where rp.permiso like 'proveedores.%'
   and not exists (select 1 from public.rol_permisos x where x.permiso like 'pedidos.%')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. RLS de pedidos y sus líneas (la lectura sigue abierta a los miembros)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['pedidos', 'pedido_items'] loop
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (app.tiene_permiso(%L, %L))',
                   t || '_insert', t, 'pedidos.crear', 'pedidos.editar');
    execute format('create policy %I on public.%I for update to authenticated using (app.tiene_permiso(%L)) with check (app.tiene_permiso(%L))',
                   t || '_update', t, 'pedidos.editar', 'pedidos.editar');
    -- Borrar el pedido completo exige eliminar; sus líneas también se reemplazan al editarlo
    execute format('create policy %I on public.%I for delete to authenticated using (app.tiene_permiso(%L, %L))',
                   t || '_delete', t, 'pedidos.eliminar', case when t = 'pedido_items' then 'pedidos.editar' else 'pedidos.eliminar' end);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. Avanzar pedido: enviado → confirmado → recibido (al recibir suma el stock)
-- ---------------------------------------------------------------------
create or replace function public.avanzar_pedido(p_pedido uuid)
returns public.estado_pedido language plpgsql security definer set search_path = public as $$
declare v public.pedidos%rowtype;
begin
  perform app.exigir('pedidos.editar');
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
