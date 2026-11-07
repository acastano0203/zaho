import type { AppData, Product } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { num } from '../../../lib/format'
import { autoOrders } from '../../../lib/finance'

export interface ProductForm { code: string; brand: string; name: string; cat: string; size: string; color: string; wh: string; stock: string; min: string; cost: string; price: string }

export function createProduct(d: AppData, f: ProductForm): Result & { product?: Product } {
  if (!f.name.trim() || !num(f.price)) return { data: d, error: 'Nombre y precio son obligatorios' }
  const n = d.seq.prod + 1
  const product: Product = {
    id: 'p' + n, code: f.code.trim() || 'ZH-' + n, brand: f.brand, name: f.name.trim(), cat: f.cat, size: f.size,
    color: f.color.trim() || '—', wh: f.wh, stock: num(f.stock), min: num(f.min), cost: num(f.cost), price: num(f.price),
  }
  return { data: { ...d, products: [product, ...d.products], seq: { ...d.seq, prod: n } }, product, msg: 'Producto ' + product.code + ' creado' }
}

export function updateProduct(d: AppData, id: string, f: ProductForm): Result {
  if (!f.name.trim() || !num(f.price)) return { data: d, error: 'Nombre y precio son obligatorios' }
  const products = d.products.map(p => p.id === id ? {
    ...p, code: f.code.trim() || p.code, brand: f.brand, name: f.name.trim(), cat: f.cat, size: f.size, color: f.color.trim() || '—',
    wh: f.wh, stock: num(f.stock), min: num(f.min), cost: num(f.cost), price: num(f.price),
  } : p)
  const a = autoOrders(d, d.products, products)
  return { data: { ...d, products, orders: a.orders, seq: a.seq }, msg: a.msg || 'Producto ' + (f.code || '') + ' actualizado' }
}

/** Solo se elimina si no aparece en ventas ni en pedidos en curso */
export function deleteProduct(d: AppData, id: string): Result {
  const p = d.products.find(x => x.id === id)
  if (!p) return { data: d, error: 'Producto no encontrado' }
  if (d.sales.some(s => s.items.some(i => i.pid === id)))
    return { data: d, error: p.name + ' tiene ventas registradas. Para sacarlo de la tienda ajusta su stock a 0.' }
  if (d.orders.some(o => o.status !== 'Recibido' && o.lines.some(l => l.pid === id)))
    return { data: d, error: p.name + ' está en un pedido en curso. Elimina o recibe ese pedido primero.' }
  return {
    data: { ...d, products: d.products.filter(x => x.id !== id), orders: d.orders.map(o => ({ ...o, lines: o.lines.filter(l => l.pid !== id) })).filter(o => o.lines.length) },
    msg: 'Producto ' + p.code + ' eliminado',
  }
}

export function adjustStock(d: AppData, pid: string | undefined, qtyRaw: string, motivo: string): Result {
  if (!pid) return { data: d, error: 'Elige un producto' }
  const p = d.products.find(x => x.id === pid)!
  const qty = num(qtyRaw)
  const products = d.products.map(x => (x.id === pid ? { ...x, stock: qty } : x))
  const a = autoOrders(d, d.products, products)
  return {
    data: { ...d, products, orders: a.orders, seq: a.seq },
    msg: a.msg || 'Stock de ' + p.name + ' T' + p.size + ': ' + p.stock + ' → ' + qty + ' (' + motivo + ')',
  }
}

export const otherWarehouse = (wh: string) => (wh === 'Local ZAHO' ? 'Bodega Principal' : 'Local ZAHO')

export function transfer(d: AppData, pid: string | undefined, qtyRaw: string): Result {
  if (!pid) return { data: d, error: 'Elige un producto' }
  const p = d.products.find(x => x.id === pid)!
  const qty = num(qtyRaw)
  if (!qty || qty > p.stock) return { data: d, error: 'Hay ' + p.stock + ' und disponibles en ' + p.wh }
  const to = otherWarehouse(p.wh)
  let products = d.products.map(x => (x.id === p.id ? { ...x, stock: x.stock - qty } : x))
  let seq = d.seq
  const tgt = products.find(x => x.code === p.code && x.wh === to)
  if (tgt) products = products.map(x => (x.id === tgt.id ? { ...x, stock: x.stock + qty } : x))
  else {
    const n = seq.prod + 1
    seq = { ...seq, prod: n }
    products = products.concat([{ ...p, id: 'p' + n, wh: to, stock: qty }])
  }
  return { data: { ...d, products, seq }, msg: qty + ' und de ' + p.name + ' T' + p.size + ' trasladadas a ' + to }
}
