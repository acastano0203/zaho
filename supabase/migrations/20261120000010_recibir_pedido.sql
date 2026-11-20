-- =====================================================================
--  ZAHO · Migración 10 · Recibir pedido con cantidades reales
--   recibir_pedido(pedido, items): se recibe desde "enviado" o "confirmado"
--   con lo que realmente llegó. Por cada producto se registra un movimiento
--   'recepcion_pedido' en la bodega de llegada; el trigger de movimientos
--   hace stock = stock + cantidad sobre la existencia que ya hay
--   (si esa referencia no tenía existencia en la bodega, la abre).
--   Nunca crea un producto nuevo.
--   El pedido queda con las cantidades recibidas.
--
--  Ejecutar en Supabase → SQL Editor → Run (después de la 9).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

create or replace function public.recibir_pedido(p_pedido uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.pedidos%rowtype;
begin
  perform app.exigir('pedidos.editar');

  select * into v from public.pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if v.estado = 'recibido' then raise exception 'Este pedido ya fue recibido'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or not exists (select 1 from jsonb_array_elements(p_items) i where (i ->> 'cantidad')::int > 0) then
    raise exception 'Indica cuántas unidades llegaron';
  end if;

  -- El pedido queda con lo que realmente llegó (una línea por producto)
  delete from public.pedido_items where pedido_id = p_pedido;
  insert into public.pedido_items (pedido_id, producto_id, cantidad)
  select p_pedido, (i ->> 'producto_id')::uuid, sum((i ->> 'cantidad')::int)
    from jsonb_array_elements(p_items) i
   where (i ->> 'cantidad')::int > 0
   group by (i ->> 'producto_id')::uuid;

  -- Suma al stock de la bodega de llegada
  insert into public.movimientos_inventario (producto_id, bodega_id, tipo, cantidad, pedido_id, motivo)
  select producto_id, v.bodega_destino_id, 'recepcion_pedido', cantidad, p_pedido, 'Pedido ' || v.codigo
    from public.pedido_items where pedido_id = p_pedido;

  update public.pedidos
     set estado = 'recibido', fecha_recibido = now(), fecha_confirmado = coalesce(fecha_confirmado, now())
   where id = p_pedido;
end $$;

revoke all on function public.recibir_pedido(uuid, jsonb) from public, anon;
grant execute on function public.recibir_pedido(uuid, jsonb) to authenticated;
