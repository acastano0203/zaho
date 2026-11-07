import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { today } from '../../../lib/dates'
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
    update: (id: string, f: SalidaEditForm) => commit(d => updateSalida(d, id, f)),
    remove: (id: string) => commit(d => deleteSalida(d, id)),
    save: (f: SalidaForm) => {
      let cid: string | undefined
      const ok = commit(d => { const r = saveSalida(d, f); cid = r.cid; return r })
      return { ok, cid }
    },
  }
}
