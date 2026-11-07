import type { AppData, CarRow, Sale } from '../types'
import { C, REC } from './constants'
import { stInfo } from './finance'

export const comName = (d: AppData, id: string | null | undefined) => d.comerciales.find(x => x.id === id)?.name || '—'
export const prodOf = (d: AppData, id: string) => d.products.find(x => x.id === id)

export const itemsLabel = (d: AppData, s: Pick<Sale, 'items'>) =>
  s.items.map(i => {
    const p = prodOf(d, i.pid)
    return (p ? p.name + ' T' + p.size : '—') + (i.qty > 1 ? ' ×' + i.qty : '')
  }).join(', ')

export function saleStatus(s: Sale, r: CarRow | undefined) {
  if (s.pay === 'contado') return { label: 'Pagada', color: C.ok }
  if (r) {
    const i = stInfo(r.st, 'venta')
    return { label: r.st === 'pag' ? 'Crédito pagado' : 'Crédito · ' + i.label.toLowerCase(), color: i.color }
  }
  return { label: 'Crédito', color: C.stone }
}

export const payLabel = (s: Sale) => (s.pay === 'contado' ? 'Contado' : 'Crédito +' + REC + '%')
export const payColor = (s: Sale) => (s.pay === 'contado' ? C.ok : C.warn)

export const bySaleId = (rows: CarRow[]) => {
  const m: Record<string, CarRow> = {}
  rows.forEach(r => { if (r.c.saleId) m[r.c.saleId] = r })
  return m
}
