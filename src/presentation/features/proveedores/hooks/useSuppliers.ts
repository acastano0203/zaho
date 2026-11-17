import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { advanceOrder as advanceOrderUC } from '../../../../application/use-cases/inventario'
import { suggestionsFor } from '../../../../domain/rules/finance'
import type { OrderLine } from '../../../../domain/entities'
import { advanceOrder, deleteOrder, deleteSupplier, saveSupplier, sendOrder, toggleAuto, updateOrder, type SupplierForm } from '../services/suppliersService'

export function useSuppliersView() {
  const { data } = useApp()
  return useMemo(() => {
    const groups = data.suppliers.map(sup => ({ sup, products: suggestionsFor(data, sup.id) })).filter(g => g.products.length > 0)
    const suppliers = data.suppliers.map(sup => ({
      sup, last: data.orders.filter(o => o.sup === sup.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    }))
    const orders = data.orders.slice().sort((a, b) => (a.id < b.id ? 1 : -1))
    const nOpen = data.orders.filter(o => o.status !== 'Recibido').length
    return { groups, suppliers, orders, summary: data.suppliers.length + ' proveedores · ' + nOpen + ' pedidos en curso' }
  }, [data])
}

export function useSupplierActions() {
  const { commit } = useApp()
  return {
    toggle: (id: string) => commit(d => toggleAuto(d, id), async (r, _b, after) => {
      const s = after.suppliers.find(x => x.id === id)
      if (s) await r.suppliers.save(s)
    }),
    send: (sup: string, lines: OrderLine[]) => commit(d => sendOrder(d, sup, lines), r => r.orders.send(sup, lines)),
    advance: (id: string) => commit(d => advanceOrder(d, id), async r => must(await advanceOrderUC(r, id))),
    saveSupplier: (f: SupplierForm) => commit(d => saveSupplier(d, f),
      r => r.suppliers.save({ id: f.id, name: f.name.trim(), brands: f.brands, contact: f.contact.trim(), wa: f.wa.trim(), auto: f.auto })),
    removeSupplier: (id: string) => commit(d => deleteSupplier(d, id), r => r.suppliers.remove(id)),
    updateOrder: (id: string, lines: OrderLine[]) => commit(d => updateOrder(d, id, lines), r => r.orders.updateLines(id, lines)),
    removeOrder: (id: string) => commit(d => deleteOrder(d, id), r => r.orders.remove(id)),
  }
}
