-- =====================================================================
--  ZAHO · Migración 5 · Marcas
--   1. Las marcas tienen un color (acento de su tarjeta en Proveedores → Marcas).
--   2. Las marcas se pueden crear desde Inventario o desde Proveedores.
--   3. Marcas iniciales: Nike, Adidas y Calvin Klein.
--
--  Ejecutar en Supabase → SQL Editor → Run (una sola vez, después de la 4).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

alter table public.marcas add column if not exists color text;
comment on column public.marcas.color is 'Color de acento (hex) de la marca en la app';

-- Escritura de marcas: permiso de inventario o de proveedores
drop policy if exists marcas_insert on public.marcas;
drop policy if exists marcas_update on public.marcas;
drop policy if exists marcas_delete on public.marcas;
create policy marcas_insert on public.marcas for insert to authenticated
  with check (app.tiene_permiso('inventario.crear', 'proveedores.crear'));
create policy marcas_update on public.marcas for update to authenticated
  using (app.tiene_permiso('inventario.editar', 'proveedores.editar'))
  with check (app.tiene_permiso('inventario.editar', 'proveedores.editar'));
create policy marcas_delete on public.marcas for delete to authenticated
  using (app.tiene_permiso('inventario.eliminar', 'proveedores.eliminar'));

insert into public.marcas (nombre, color) values
  ('Nike', '#2B2826'), ('Adidas', '#4A5A72'), ('Calvin Klein', '#8A837C')
on conflict (nombre) do update set color = coalesce(public.marcas.color, excluded.color), activo = true;
