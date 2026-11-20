/**
 * MAPPERS: traducen filas de la base de datos (snake_case, uuid, numeric)
 * a entidades del dominio (las que usa la UI) y viceversa.
 * Si cambia el esquema, solo se toca este archivo y los repositorios.
 */
import type {
  Abono, CarteraEntry, Cliente, Comercial, Cuota, Gestion, Order, OrderStatus, Product, Sale, Salida, SalidaTipo, Supplier,
} from '../../domain/entities'

/* ---------- ids compuestos: producto + bodega ---------- */
export const productKey = (skuId: string, whId: string) => skuId + ':' + whId
export function splitProductKey(key: string) {
  const [skuId, whId] = key.split(':')
  if (!skuId || !whId) throw new Error('Producto inválido: ' + key)
  return { skuId, whId }
}

const n = (v: unknown) => Number(v ?? 0)
const day = (ts: string) => ts.slice(0, 10)

/* ---------- filas ---------- */
export interface InventarioRow {
  producto_id: string; bodega_id: string; codigo: string; marca: string; nombre: string; categoria: string
  talla: string; color: string; bodega: string; stock: number; stock_minimo: number; costo: number | string; precio: number | string
}
export interface VentaRow {
  id: string; codigo: string; fecha: string; cliente_id: string | null; cliente_nombre: string; telefono: string | null
  comercial_id: string | null; forma_pago: 'contado' | 'credito'; metodo_pago_id: string | null
  venta_items: { producto_id: string; bodega_id: string; cantidad: number; precio_base: number | string }[]
}
export interface CuotaRow { id: string; numero: number; fecha_vencimiento: string; valor: number | string }
export interface CuentaRow {
  id: string; tipo: 'venta' | 'prestamo' | 'manual'; cliente_id: string | null; cliente_nombre: string; telefono: string | null
  comercial_id: string | null; fecha_creacion: string; fecha_vencimiento: string; valor_total: number | string | null
  concepto: string | null; nota: string | null; metodo_pago_id: string | null
  ventas: { codigo: string } | null
  salidas: { codigo: string } | null
  abonos: { id: string; fecha: string; valor: number | string; etiqueta: string; metodo_pago_id: string | null; plan_id: string | null; created_at: string; abono_aplicaciones: { cuota_id: string; valor: number | string }[] }[]
  planes_pago: { id: string; vigente: boolean; created_at: string; cuotas: CuotaRow[] }[]
  recargos_cartera?: { id: string; fecha: string; tipo: 'porcentaje' | 'valor'; porcentaje: number | string | null; base: number | string; valor: number | string; nota: string | null; created_at: string; cuotas: { numero: number } | null }[]
  gestiones_cobro: { fecha: string; tipo: string; nota: string; fecha_promesa: string | null; created_at: string }[]
}
export interface SalidaRow {
  codigo: string; fecha: string; tipo: SalidaTipo; tipo_otro: string | null; descripcion: string; valor: number | string
  metodo_pago_id: string | null; beneficiario: string | null; comprobante_path: string | null
}
export interface PedidoRow {
  codigo: string; fecha: string; proveedor_id: string; bodega_destino_id: string; estado: 'enviado' | 'confirmado' | 'recibido'
  automatico: boolean; pedido_items: { producto_id: string; cantidad: number }[]
}

/* ---------- a dominio ---------- */
export const toProduct = (r: InventarioRow): Product => ({
  id: productKey(r.producto_id, r.bodega_id), skuId: r.producto_id, whId: r.bodega_id,
  code: r.codigo, brand: r.marca, name: r.nombre, cat: r.categoria, size: r.talla, color: r.color, wh: r.bodega,
  stock: r.stock, min: r.stock_minimo, cost: n(r.costo), price: n(r.precio),
})

export const toSale = (r: VentaRow): Sale => ({
  id: r.codigo, date: r.fecha, client: r.cliente_nombre, clientId: r.cliente_id, phone: r.telefono ?? '',
  com: r.comercial_id ?? '', pay: r.forma_pago,
  items: r.venta_items.map(i => ({ pid: productKey(i.producto_id, i.bodega_id), qty: i.cantidad, price: n(i.precio_base) })),
})

