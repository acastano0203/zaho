-- =====================================================================
--  ZAHO · Migración 6 · Datos del proveedor
--   Identificación (NIT o cédula), correo electrónico y dirección.
--   El NIT se guarda sin dígito de verificación: la app lo calcula.
--
--  Ejecutar en Supabase → SQL Editor → Run (después de la 5).
--  Idempotente: se puede volver a ejecutar.
-- =====================================================================

alter table public.proveedores add column if not exists tipo_documento text;
alter table public.proveedores add column if not exists documento text;
alter table public.proveedores add column if not exists email text;
alter table public.proveedores add column if not exists direccion text;

do $$ begin
  alter table public.proveedores add constraint proveedores_tipo_documento_chk
    check (tipo_documento is null or tipo_documento in ('nit', 'cc'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.proveedores add constraint proveedores_documento_chk
    check (documento is null or documento ~ '^[0-9]{6,11}$');
exception when duplicate_object then null;
end $$;

create unique index if not exists proveedores_documento_uk
  on public.proveedores (documento) where documento is not null and activo;

comment on column public.proveedores.tipo_documento is 'nit | cc';
comment on column public.proveedores.documento is 'Solo dígitos; el NIT sin dígito de verificación';
