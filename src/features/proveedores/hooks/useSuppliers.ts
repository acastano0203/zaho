import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { suggestionsFor } from '../../../lib/finance'
import type { OrderLine } from '../../../types'
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
    toggle: (id: string) => commit(d => toggleAuto(d, id)),
    send: (sup: string, lines: OrderLine[]) => commit(d => sendOrder(d, sup, lines)),
    advance: (id: string) => commit(d => advanceOrder(d, id)),
    saveSupplier: (f: SupplierForm) => commit(d => saveSupplier(d, f)),
    removeSupplier: (id: string) => commit(d => deleteSupplier(d, id)),
    updateOrder: (id: string, lines: OrderLine[]) => commit(d => updateOrder(d, id, lines)),
    removeOrder: (id: string) => commit(d => deleteOrder(d, id)),
  }
}
