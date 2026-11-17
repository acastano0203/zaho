import { useMemo } from 'react'
import { must, useApp } from '../../../store/AppStore'
import { buildCarRows } from '../../../../domain/rules/finance'
import { applyPaymentPlan, registerPayment, saveFollowUp } from '../../../../application/use-cases/cartera'
import { cop, norm } from '../../../../shared/lib/format'
import type { AppData, CarRow, Freq, TemplateKey } from '../../../../domain/entities'
import { addGestion, agregarRecargo, agregarRecargos, applyPlan, deleteCartera, eliminarRecargo, registerAbono, saveGestion, updateCartera, updateTemplate, type CarteraEditForm, type RecargoForm } from '../services/carteraService'

const ORDER = { ven: 0, pv: 1, ok: 2, pag: 3 }
export const matchCarFilter = (r: CarRow, st: string) => (st === 'all' ? true : st === 'prestamo' ? r.c.kind === 'prestamo' : r.st === st)

export function useCarteraList(filter: { q: string; st: string }) {
  const { carRows } = useApp()
  return useMemo(() => {
    const q = norm(filter.q)
    const rows = carRows.slice()
      .sort((a, b) => ORDER[a.st] - ORDER[b.st] || a.days - b.days)
      .filter(r => matchCarFilter(r, filter.st) && (!q || norm(r.c.client).includes(q)))
    const open = carRows.filter(r => r.saldo > 0)
    const sum = (arr: CarRow[]) => arr.reduce((a, r) => a + r.saldo, 0)
    const ven = open.filter(r => r.st === 'ven'), pv = open.filter(r => r.st === 'pv'), loans = open.filter(r => r.c.kind === 'prestamo')
    return {
      rows, all: carRows,
      summary: { total: sum(open), totalN: open.length, ven: sum(ven), venN: ven.length, pv: sum(pv), pvN: pv.length, pr: sum(loans), prN: loans.length },
    }
  }, [carRows, filter])
}

const rowOf = (d: AppData, cid: string) => {
  const r = buildCarRows(d).find(x => x.c.id === cid)
  if (!r) throw new Error('Cuenta no encontrada')
  return r
}
const entryOf = (d: AppData, cid: string) => d.cartera.find(x => x.id === cid)

export function useCarteraActions() {
  const { commit } = useApp()
  return {
    recargo: (cid: string, f: RecargoForm) => commit(d => agregarRecargo(d, cid, f), async (r, _b, after) => {
      const rec = entryOf(after, cid)?.recargos?.slice(-1)[0]
      if (!rec) return
      await r.cartera.addLateFee(cid, { tipo: rec.tipo, pct: rec.pct, base: rec.base, val: rec.val, cuota: rec.cuota, nota: rec.nota })
    }),
    /** Mismo recargo para varias cuentas vencidas (selección de la grilla) */
    recargoMasivo: (cids: string[], f: RecargoForm) => {
      let aplicadas: string[] = []
      return commit(d => { const r = agregarRecargos(d, cids, f); aplicadas = r.aplicadas; return r }, async (r, _b, after) => {
        const fallas: string[] = []
        for (const cid of aplicadas) {
          const c = entryOf(after, cid), rec = c?.recargos?.slice(-1)[0]
          if (!c || !rec) continue
          try { await r.cartera.addLateFee(cid, { tipo: rec.tipo, pct: rec.pct, base: rec.base, val: rec.val, cuota: rec.cuota, nota: rec.nota }) }
          catch (e) { fallas.push(c.client + ' (' + (e instanceof Error ? e.message : String(e)) + ')') }
        }
        if (fallas.length) throw new Error('no se aplicó a ' + fallas.join(', '))
      })
    },
    quitarRecargo: (cid: string, id: string) => commit(d => eliminarRecargo(d, cid, id), async (r, before) => {
      const rec = entryOf(before, cid)?.recargos?.find(x => x.id === id)
      await r.cartera.removeLateFee(id)
      if (rec) await r.cartera.addFollowUp(cid, 'Recargo', 'Se quitó el recargo por mora de ' + cop(rec.val))
    }),
    abono: (cid: string, val: number, met: string, mode: 'auto' | 'manual', sel: number[]) => {
      let done = false
      const ok = commit(d => { const r = registerAbono(d, cid, val, met, mode, sel); done = !!r.done; return r },
        async (r, before) => must(await registerPayment(r, rowOf(before, cid), val, met, mode, sel)))
      return { ok, done }
    },
    plan: (cid: string, n: number, freq: Freq, first: string) => commit(d => applyPlan(d, cid, n, freq, first),
      async (r, before) => must(await applyPaymentPlan(r, rowOf(before, cid), n, freq, first))),
    gestion: (cid: string, tipo: string, nota: string, promesa: string) => commit(d => saveGestion(d, cid, tipo, nota, promesa),
      async r => must(await saveFollowUp(r, cid, tipo, nota, promesa))),
    log: (cid: string, tipo: string, nota: string) => commit(d => addGestion(d, cid, tipo, nota),
      r => r.cartera.addFollowUp(cid, tipo, nota)),
    update: (cid: string, f: CarteraEditForm) => commit(d => updateCartera(d, cid, f), async (r, before, after) => {
      const a = entryOf(after, cid), b = entryOf(before, cid)
      if (!a || !b) return
      const last = a.plan?.[a.plan.length - 1], lastB = b.plan?.[b.plan.length - 1]
      await r.cartera.update(cid, {
        client: a.client, phone: a.phone, nota: a.nota ?? '',
        ...(a.kind === 'manual' && { concepto: a.concepto }),
        ...(a.kind !== 'venta' && a.total !== undefined && { total: a.total }),
        ...(a.due !== b.due && { due: a.due }),
        ...(last?.id && lastB && last.amount !== lastB.amount && { cuota: { id: last.id, amount: last.amount } }),
      })
    }),
    remove: (cid: string) => commit(d => deleteCartera(d, cid), r => r.cartera.remove(cid)),
    template: (key: TemplateKey, text: string) => commit(d => updateTemplate(d, key, text), r => r.settings.updateTemplate(key, text)),
  }
}
