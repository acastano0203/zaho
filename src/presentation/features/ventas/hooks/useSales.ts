import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { cancelSale, registerSale, type RegisterSaleInput } from '../../../../application/use-cases/ventas'
import { today, monthName } from '../../../../shared/lib/dates'
import { cap, cop, num } from '../../../../shared/lib/format'
import { saleCost, saleTotal } from '../../../../domain/rules/finance'
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

/** Datos de la venta para el caso de uso (RPC registrar_venta) */
const toInput = (d: SaleDraft): RegisterSaleInput => ({
  clientId: d.clientId, client: d.client, phone: d.phone, comercialId: d.com || null, items: d.items, pay: d.pay,
  due: d.due, initialPayment: num(d.abono), method: d.met, planMode: d.planMode, n: d.n, freq: d.freq, first: d.first,
})

export function useSaleActions() {
  const { commit } = useApp()
  return {
    save: (draft: SaleDraft) => commit(d => saveSale(d, draft), async (r, before) => {
      if (!draft.id) return must(await registerSale(r, toInput(draft)))
      // Editar = anular la venta original (devuelve stock) y registrarla de nuevo con otro código
      const cuenta = before.cartera.find(c => c.saleId === draft.id)
      if (cuenta?.abonos.some(a => a.label !== 'Abono inicial'))
        throw new Error('La venta ' + draft.id + ' ya tiene abonos en cartera. Para cambiarla, elimina primero esos abonos o registra una venta nueva.')
      must(await cancelSale(r, draft.id))
      if (draft.items.length) must(await registerSale(r, toInput(draft)))
    }),
    remove: (id: string) => commit(d => deleteSale(d, id), async r => must(await cancelSale(r, id))),
    /** Crea (o reutiliza) el cliente y devuelve su id */
    quickClient: (name: string, phone: string) => {
      let id: string | undefined
      let nuevo = false
      commit(d => { const r = quickClient(d, name, phone); id = r.client?.id; nuevo = !!r.msg; return r },
        async r => { if (nuevo && id) await r.clients.save({ newId: id, name, phone, doc: '', city: '', note: '' }) })
      return id
    },
  }
}
