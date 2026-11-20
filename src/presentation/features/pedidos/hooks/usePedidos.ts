import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { advanceOrder as confirmOrderUC, receiveOrder as receiveOrderUC } from '../../../../application/use-cases/inventario'
import { suggestionsFor, supplierOf } from '../../../../domain/rules/finance'
import { skuInOpenOrder } from '../../../../domain/rules/pedidos'
import type { Order, OrderLine } from '../../../../domain/entities'
import { confirmOrder, deleteOrder, receiveOrder, sendOrder, updateOrder } from '../services/ordersService'

const num = (o: Order) => Number(o.id.replace(/\D/g, '')) || 0
const newestFirst = (a: Order, b: Order) => (a.date < b.date ? 1 : a.date > b.date ? -1 : num(b) - num(a))

export function usePedidosView() {
  const { data } = useApp()
  return useMemo(() => {
    const groups = data.suppliers.map(sup => ({ sup, products: suggestionsFor(data, sup.id) })).filter(g => g.products.length > 0)
    // Bajo el mínimo pero su marca no tiene proveedor: no se pueden pedir todavía
    const sinProveedor = data.products.filter(p => p.stock < p.min && !skuInOpenOrder(data, p) && !supplierOf(data, p))
    const enCamino = data.orders.filter(o => o.status !== 'Recibido').sort(newestFirst)
    const historial = data.orders.filter(o => o.status === 'Recibido').sort(newestFirst)
    const refs = groups.reduce((a, g) => a + g.products.length, 0)
    const unidadesEnCamino = enCamino.reduce((a, o) => a + o.lines.reduce((x, l) => x + l.qty, 0), 0)
    return { groups, sinProveedor, enCamino, historial, refs, unidadesEnCamino }
  }, [data])
}

export function useOrderActions() {
  const { commit } = useApp()
  return {
    send: (sup: string, lines: OrderLine[], wh: string) => commit(d => sendOrder(d, sup, lines, wh), (r, _b, after) => r.orders.send(sup, after.orders[0].lines, wh)),
    confirm: (id: string) => commit(d => confirmOrder(d, id), async r => must(await confirmOrderUC(r, id))),
    receive: (id: string, received: OrderLine[]) => commit(d => receiveOrder(d, id, received), async r => must(await receiveOrderUC(r, id, received))),
    updateOrder: (id: string, lines: OrderLine[]) => commit(d => updateOrder(d, id, lines),
      (r, _b, after) => r.orders.updateLines(id, after.orders.find(o => o.id === id)?.lines ?? lines)),
    removeOrder: (id: string) => commit(d => deleteOrder(d, id), r => r.orders.remove(id)),
  }
}
