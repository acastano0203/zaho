import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { today } from '../../../lib/dates'
import { saleTotal } from '../../../lib/finance'
import { deleteComercial, saveComercial, type ComercialForm } from '../services/comercialesService'

export function useComercialesList() {
  const { data, carRows } = useApp()
  return useMemo(() => {
    const T = today()
    const month = data.sales.filter(x => x.date.slice(0, 7) === T.slice(0, 7))
    return data.comerciales.map(c => {
      const sales = month.filter(x => x.com === c.id).reduce((a, x) => a + saleTotal(x), 0)
      const cart = carRows.filter(r => r.saldo > 0 && r.c.com === c.id).reduce((a, r) => a + r.saldo, 0)
      return { c, sales, comm: (sales * c.pct) / 100, cart }
    })
  }, [data, carRows])
}

export function useComercialActions() {
  const { commit } = useApp()
  return {
    save: (f: ComercialForm) => commit(d => saveComercial(d, f)),
    remove: (id: string) => commit(d => deleteComercial(d, id)),
  }
}
