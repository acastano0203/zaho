-- =====================================================================
--  ZAHO · Verificación de la base de datos
--  Pegar en Supabase → SQL Editor → Run. Se puede ejecutar las veces que quieras.
--  Muestra una lista de chequeos con ✅ / ❌.
--  La prueba de venta se hace dentro de una transacción que se deshace:
--  NO deja datos en la base. (Solo consume un número del consecutivo de ventas,
--  porque las secuencias de Postgres no se devuelven: la numeración puede saltar.)
-- =====================================================================
create temp table if not exists _chequeo (n serial, chequeo text, resultado text, ok boolean);
truncate _chequeo;

do $$
declare
  v_admin    uuid;
  v_nombre   text;
  v_permisos int;
  v_stock0   int;
  v_stock1   int;
  v_total    numeric;
  v_codigo   text;
  v_error    text;
  v_prod     uuid;
  v_bod      uuid;
  v_venta    uuid;
  chk        record;
begin
  -- 1. Estructura ---------------------------------------------------------
  for chk in
    select 'Tablas creadas' c, count(*)::text r, count(*) = 32 ok
      from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
    union all
    select 'Vistas creadas', count(*)::text, count(*) = 6
      from information_schema.views where table_schema = 'public'
    union all
    select 'Tablas SIN seguridad RLS', coalesce(string_agg(c.relname, ', '), 'ninguna'), count(*) = 0
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    union all
    select 'Funciones RPC', count(*)::text, count(*) >= 16
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('registrar_venta','anular_venta','registrar_abono','aplicar_plan','registrar_prestamo',
       'registrar_cuenta_manual','ajustar_stock','trasladar_stock','avanzar_pedido','crear_producto','mi_sesion','registrar_acceso','guardar_rol',
       'registrar_traslado','registrar_arqueo','registrar_recargo')
    union all
    select 'Trigger de nuevos usuarios (auth.users)', count(*)::text, count(*) = 1
      from pg_trigger where tgname = 'tg_auth_nuevo_usuario'
    union all
    select 'Bucket de comprobantes', count(*)::text, count(*) = 1
      from storage.buckets where id = 'comprobantes'
    union all
    -- 2. Datos base -------------------------------------------------------
    select 'Permisos (módulo × acción)', count(*)::text, count(*) = 35 from public.permisos
    union all
    select 'Roles', string_agg(nombre, ', ' order by nombre), count(*) >= 3 from public.roles
    union all
    select 'Marcas / bodegas / métodos de pago',
           (select count(*) from public.marcas) || ' / ' || (select count(*) from public.bodegas) || ' / ' || (select count(*) from public.metodos_pago),
           (select count(*) from public.marcas) > 0 and (select count(*) from public.bodegas) > 0 and (select count(*) from public.metodos_pago) > 0
    union all
    select 'Cuentas de caja (saldo total)', count(*) || ' cuentas · $' || coalesce(round(sum(saldo)), 0), count(*) > 0 from public.v_saldos_caja
    union all
    select 'Medios de pago sin cuenta de caja', coalesce(string_agg(nombre, ', '), 'ninguno'), count(*) = 0 from public.metodos_pago where cuenta_id is null
    union all
    select 'Configuración del negocio', coalesce(max(nombre_negocio) || ' · recargo ' || max(recargo_credito_pct) || '%', 'falta'), count(*) = 1
      from public.configuracion
    union all
    select 'Plantillas de WhatsApp', count(*)::text, count(*) = 4 from public.plantillas_mensaje
    union all
    select 'Productos con stock (informativo)', count(*)::text, true from public.v_inventario where stock > 0
  loop
    insert into _chequeo (chequeo, resultado, ok) values (chk.c, chk.r, chk.ok);
  end loop;

  -- 3. Usuario administrador ----------------------------------------------
  select p.id, p.nombre into v_admin, v_nombre
    from public.perfiles p join public.roles r on r.id = p.rol_id
   where r.es_admin and p.activo order by p.created_at limit 1;

  insert into _chequeo (chequeo, resultado, ok)
  values ('Usuario administrador', coalesce(v_nombre, 'No hay. Crea tu usuario en Authentication → Users'), v_admin is not null);

  if v_admin is null then return; end if;

  -- 4. Prueba funcional como el administrador (se deshace al final) ------
  select producto_id, bodega_id, stock into v_prod, v_bod, v_stock0
    from public.v_inventario where stock > 0 order by stock desc limit 1;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select jsonb_array_length(public.mi_sesion() -> 'permisos') into v_permisos;

    if v_prod is not null then
      v_venta := public.registrar_venta(jsonb_build_object(
        'forma_pago', 'contado', 'cliente_nombre', 'Prueba de verificación',
        'items', jsonb_build_array(jsonb_build_object('producto_id', v_prod, 'bodega_id', v_bod, 'cantidad', 1))));
      select codigo, total into v_codigo, v_total from public.v_ventas where id = v_venta;
      select stock into v_stock1 from public.existencias where producto_id = v_prod and bodega_id = v_bod;
    end if;

    raise exception 'deshacer_prueba';
  exception when others then
    if sqlerrm <> 'deshacer_prueba' then v_error := sqlerrm; end if;
  end;

  insert into _chequeo (chequeo, resultado, ok) values
    ('Sesión del admin (mi_sesion)', coalesce(v_permisos || ' permisos', 'error'), v_permisos = 35),
    ('Venta de prueba (se deshizo)',
       case when v_prod is null and v_error is null then 'Omitida: aún no hay productos con stock'
            else coalesce(v_error, v_codigo || ' por $' || round(v_total) || ' · stock ' || v_stock0 || ' → ' || v_stock1) end,
       v_error is null and (v_prod is null or v_stock1 = v_stock0 - 1));
end $$;

select chequeo as "Chequeo", resultado as "Resultado", case when ok then '✅' else '❌' end as "OK"
  from _chequeo order by n;