export function toCartera(r: CuentaRow, methodName: (id: string | null) => string | undefined): CarteraEntry {
  const plan = r.planes_pago.find(p => p.vigente) ?? null
  const cuotas: Cuota[] | null = plan
    ? plan.cuotas.slice().sort((a, b) => a.numero - b.numero).map(q => ({ id: q.id, n: q.numero, due: q.fecha_vencimiento, amount: n(q.valor) }))
    : null
  const nByCuota = new Map((cuotas ?? []).map(q => [q.id!, q.n]))
  const abonosRows = r.abonos.slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const abonos: Abono[] = abonosRows.map(a => ({
    id: a.id, date: a.fecha, val: n(a.valor), label: a.etiqueta, met: methodName(a.metodo_pago_id),
    alloc: a.abono_aplicaciones.filter(x => nByCuota.has(x.cuota_id)).map(x => ({ n: nByCuota.get(x.cuota_id)!, val: n(x.valor) })),
  }))
  // Los abonos anteriores al plan vigente no se reparten entre sus cuotas
  const firstInPlan = plan ? abonosRows.findIndex(a => a.plan_id === plan.id) : -1
  const recs = (r.recargos_cartera ?? []).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const gestiones: Gestion[] = r.gestiones_cobro
    .slice().sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map(g => ({ date: g.fecha, tipo: g.tipo, nota: g.nota, promesa: g.fecha_promesa }))

  return {
    id: r.id, kind: r.tipo, saleId: r.ventas?.codigo, salidaId: r.salidas?.codigo,
    client: r.cliente_nombre, clientId: r.cliente_id, phone: r.telefono ?? '', com: r.comercial_id,
    created: r.fecha_creacion, due: r.fecha_vencimiento, total: r.valor_total == null ? undefined : n(r.valor_total),
    ref: r.tipo === 'prestamo' ? 'Préstamo ' + (r.salidas?.codigo ?? '') : r.concepto ?? undefined,
    concepto: r.concepto ?? undefined, nota: r.nota ?? undefined, met: methodName(r.metodo_pago_id),
    abonos, plan: cuotas, planId: plan?.id ?? null,
    recargos: recs.map(x => ({
      id: x.id, date: x.fecha, tipo: x.tipo === 'porcentaje' ? 'pct' as const : 'valor' as const, pct: x.porcentaje == null ? undefined : n(x.porcentaje),
      base: n(x.base), val: n(x.valor), cuota: x.cuotas?.numero ?? 1, nota: x.nota ?? '',
    })),
    // Los recargos creados antes del plan vigente ya quedaron dentro de sus cuotas
    recStart: plan ? recs.filter(x => x.created_at < plan.created_at).length : 0,
    planStart: plan ? (firstInPlan === -1 ? abonos.length : firstInPlan) : 0,
    gestiones,
  }
}

export const toSalida = (r: SalidaRow, methodName: (id: string | null) => string | undefined): Salida => ({
  id: r.codigo, date: r.fecha, tipo: r.tipo, otro: r.tipo_otro ?? '', desc: r.descripcion, val: n(r.valor),
  met: methodName(r.metodo_pago_id) ?? '', file: r.comprobante_path ?? '', to: r.beneficiario ?? '',
})

const STATUS: Record<PedidoRow['estado'], OrderStatus> = { enviado: 'Enviado', confirmado: 'Confirmado', recibido: 'Recibido' }
export const toOrder = (r: PedidoRow): Order => ({
  id: r.codigo, date: r.fecha, sup: r.proveedor_id, status: STATUS[r.estado], auto: r.automatico,
  lines: r.pedido_items.map(l => ({ pid: productKey(l.producto_id, r.bodega_destino_id), qty: l.cantidad })),
})

export const toCliente = (r: { id: string; nombre: string; telefono: string | null; documento: string | null; ciudad: string | null; nota: string | null; created_at: string }): Cliente => ({
  id: r.id, name: r.nombre, phone: r.telefono ?? '', doc: r.documento ?? '', city: r.ciudad ?? '', note: r.nota ?? '', created: day(r.created_at),
})

export const toComercial = (r: { id: string; nombre: string; telefono: string | null; comision_pct: number | string }): Comercial => ({
  id: r.id, name: r.nombre, phone: r.telefono ?? '', pct: n(r.comision_pct),
})

export const toSupplier = (r: {
  id: string; nombre: string; contacto: string | null; whatsapp: string | null
  tipo_documento: 'nit' | 'cc' | null; documento: string | null; email: string | null; direccion: string | null
  proveedor_marcas: { marcas: { nombre: string } | null }[]
}): Supplier => ({
  id: r.id, name: r.nombre, contact: r.contacto ?? '', wa: r.whatsapp ?? '',
  docType: r.tipo_documento ?? 'nit', doc: r.documento ?? '', email: r.email ?? '', address: r.direccion ?? '',
  brands: r.proveedor_marcas.map(m => m.marcas?.nombre).filter((x): x is string => !!x),
})

/* ---------- a base de datos ---------- */
export const cuotasToJson = (cuotas: Cuota[]) => cuotas.map(q => ({ numero: q.n, fecha_vencimiento: q.due, valor: q.amount }))
