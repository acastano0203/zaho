-- =====================================================================
--  ZAHO · Migración 9 · Categorías
--   Las categorías se crean desde la app (Inventario → Categorías o
--   "+ Nueva" al crear un producto). Se agrega Zapatos.
--   La escritura ya está protegida por permisos de Inventario (migración 1).
--
--  Ejecutar en Supabase → SQL Editor → Run (después de la 8).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

insert into public.categorias (nombre) values ('Zapatos')
on conflict (nombre) do update set activo = true;
