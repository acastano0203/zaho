-- =====================================================================
--  ZAHO · Migración 7 · Sin pedido automático
--   Se retira el pedido automático a proveedores: los pedidos se hacen
--   siempre desde "Sugerido para pedir" (Proveedores) y se envían por WhatsApp.
--   Los pedidos ya creados se conservan en el historial.
--
--  Ejecutar en Supabase → SQL Editor → Run (después de la 6).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

drop trigger if exists tg_existencias_pedido_auto on public.existencias;
drop function if exists app.tg_pedido_automatico();

-- La columna queda por compatibilidad, siempre apagada
update public.proveedores set pedido_automatico = false where pedido_automatico;
comment on column public.proveedores.pedido_automatico is 'En desuso desde la migración 7: ya no se generan pedidos automáticos.';
