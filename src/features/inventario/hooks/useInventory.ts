import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { WAREHOUSES } from '../../../lib/constants'
import { norm } from '../../../lib/format'
import { productStatus } from '../../../lib/finance'
import { adjustStock, createProduct, deleteProduct, transfer, updateProduct, type ProductForm } from '../services/inventoryService'

export interface InvFilters { q: string; brand: string; wh: string; cat: string; size: string; st: string }
export const emptyFilters: InvFilters = { q: '', brand: '', wh: '', cat: '', size: '', st: '' }

export function useInventoryList(f: InvFilters) {
  const { data } = useApp()
  return useMemo(() => {
    const nq = norm(f.q)
    const list = data.products.filter(p =>
      (!nq || norm(p.name + ' ' + p.code).includes(nq)) && (!f.brand || p.brand === f.brand) && (!f.wh || p.wh === f.wh) &&
      (!f.cat || p.cat === f.cat) && (!f.size || p.size === f.size) && (!f.st || productStatus(p) === f.st))
    const units = data.products.reduce((a, p) => a + p.stock, 0)
    const summary = data.products.length + ' referencias · ' + units + ' unidades · ' + list.length + ' en vista'
    const bodegas = WAREHOUSES.map(w => {
      const ps = data.products.filter(p => p.wh === w)
      return {
        name: w, units: ps.reduce((a, p) => a + p.stock, 0), refs: ps.length, out: ps.filter(p => p.stock <= 0).length,
        cost: ps.reduce((a, p) => a + p.stock * p.cost, 0), sale: ps.reduce((a, p) => a + p.stock * p.price, 0),
      }
    })
    return { list, summary, bodegas }
  }, [data, f])
}

export function useInventoryActions() {
  const { commit } = useApp()
  return {
    create: (f: ProductForm) => {
      let created: ReturnType<typeof createProduct>['product']
      const ok = commit(d => { const r = createProduct(d, f); created = r.product; return r })
      return ok ? created : undefined
    },
    update: (id: string, f: ProductForm) => commit(d => updateProduct(d, id, f)),
    remove: (id: string) => commit(d => deleteProduct(d, id)),
    adjust: (pid: string | undefined, qty: string, motivo: string) => commit(d => adjustStock(d, pid, qty, motivo)),
    transfer: (pid: string | undefined, qty: string) => commit(d => transfer(d, pid, qty)),
  }
}
