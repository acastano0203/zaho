-- =====================================================================
--  ZAHO · Limpieza de datos
--  Borra TODOS los datos de negocio y de prueba, y todos los usuarios
--  excepto el que se indica abajo, que queda como Administrador activo.
--
--  Se conserva (es configuración, no datos):
--    · roles base (Administrador, Vendedor, Cobrador) y catálogo de permisos
--    · configuración del negocio y plantillas de WhatsApp
--    · catálogos: marcas, categorías, bodegas, métodos de pago y cuentas de caja (saldo en 0)
--
--  Pegar en Supabase → SQL Editor → Run.  NO SE PUEDE DESHACER.
--  Si algo falla, no se borra nada (todo el borrado es un solo bloque atómico).
-- =====================================================================
do $$
declare
  c_email constant text := 'acastano0203@gmail.com';   -- ← usuario que se conserva
  v_id    uuid;
  v_admin uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(c_email);
  if v_id is null then
    raise exception 'No existe el usuario % en Authentication → Users. No se borró nada.', c_email;
  end if;

  -- El usuario conservado queda como Administrador activo (antes de borrar a los demás)
  select id into v_admin from public.roles where es_admin;
  update public.perfiles set rol_id = v_admin, activo = true, comercial_id = null where id = v_id;
  if not found then
    insert into public.perfiles (id, nombre, email, rol_id, activo)
    values (v_id, split_part(c_email, '@', 1), c_email, v_admin, true);
  end if;

  -- Caja (las cuentas se conservan; su saldo inicial vuelve a 0 y abren hoy)
  delete from public.movimientos_caja;
  delete from public.cierres_caja;
  update public.cuentas_dinero set saldo_inicial = 0, fecha_inicial = current_date;

  -- Cartera
  delete from public.recargos_cartera;
  delete from public.abono_aplicaciones;
  delete from public.abonos;
  delete from public.cuotas;
  delete from public.planes_pago;
  delete from public.gestiones_cobro;
  delete from public.cuentas_cobrar;

  -- Ventas, inventario y compras
  delete from public.movimientos_inventario;
  delete from public.venta_items;
  delete from public.ventas;
  delete from public.salidas;
  delete from public.pedido_items;
  delete from public.pedidos;
  delete from public.existencias;
  delete from public.productos;

  -- Maestros
  delete from public.proveedor_marcas;
  delete from public.proveedores;
  delete from public.clientes;
  update public.perfiles set comercial_id = null where comercial_id is not null;
  delete from public.comerciales;

  -- Usuarios: se borran de Auth (sus perfiles caen en cascada)
  delete from auth.users where id <> v_id;

  -- Roles creados durante las pruebas (se conservan los 3 base)
  delete from public.roles where nombre not in ('Administrador', 'Vendedor', 'Cobrador');

  -- Consecutivos desde el inicio: V-1001, G-01, O-101
  alter sequence public.ventas_numero_seq  restart with 1001;
  alter sequence public.salidas_numero_seq restart with 1;
  alter sequence public.cuentas_numero_seq restart with 1;
  alter sequence public.pedidos_numero_seq restart with 101;
  alter sequence public.movimientos_inventario_id_seq restart with 1;
end $$;

-- Resultado: todo en 0 excepto usuarios (1) y la configuración
select 'Usuarios' as tabla, count(*) as filas, string_agg(email, ', ') as detalle from public.perfiles
union all select 'Roles', count(*), string_agg(nombre, ', ' order by nombre) from public.roles
union all select 'Comerciales', count(*), null from public.comerciales
union all select 'Clientes', count(*), null from public.clientes
union all select 'Proveedores', count(*), null from public.proveedores
union all select 'Productos', count(*), null from public.productos
union all select 'Ventas', count(*), null from public.ventas
union all select 'Cuentas en cartera', count(*), null from public.cuentas_cobrar
union all select 'Salidas', count(*), null from public.salidas
union all select 'Pedidos', count(*), null from public.pedidos
union all select 'Movimientos de caja', count(*), null from public.movimientos_caja
union all select 'Cuentas de caja', count(*), string_agg(nombre || ' $' || saldo_inicial, ', ') from public.cuentas_dinero
union all select 'Marcas (catálogo)', count(*), string_agg(nombre, ', ' order by nombre) from public.marcas;
