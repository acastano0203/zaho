/**
 * Reglas de pedidos a proveedores (dominio puro).
 *
 * Un Product de la app es "referencia en una bodega". Un pedido se hace por
 * referencia y llega a UNA bodega: al recibirlo se suma al stock que ya hay
 * de esa referencia en esa bodega (stock = stock + recibido). Nunca crea
 * una referencia nueva; si la referencia aún no tenía stock en esa bodega,
 * se abre su existencia ahí con lo recibido.
 */
import type { AppData, Order, OrderLine, Product, Seq } from '../entities'

/** Identidad de la referencia, sin importar la bodega */
export const skuOf = (p: Product) => p.skuId ?? p.code

/** Producto de una línea; si no está en esa bodega, la misma referencia en otra */
export function lineProduct(d: Pick<AppData, 'products'>, pid: string): Product | undefined {
  const exact = d.products.find(p => p.id === pid)
  if (exact) return exact
  const sku = pid.includes(':') ? pid.split(':')[0] : null
  return sku ? d.products.find(p => p.skuId === sku) : undefined
}

/** La referencia en la bodega indicada (si ya existe ahí) */
export function inWarehouse(d: Pick<AppData, 'products'>, p: Product, wh: string): Product | undefined {
  const sku = skuOf(p)
  return d.products.find(x => skuOf(x) === sku && x.wh === wh)
}

/** Bodega de llegada de un pedido (los pedidos viejos no la guardaban) */
export const orderWarehouse = (d: Pick<AppData, 'products'>, o: Order) =>
  o.wh ?? lineProduct(d, o.lines[0]?.pid ?? '')?.wh ?? ''

/**
 * Deja una línea por referencia apuntando a la bodega de llegada
 * (si la misma referencia aparece dos veces, se suman las cantidades).
 */
export function normalizeLines(d: Pick<AppData, 'products'>, lines: OrderLine[], wh: string): OrderLine[] {
  const out = new Map<string, OrderLine>()
  for (const l of lines) {
    if (l.qty <= 0) continue
    const p = lineProduct(d, l.pid)
    if (!p) continue
    const target = inWarehouse(d, p, wh) ?? p
    const k = skuOf(p)
    const prev = out.get(k)
    out.set(k, { pid: target.id, qty: (prev?.qty ?? 0) + l.qty })
  }
  return [...out.values()]
}

/** ¿Esta referencia ya está en un pedido sin recibir? (en cualquier bodega) */
export function skuInOpenOrder(d: Pick<AppData, 'products' | 'orders'>, p: Product, exceptOrderId?: string) {
  const sku = skuOf(p)
  return d.orders.some(o => o.id !== exceptOrderId && o.status !== 'Recibido' &&
    o.lines.some(l => { const lp = lineProduct(d, l.pid); return !!lp && skuOf(lp) === sku }))
}

export interface StockChange { product: Product; before: number; after: number; nueva: boolean }

/**
 * Suma lo recibido al inventario de la bodega de llegada.
 * Devuelve los productos actualizados y el detalle de cada cambio.
 */
export function applyReception(d: Pick<AppData, 'products' | 'seq'>, received: OrderLine[], wh: string):
  { products: Product[]; seq: Seq; changes: StockChange[] } {
  let products = d.products.slice()
  let n = d.seq.prod
  const changes: StockChange[] = []
  for (const l of received) {
    if (l.qty <= 0) continue
    const p = lineProduct({ products }, l.pid)
    if (!p) continue
    const target = inWarehouse({ products }, p, wh)
    if (target) {
      products = products.map(x => (x.id === target.id ? { ...x, stock: x.stock + l.qty } : x))
      changes.push({ product: target, before: target.stock, after: target.stock + l.qty, nueva: false })
    } else {
      // Misma referencia (mismo código), primera vez en esta bodega
      n += 1
      const created: Product = { ...p, id: 'p' + n, wh, stock: l.qty, skuId: p.skuId, whId: undefined }
      products = [created, ...products]
      changes.push({ product: created, before: 0, after: l.qty, nueva: true })
    }
  }
  return { products, seq: { ...d.seq, prod: n }, changes }
}
