import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { registerExpense, registerLoan } from '../../../../application/use-cases/salidas'
import { planPreview } from '../../../../domain/rules/finance'
import { num } from '../../../../shared/lib/format'
import { findClient } from '../../ventas/services/salesService'
import { today } from '../../../../shared/lib/dates'
import { computeBalance, typeColors, type BalPeriod } from '../services/balanceService'
import { deleteSalida, saveSalida, updateSalida, type SalidaEditForm, type SalidaForm } from '../services/salidasService'

export function useSalidasView(filter: string) {
  const { data } = useApp()
  return useMemo(() => {
    const tc = typeColors(data)
    const rows = data.salidas.filter(g => !filter || g.tipo === filter)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1))
    const T = today()
    const todayTotal = data.salidas.filter(g => g.date === T).reduce((a, g) => a + g.val, 0)
    return { ...tc, rows, todayTotal, all: data.salidas }
  }, [data, filter])
}

export function useBalance(p: BalPeriod) {
  const { data } = useApp()
  return useMemo(() => computeBalance(data, p), [data, p])
}

export function useSalidaActions() {
  const { commit } = useApp()
  return {
    update: (id: string, f: SalidaEditForm) => commit(d => updateSalida(d, id, f), async (r, _b, after) => {
      const g = after.salidas.find(x => x.id === id)
      if (g) await r.salidas.update(id, { tipo: g.tipo, otro: g.otro, desc: g.desc, val: g.val, date: g.date, met: g.met })
    }),
    remove: (id: string) => commit(d => deleteSalida(d, id), r => r.salidas.remove(id)),
    save: (f: SalidaForm) => {
      let cid: string | undefined
      const ok = commit(d => { const r = saveSalida(d, f); cid = r.cid; return r }, async (r, before, after) => {
        const val = num(f.val)
        if (f.kind === 'deuda') {
          // Cliente: el existente con ese nombre o el que se acaba de crear
          const prev = findClient(before, f.to)
          const kc = prev ?? findClient(after, f.to)
          if (kc && !prev) await r.clients.save({ newId: kc.id, name: kc.name, phone: kc.phone, doc: '', city: '', note: '' })
          const ab = Math.min(num(f.abono), val), saldo = val - ab
          const plan = f.mode === 'multi' && saldo > 0 ? { freq: f.freq, cuotas: planPreview(saldo, f.n, f.freq, f.first) } : null
          await r.cartera.createManual({
            clientId: kc?.id ?? null, client: kc?.name ?? f.to.trim(), phone: f.toPhone.trim() || kc?.phone || '', comercialId: f.com || null,
            total: val, concepto: f.concepto.trim() || 'Cuenta por cobrar', nota: f.desc.trim(), date: f.date,
            due: plan ? plan.cuotas[plan.cuotas.length - 1].due : f.dev, initialPayment: ab, method: f.met, plan,
          })
          return
        }
        if (f.kind === 'prestamo')
          return must(await registerLoan(r, {
            to: f.to, phone: f.toPhone, amount: val, method: f.met, date: f.date, due: f.dev, note: f.desc.trim(),
            mode: f.mode, n: f.n, freq: f.freq, first: f.first,
          }))
        const desc = f.desc.trim() || f.sub || 'Sin descripción'
        return must(await registerExpense(r, { date: f.date, tipo: f.tipo === 'prestamo' ? 'otro' : f.tipo, otro: f.otro, desc, amount: val, method: f.met, file: null }))
      })
      return { ok, cid }
    },
  }
}
