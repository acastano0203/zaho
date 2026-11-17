-- =====================================================================
--  ZAHO · Migración 2: permitir ELIMINAR usuarios (no solo desactivarlos)
--
--  Antes: un usuario con historial (ventas, abonos, movimientos…) no se
--  podía borrar porque created_by lo referenciaba.
--  Ahora: al borrarlo, su historial se conserva y queda sin autor (null).
--
--  Ejecutar en Supabase → SQL Editor → Run (una sola vez, después de la 1).
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname, a.attname as columna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.confrelid = 'public.perfiles'::regclass
       and a.attname = 'created_by'
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references public.perfiles (id) on delete set null',
                   r.tabla, r.conname, r.columna);
  end loop;
end $$;

-- Verificación: las 7 relaciones deben quedar en "set null"
select conrelid::regclass as tabla, conname as relacion,
       case confdeltype when 'n' then '✅ set null' else '❌ ' || confdeltype::text end as al_borrar_usuario
  from pg_constraint
 where contype = 'f' and confrelid = 'public.perfiles'::regclass and conname like '%created_by%'
 order by 1;
