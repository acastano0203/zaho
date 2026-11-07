import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { C } from '../../../lib/constants'
import { saleTotal } from '../../../lib/finance'
import type { CarRow, Cliente, Sale } from '../../../types'
import { deleteClient, saveClient, type ClientForm } from '../services/clientsService'

export type ClientSt = 'mora' | 'saldo' | 'ok' | 'new'
export interface ClientSummary {
  c: Cliente
  sales: Sale[]
  open: CarRow[]
  total: number
  saldo: number
  st: { k: ClientSt; label: string; color: string }
  last: Sale | undefined
}

export function useClientSummaries(): ClientSummary[] {
  const { data, carRows } = useApp()
  return useMemo(() => data.clientes.map(c => {
    const sales = data.sales.filter(x => x.clientId === c.id)
    const open = carRows.filter(r => r.c.clientId === c.id && r.saldo > 0)
    const total = sales.reduce((a, x) => a + saleTotal(x), 0)
    const saldo = open.reduce((a, r) => a + r.saldo, 0)
    const mora = open.some(r => r.st === 'ven')
    const last = sales.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const st = mora ? { k: 'mora' as const, label: 'En mora', color: C.bad }
      : saldo > 0 ? { k: 'saldo' as const, label: 'Con saldo', color: C.warn }
      : sales.length ? { k: 'ok' as const, label: 'Al día', color: C.ok }
      : { k: 'new' as const, label: 'Sin compras', color: C.stone }
    return { c, sales, open, total, saldo, st, last }
  }), [data, carRows])
}

export const matchClientFilter = (x: ClientSummary, key: string) => key === 'all' || (key === 'saldo' ? x.saldo > 0 : x.st.k === key)

export function useClientActions() {
  const { commit, carRows } = useApp()
  return {
    save: (f: ClientForm) => commit(d => saveClient(d, f)),
    remove: (id: string) => commit(d => deleteClient(d, id, carRows.some(r => r.c.clientId === id && r.saldo > 0))),
  }
}
