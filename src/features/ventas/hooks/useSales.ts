import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { today, monthName } from '../../../lib/dates'
import { cap, cop } from '../../../lib/format'
import { saleCost, saleTotal } from '../../../lib/finance'
import { bySaleId, saleStatus } from '../../../lib/selectors'
import { deleteSale, quickClient, saveSale, type SaleDraft } from '../services/salesService'

export function useSalesList() {
  const { data, carRows } = useApp()
  return useMemo(() => {
    const T = today()
    const car = bySaleId(carRows)
    const rows = data.sales.slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1))
      .map(s => {
        const total = saleTotal(s), cost = saleCost(s, data.products)
        return { sale: s, total, cost, util: total - cost, utilPct: total ? Math.round(((total - cost) / total) * 100) : 0, status: saleStatus(s, car[s.id]), car: car[s.id] }
      })
    const month = rows.filter(r => r.sale.date.slice(0, 7) === T.slice(0, 7))
    const summary = cap(monthName()) + ': ' + month.length + ' ventas · ' + cop(month.reduce((a, r) => a + r.total, 0)) + ' · utilidad ' + cop(month.reduce((a, r) => a + r.util, 0))
    return { rows, summary }
  }, [data, carRows])
}

export function useSaleActions() {
  const { commit } = useApp()
  return {
    save: (draft: SaleDraft) => commit(d => saveSale(d, draft)),
    remove: (id: string) => commit(d => deleteSale(d, id)),
    /** Crea (o reutiliza) el cliente y devuelve su id */
    quickClient: (name: string, phone: string) => {
      let id: string | undefined
      commit(d => { const r = quickClient(d, name, phone); id = r.client?.id; return r })
      return id
    },
  }
}
