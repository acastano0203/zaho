import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { createProduct as createProductUC, transferStock } from '../../../../application/use-cases/inventario'
import { WAREHOUSES } from '../../../../shared/lib/constants'
import { norm, num } from '../../../../shared/lib/format'
import { productStatus } from '../../../../domain/rules/finance'
import { adjustStock, createProduct, deleteProduct, otherWarehouse, transfer, updateProduct, type ProductForm } from '../services/inventoryService'

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

const cmd = (f: ProductForm) => ({
  code: f.code.trim(), name: f.name.trim(), brand: f.brand, cat: f.cat, size: f.size, color: f.color.trim() || '—',
  cost: num(f.cost), price: num(f.price), warehouse: f.wh, stock: num(f.stock), min: num(f.min),
})

export function useInventoryActions() {
  const { commit } = useApp()
  return {
    create: (f: ProductForm) => {
      let created: ReturnType<typeof createProduct>['product']
      const ok = commit(d => { const r = createProduct(d, f); created = r.product; return r },
        async r => must(await createProductUC(r, { ...cmd(f), code: created?.code ?? f.code })))
      return ok ? created : undefined
    },
    update: (id: string, f: ProductForm) => commit(d => updateProduct(d, id, f), async (r, before) => {
      const p = before.products.find(x => x.id === id)
      if (!p) throw new Error('Producto no encontrado')
      if (f.wh !== p.wh) throw new Error('Para cambiar de bodega usa Trasladar')
      const c = cmd(f)
      await r.products.update(id, { ...c, code: c.code || p.code })
      // El formulario también permite cambiar el stock: se registra como ajuste en el kardex
      if (c.stock !== p.stock) await r.products.adjustStock(id, c.stock, 'Edición del producto')
    }),
    remove: (id: string) => commit(d => deleteProduct(d, id), r => r.products.remove(id)),
    adjust: (pid: string | undefined, qty: string, motivo: string) => commit(d => adjustStock(d, pid, qty, motivo),
      async r => { if (pid) await r.products.adjustStock(pid, num(qty), motivo) }),
    transfer: (pid: string | undefined, qty: string) => commit(d => transfer(d, pid, qty), async (r, before) => {
      const p = before.products.find(x => x.id === pid)
      if (p) must(await transferStock(r, p, otherWarehouse(p.wh), num(qty)))
    }),
  }
}
