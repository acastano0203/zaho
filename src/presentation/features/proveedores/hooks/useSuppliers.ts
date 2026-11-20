import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { deleteSupplier, saveSupplier, supplierInfo, type SupplierForm } from '../services/suppliersService'

export function useSuppliersView() {
  const { data } = useApp()
  return useMemo(() => {
    const suppliers = data.suppliers.map(sup => ({
      sup, last: data.orders.filter(o => o.sup === sup.id).sort((a, b) => (a.date < b.date ? 1 : -1))[0],
    }))
    return { suppliers, summary: data.suppliers.length + (data.suppliers.length === 1 ? ' proveedor' : ' proveedores') }
  }, [data])
}

export function useSupplierActions() {
  const { commit } = useApp()
  return {
    saveSupplier: (f: SupplierForm) => commit(d => saveSupplier(d, f), r => r.suppliers.save({ id: f.id, ...supplierInfo(f) })),
    removeSupplier: (id: string) => commit(d => deleteSupplier(d, id), r => r.suppliers.remove(id)),
  }
}
