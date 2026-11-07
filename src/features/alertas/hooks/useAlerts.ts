import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { useNavigate } from 'react-router-dom'
import { C } from '../../../lib/constants'
import { fd } from '../../../lib/dates'
import { cop, firstName } from '../../../lib/format'
import { dueText, inOpenOrder, supplierOf } from '../../../lib/finance'

export interface AlertItem { key: string; u: number; text: string; sub: string; color: string; btn: string; isWa: boolean; act: () => void }

export function useAlerts(): AlertItem[] {
  const { data, carRows } = useApp()
  const ui = useUI()
  const nav = useNavigate()
  return useMemo(() => {
    const al: AlertItem[] = []
    carRows.filter(r => r.saldo > 0 && r.c.kind !== 'prestamo' && (r.st === 'ven' || r.st === 'pv')).forEach(r => {
      al.push({ key: 'c' + r.c.id, u: r.days, text: r.c.client + ' ' + dueText(r.days, r.refDue) + ': ' + cop(r.saldo), sub: 'Cartera · ' + (r.c.saleId || r.c.ref),
        color: r.st === 'ven' ? C.bad : C.warn, btn: 'Cobrar por WhatsApp', isWa: true, act: () => ui.openModal({ type: 'wa', cid: r.c.id }) })
    })
    data.products.filter(p => p.stock < p.min).forEach(p => {
      const ago = p.stock <= 0, sup = supplierOf(data, p), busy = inOpenOrder(data.orders, p.id)
      al.push({ key: 'p' + p.id, u: ago ? 1.5 : 2.5, text: p.name + ' talla ' + p.size + (ago ? ' agotado' : ' quedan ' + p.stock),
        sub: p.brand + ' · ' + p.wh + (busy ? ' · pedido en curso' : ''), color: ago ? C.bad : C.warn,
        btn: busy ? 'Ver pedido' : 'Pedir al proveedor', isWa: !busy,
        act: busy || !sup ? () => { ui.setAlertsOpen(false); nav('/proveedores') } : () => ui.openModal({ type: 'order', sup: sup.id, firstPid: p.id }) })
    })
    carRows.filter(r => r.saldo > 0 && r.c.kind === 'prestamo' && r.days <= 7).forEach(r => {
      al.push({ key: 'l' + r.c.id, u: r.days < 0 ? r.days : 3 + r.days / 10, text: 'Préstamo a ' + firstName(r.c.client) + ' ' + dueText(r.days, r.refDue) + ': ' + cop(r.saldo),
        sub: 'Por recuperar', color: r.days < 0 ? C.bad : C.warn, btn: 'Enviar recordatorio', isWa: true, act: () => ui.openModal({ type: 'wa', cid: r.c.id }) })
    })
    carRows.filter(r => r.promSt === 'incumplida' || r.promSt === 'hoy').forEach(r => {
      al.push({ key: 'g' + r.c.id, u: -0.5, text: r.c.client + (r.promSt === 'hoy' ? ' prometió pagar hoy' : ' no cumplió la promesa del ' + fd(r.prom!.promesa!)),
        sub: 'Saldo ' + cop(r.saldo), color: r.promSt === 'hoy' ? C.warn : C.bad, btn: 'Ver seguimiento', isWa: false,
        act: () => ui.openDrawer({ type: 'cartera', cid: r.c.id, sec: 'seg' }) })
    })
    return al.sort((a, b) => a.u - b.u)
  }, [data, carRows, ui, nav])
}
