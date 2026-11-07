import type { AppData, OrderLine } from '../../../types'
import type { Result } from '../../../store/AppStore'
import { today } from '../../../lib/dates'
import { firstName, uid } from '../../../lib/format'

export interface SupplierForm { id?: string; name: string; brands: string[]; contact: string; wa: string; auto: boolean }

export function saveSupplier(d: AppData, f: SupplierForm): Result {
  if (!f.name.trim()) return { data: d, error: 'Escribe el nombre del proveedor' }
  if (!f.brands.length) return { data: d, error: 'Elige al menos una marca' }
  const info = { name: f.name.trim(), brands: f.brands, contact: f.contact.trim(), wa: f.wa.trim(), auto: f.auto }
  if (f.id) return { data: { ...d, suppliers: d.suppliers.map(s => (s.id === f.id ? { ...s, ...info } : s)) }, msg: 'Proveedor ' + info.name + ' actualizado' }
  return { data: { ...d, suppliers: [...d.suppliers, { id: uid('s'), ...info }] }, msg: 'Proveedor ' + info.name + ' creado' }
}

export function deleteSupplier(d: AppData, id: string): Result {
  const s = d.suppliers.find(x => x.id === id)
  if (!s) return { data: d, error: 'Proveedor no encontrado' }
  if (d.orders.some(o => o.sup === id && o.status !== 'Recibido'))
    return { data: d, error: s.name + ' tiene pedidos en curso. Recíbelos o elimínalos primero.' }
  return { data: { ...d, suppliers: d.suppliers.filter(x => x.id !== id) }, msg: 'Proveedor ' + s.name + ' eliminado' }
}

/** Cambia cantidades de un pedido que aún no se ha recibido */
export function updateOrder(d: AppData, id: string, lines: OrderLine[]): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  if (o.status === 'Recibido') return { data: d, error: 'Un pedido recibido ya sumó al inventario y no se puede modificar' }
  if (!lines.length) return { data: d, error: 'El pedido debe tener al menos un producto' }
  return { data: { ...d, orders: d.orders.map(x => (x.id === id ? { ...x, lines } : x)) }, msg: 'Pedido ' + id + ' actualizado' }
}

/** Borra el pedido. Si ya fue recibido, el stock que sumó se mantiene. */
export function deleteOrder(d: AppData, id: string): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  return { data: { ...d, orders: d.orders.filter(x => x.id !== id) }, msg: 'Pedido ' + id + ' eliminado' + (o.status === 'Recibido' ? ' del historial' : '') }
}

export function toggleAuto(d: AppData, supId: string): Result {
  const sup = d.suppliers.find(x => x.id === supId)!
  return {
    data: { ...d, suppliers: d.suppliers.map(x => (x.id === supId ? { ...x, auto: !x.auto } : x)) },
    msg: sup.name + ': pedido ' + (sup.auto ? 'manual' : 'automático'),
  }
}

export function orderText(d: AppData, supId: string, lines: OrderLine[]) {
  const sup = d.suppliers.find(x => x.id === supId)!
  const list = lines.map(l => {
    const p = d.products.find(x => x.id === l.pid)!
    return '\n- ' + p.name + ' (' + p.code + ') talla ' + p.size + ', color ' + p.color + ': ' + l.qty + ' und'
  }).join('')
  return 'Hola ' + firstName(sup.contact) + ', te escribimos de ZAHO. Necesitamos hacer un pedido:' + list + '\n¿Nos confirmas disponibilidad y fecha de entrega?'
}

export function sendOrder(d: AppData, supId: string, lines: OrderLine[]): Result {
  if (!lines.length) return { data: d, error: 'El pedido no tiene productos' }
  const n = d.seq.order + 1
  const sup = d.suppliers.find(x => x.id === supId)!
  return {
    data: { ...d, orders: [{ id: 'O-' + n, date: today(), sup: supId, lines, status: 'Enviado', auto: false }, ...d.orders], seq: { ...d.seq, order: n } },
    msg: 'Pedido O-' + n + ' enviado a ' + sup.name,
  }
}

export function advanceOrder(d: AppData, id: string): Result {
  const o = d.orders.find(x => x.id === id)!
  if (o.status === 'Enviado')
    return { data: { ...d, orders: d.orders.map(x => (x.id === id ? { ...x, status: 'Confirmado' as const } : x)) }, msg: id + ' confirmado por el proveedor' }
  if (o.status === 'Confirmado') {
    const add: Record<string, number> = {}
    o.lines.forEach(l => (add[l.pid] = (add[l.pid] || 0) + l.qty))
    const units = o.lines.reduce((a, l) => a + l.qty, 0)
    return {
      data: {
        ...d,
        products: d.products.map(p => (add[p.id] ? { ...p, stock: p.stock + add[p.id] } : p)),
        orders: d.orders.map(x => (x.id === id ? { ...x, status: 'Recibido' as const } : x)),
      },
      msg: id + ' recibido · +' + units + ' und al inventario',
    }
  }
  return { data: d }
}
