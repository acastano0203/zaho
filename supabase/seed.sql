-- =====================================================================
--  ZAHO · Datos iniciales: configuración y catálogos (sin datos de ejemplo)
--  Ejecutar DESPUÉS de la migración del esquema.
--  Los inserts usan el rol del editor SQL (postgres), que ignora RLS.
-- =====================================================================

-- Configuración y plantillas -----------------------------------------
insert into public.configuracion (id, nombre_negocio, recargo_credito_pct, resumen_diario)
values (true, 'ZAHO', 10, true)
on conflict (id) do nothing;

insert into public.plantillas_mensaje (clave, texto) values
  ('recordatorio', 'Hola {nombre}, te escribimos de ZAHO. Tu saldo de ${saldo} vence el {fecha}. Puedes pagar por Nequi o Bancolombia. Cualquier cosa nos escribes. Gracias.'),
  ('vencida',      'Hola {nombre}, te escribimos de ZAHO. Tu saldo de ${saldo} venció el {fecha}. ¿Nos ayudas a ponerte al día esta semana? Puedes pagar por Nequi o Bancolombia. Gracias.'),
  ('gracias',      'Hola {nombre}, recibimos tu pago. Tu cuenta con ZAHO quedó al día. Gracias por la confianza.'),
  ('prestamo',     'Hola {nombre}, te escribimos de ZAHO. Te recordamos que el préstamo de ${saldo} se devuelve el {fecha}. Puedes hacerlo por Nequi o Bancolombia. Gracias.')
on conflict (clave) do nothing;

-- Catálogos ----------------------------------------------------------
insert into public.marcas (nombre, color) values ('Nike', '#2B2826'), ('Adidas', '#4A5A72'), ('Calvin Klein', '#8A837C')
on conflict (nombre) do nothing;

insert into public.categorias (nombre) values ('Jeans'), ('Blusas'), ('Camisetas'), ('Vestidos'), ('Zapatos')
on conflict (nombre) do nothing;

insert into public.bodegas (nombre, es_punto_venta) values ('Bodega Principal', false), ('Local ZAHO', true)
on conflict (nombre) do nothing;

insert into public.metodos_pago (nombre, orden) values
  ('Efectivo', 1), ('Nequi', 2), ('Bancolombia', 3), ('Transferencia', 4), ('Tarjeta', 5)
on conflict (nombre) do nothing;

-- Caja: cuentas por defecto (solo si no hay) y a qué cuenta entra cada medio de pago
-- (requiere la migración 3; no cambia asignaciones que ya existan)
insert into public.cuentas_dinero (nombre, tipo, orden)
select v.nombre, v.tipo::public.tipo_cuenta_dinero, v.orden
  from (values ('Caja general', 'efectivo', 1), ('Nequi', 'billetera', 2), ('Bancolombia', 'banco', 3)) v(nombre, tipo, orden)
 where not exists (select 1 from public.cuentas_dinero);

update public.metodos_pago mp set cuenta_id = c.id
  from public.cuentas_dinero c
 where mp.cuenta_id is null
   and c.nombre = case mp.nombre when 'Efectivo' then 'Caja general' when 'Nequi' then 'Nequi' else 'Bancolombia' end;
