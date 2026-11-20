import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { suggestionsFor } from '../../../../domain/rules/finance'
import { plus } from '../../../../shared/lib/dates'
import { deleteBrand, saveBrand, type BrandForm } from '../services/brandsService'

/** Una fila por marca con su proveedor y cómo va en inventario y ventas */
export function useBrandsView(q = '') {
  const { data } = useApp()
  return useMemo(() => {
    const desde = plus(-30)
    const nq = q.trim().toLocaleLowerCase('es')
    const rows = data.brands
      .filter(b => !nq || b.name.toLocaleLowerCase('es').includes(nq))
      .map(brand => {
        const prods = data.products.filter(p => p.brand === brand.name)
        const pids = new Set(prods.map(p => p.id))
        const sup = data.suppliers.find(s => s.brands.includes(brand.name))
        const sold = data.sales.filter(s => s.date >= desde)
          .reduce((a, s) => a + s.items.filter(it => pids.has(it.pid)).reduce((x, it) => x + it.qty, 0), 0)
        const pending = sup ? suggestionsFor(data, sup.id).filter(p => p.brand === brand.name).length : 0
        return {
          brand, sup, pending, sold30: sold,
          refs: new Set(prods.map(p => p.skuId ?? p.code)).size,
          units: prods.reduce((a, p) => a + p.stock, 0),
          value: prods.reduce((a, p) => a + p.stock * p.cost, 0),
          low: prods.filter(p => p.stock < p.min).length,
        }
      })
      .sort((a, b) => b.units - a.units || a.brand.name.localeCompare(b.brand.name, 'es'))
    const sinProveedor = data.brands.filter(b => !data.suppliers.some(s => s.brands.includes(b.name))).length
    return { rows, total: data.brands.length, sinProveedor }
  }, [data, q])
}

export function useBrandActions() {
  const { commit } = useApp()
  return {
    save: (f: BrandForm) => commit(d => saveBrand(d, f), r => r.brands.save({ id: f.id, name: f.name.trim().replace(/\s+/g, ' '), color: f.color })),
    remove: (id: string) => commit(d => deleteBrand(d, id), r => r.brands.remove(id)),
  }
}
