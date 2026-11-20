import type { AppData, OrderLine } from '../../../../domain/entities'
import type { Result } from '../../../store/AppStore'
import { today } from '../../../../shared/lib/dates'
import { firstName } from '../../../../shared/lib/format'
import { applyReception, lineProduct, normalizeLines, orderWarehouse } from '../../../../domain/rules/pedidos'

/** Cambia cantidades de un pedido que aún no se ha recibido */
export function updateOrder(d: AppData, id: string, lines: OrderLine[]): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  if (o.status === 'Recibido') return { data: d, error: 'Un pedido recibido ya sumó al inventario y no se puede modificar' }
  const clean = normalizeLines(d, lines, orderWarehouse(d, o))
  if (!clean.length) return { data: d, error: 'El pedido debe tener al menos un producto' }
  return { data: { ...d, orders: d.orders.map(x => (x.id === id ? { ...x, lines: clean } : x)) }, msg: 'Pedido ' + id + ' actualizado' }
}

/** Borra el pedido. Si ya fue recibido, el stock que sumó se mantiene. */
export function deleteOrder(d: AppData, id: string): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  return { data: { ...d, orders: d.orders.filter(x => x.id !== id) }, msg: 'Pedido ' + id + ' eliminado' + (o.status === 'Recibido' ? ' del historial' : '') }
}

export function orderText(d: AppData, supId: string, lines: OrderLine[], wh?: string) {
  const sup = d.suppliers.find(x => x.id === supId)!
  const list = lines.map(l => {
    const p = lineProduct(d, l.pid)
    return p ? '\n- ' + p.name + ' (' + p.code + ') talla ' + p.size + ', color ' + p.color + ': ' + l.qty + ' und' : ''
  }).join('')
  return 'Hola ' + firstName(sup.contact || sup.name) + ', te escribimos de ZAHO. Necesitamos hacer un pedido:' + list +
    (wh ? '\nEntrega en: ' + wh + '.' : '') + '\n¿Nos confirmas disponibilidad y fecha de entrega?'
}

export function sendOrder(d: AppData, supId: string, lines: OrderLine[], wh: string): Result {
  if (!wh) return { data: d, error: 'Elige a qué bodega llega el pedido' }
  const clean = normalizeLines(d, lines, wh)
  if (!clean.length) return { data: d, error: 'El pedido no tiene productos' }
  const n = d.seq.order + 1
  const sup = d.suppliers.find(x => x.id === supId)!
  return {
    data: { ...d, orders: [{ id: 'O-' + n, date: today(), sup: supId, lines: clean, status: 'Enviado', auto: false, wh }, ...d.orders], seq: { ...d.seq, order: n } },
    msg: 'Pedido O-' + n + ' enviado a ' + sup.name,
  }
}

/** Paso opcional: el proveedor confirmó el pedido */
export function confirmOrder(d: AppData, id: string): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  if (o.status !== 'Enviado') return { data: d, error: 'Solo se confirma un pedido enviado' }
  return { data: { ...d, orders: d.orders.map(x => (x.id === id ? { ...x, status: 'Confirmado' as const } : x)) }, msg: id + ' confirmado por el proveedor' }
}

/**
 * Recibe el pedido: suma lo que llegó al stock que ya hay de cada referencia
 * en la bodega de llegada (stock = stock + recibido) y lo pasa a Recibido.
 * El pedido queda con las cantidades realmente recibidas.
 */
export function receiveOrder(d: AppData, id: string, received: OrderLine[]): Result {
  const o = d.orders.find(x => x.id === id)
  if (!o) return { data: d, error: 'Pedido no encontrado' }
  if (o.status === 'Recibido') return { data: d, error: 'Este pedido ya fue recibido' }
  const got = received.filter(l => l.qty > 0)
  if (!got.length) return { data: d, error: 'Indica cuántas unidades llegaron' }
  const wh = orderWarehouse(d, o)
  const r = applyReception(d, got, wh)
  const units = got.reduce((a, l) => a + l.qty, 0)
  return {
    data: {
      ...d, products: r.products, seq: r.seq,
      orders: d.orders.map(x => (x.id === id ? { ...x, status: 'Recibido' as const, wh, lines: got.map(l => ({ ...l })) } : x)),
    },
    msg: id + ' recibido · +' + units + ' und en ' + wh,
  }
}
