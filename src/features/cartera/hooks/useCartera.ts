import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { norm } from '../../../lib/format'
import type { CarRow, Freq, TemplateKey } from '../../../types'
import { addGestion, applyPlan, deleteCartera, registerAbono, saveGestion, updateCartera, updateTemplate, type CarteraEditForm } from '../services/carteraService'

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

export function useCarteraActions() {
  const { commit } = useApp()
  return {
    abono: (cid: string, val: number, met: string, mode: 'auto' | 'manual', sel: number[]) => {
      let done = false
      const ok = commit(d => { const r = registerAbono(d, cid, val, met, mode, sel); done = !!r.done; return r })
      return { ok, done }
    },
    plan: (cid: string, n: number, freq: Freq, first: string) => commit(d => applyPlan(d, cid, n, freq, first)),
    gestion: (cid: string, tipo: string, nota: string, promesa: string) => commit(d => saveGestion(d, cid, tipo, nota, promesa)),
    log: (cid: string, tipo: string, nota: string) => commit(d => addGestion(d, cid, tipo, nota)),
    update: (cid: string, f: CarteraEditForm) => commit(d => updateCartera(d, cid, f)),
    remove: (cid: string) => commit(d => deleteCartera(d, cid)),
    template: (key: TemplateKey, text: string) => commit(d => updateTemplate(d, key, text)),
  }
}
