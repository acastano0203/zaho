import type { AppData, CarRow, CarSt, CarteraEntry, CarteraKind, Cuota, CuotaCalc, Freq, Order, Product, Sale, Seq } from '../types'
import { C, REC } from './constants'
import { addDays, addMonths, diff, fd, fl, today, wd } from './dates'
import { cop, firstName } from './format'

/* ---------- precios y ventas ---------- */
export const unitPrice = (price: number, pay: Sale['pay']) =>
  pay === 'credito' ? Math.round((price * (1 + REC / 100)) / 100) * 100 : price

export const saleTotal = (s: Pick<Sale, 'items' | 'pay'>) => s.items.reduce((a, i) => a + i.qty * unitPrice(i.price, s.pay), 0)
export const saleBase = (s: Pick<Sale, 'items'>) => s.items.reduce((a, i) => a + i.qty * i.price, 0)
export const saleCost = (s: Pick<Sale, 'items'>, products: Product[]) =>
  s.items.reduce((a, i) => {
    const p = products.find(x => x.id === i.pid)
    return a + i.qty * (p ? p.cost : 0)
  }, 0)
export const saleUnits = (s: Pick<Sale, 'items'>) => s.items.reduce((a, i) => a + i.qty, 0)

/* ---------- productos ---------- */
export type ProdSt = 'ok' | 'baj' | 'ago'
export const productStatus = (p: Product): ProdSt => (p.stock <= 0 ? 'ago' : p.stock < p.min ? 'baj' : 'ok')
export const suggestQty = (p: Product) => Math.max(p.min * 2 - p.stock, 1)
export const supplierOf = (d: AppData, p: Product) => d.suppliers.find(s => s.brands.includes(p.brand))
export const openOrders = (orders: Order[]) => orders.filter(o => o.status !== 'Recibido')
export const inOpenOrder = (orders: Order[], pid: string) => openOrders(orders).some(o => o.lines.some(l => l.pid === pid))
export const suggestionsFor = (d: AppData, supId: string) => {
  const sup = d.suppliers.find(x => x.id === supId)
  if (!sup) return []
  return d.products
    .filter(p => sup.brands.includes(p.brand) && p.stock < p.min && !inOpenOrder(d.orders, p.id))
    .sort((a, b) => a.stock - b.stock)
}

/** Si un producto cruza el mínimo y su proveedor está en automático, genera el pedido */
export function autoOrders(d: AppData, oldP: Product[], newP: Product[]): { orders: Order[]; seq: Seq; msg: string } {
  let msg = ''
  let out = d.orders.slice()
  let n = d.seq.order
  newP.forEach(p => {
    const o = oldP.find(x => x.id === p.id)
    if (!o) return
    const crossed = p.stock < p.min && (o.stock >= o.min || (p.stock <= 0 && o.stock > 0))
    if (!crossed) return
    const sup = d.suppliers.find(x => x.brands.includes(p.brand))
    if (!sup || !sup.auto) return
    if (out.some(x => x.status !== 'Recibido' && x.lines.some(l => l.pid === p.id))) return
    n += 1
    out = [{ id: 'O-' + n, date: today(), sup: sup.id, lines: [{ pid: p.id, qty: suggestQty(p) }], status: 'Enviado' as const, auto: true }, ...out]
    msg = 'Pedido automático enviado a ' + sup.name + ': ' + p.name + ' talla ' + p.size
  })
  return { orders: out, seq: { ...d.seq, order: n }, msg }
}

/* ---------- planes y cuotas ---------- */
export function planPreview(amount: number, n: number, freq: Freq, first: string): Cuota[] {
  n = Math.max(1, Math.min(24, n | 0))
  const base = Math.floor(amount / n / 100) * 100
  const out: Cuota[] = []
  for (let i = 0; i < n; i++) {
    const due = freq === 'mensual' ? addMonths(first, i) : addDays(first, i * (freq === 'semanal' ? 7 : 15))
    out.push({ n: i + 1, due, amount: i === n - 1 ? amount - base * (n - 1) : base })
  }
  return out
}

export function computeCuotas(c: CarteraEntry, total: number) {
  const hasPlan = !!(c.plan && c.plan.length)
  const start = hasPlan ? c.planStart || 0 : 0
  const cu: CuotaCalc[] = (hasPlan ? c.plan! : [{ n: 1, due: c.due, amount: total }]).map(q => ({ ...q, paid: 0 }))
  let free = 0
  c.abonos.slice(start).forEach(a => {
    if (a.alloc && a.alloc.length)
      a.alloc.forEach(x => {
        const q = cu.find(y => y.n === x.n)
        if (q) q.paid += x.val
        else free += x.val
      })
    else free += a.val
  })
  cu.forEach(q => {
    const t = Math.min(Math.max(q.amount - q.paid, 0), free)
    q.paid += t
    free -= t
  })
  return { cu, hasPlan }
}

export type QSt = 'pag' | 'ven' | 'par' | 'pv' | 'pen'
export function cuotaStatus(q: CuotaCalc): QSt {
  if (q.paid >= q.amount) return 'pag'
  const d = diff(q.due, today())
  if (d < 0) return 'ven'
  if (q.paid > 0) return 'par'
  return d <= 3 ? 'pv' : 'pen'
}

export function allocate(r: CarRow, amount: number, mode: 'auto' | 'manual', sel: number[]) {
  const pend = r.cu.filter(q => q.paid < q.amount)
  const first = mode === 'manual' ? pend.filter(q => sel.includes(q.n)) : pend
  const applied = Math.min(amount, r.saldo)
  let left = applied
  const map: Record<number, number> = {}
  first.forEach(q => {
    const t = Math.min(q.amount - q.paid, left)
    if (t > 0) { map[q.n] = t; left -= t }
  })
  const spill = mode === 'manual' ? left : 0
  pend.forEach(q => {
    if (left <= 0) return
    const t = Math.min(q.amount - q.paid - (map[q.n] || 0), left)
    if (t > 0) { map[q.n] = (map[q.n] || 0) + t; left -= t }
  })
  return { map, spill, over: Math.max(amount - r.saldo, 0), applied }
}

/* ---------- filas de cartera ---------- */
export function buildCarRows(d: AppData): CarRow[] {
  const T = today()
  return d.cartera.map(c => {
    const sale = c.kind === 'venta' ? d.sales.find(x => x.id === c.saleId) || null : null
    const total = sale ? saleTotal(sale) : c.total || 0
    const paid = c.abonos.reduce((a, b) => a + b.val, 0)
    const saldo = Math.max(total - paid, 0)
    const q = computeCuotas(c, total)
    const next = saldo > 0 ? q.cu.find(x => x.paid < x.amount) || null : null
    const refDue = next ? next.due : c.due
    const days = diff(refDue, T)
    const st: CarSt = saldo <= 0 ? 'pag' : days < 0 ? 'ven' : days <= 3 ? 'pv' : 'ok'
    const gs = c.gestiones || []
    const prom = gs.filter(g => g.promesa).slice(-1)[0] || null
    const kept = prom ? c.abonos.some(a => a.date >= prom.date) : false
    const promSt = !prom || kept || saldo <= 0 ? null : prom.promesa! < T ? 'incumplida' : prom.promesa === T ? 'hoy' : 'pendiente'
    return { c, sale, total, paid, saldo, days, st, cu: q.cu, hasPlan: q.hasPlan, next, refDue, prom, promSt, pct: total ? Math.min(100, Math.round((paid / total) * 100)) : 0 }
  })
}

export function stInfo(st: CarSt, kind: CarteraKind) {
  if (st === 'pag') return { label: kind === 'prestamo' ? 'Recuperado' : 'Pagada', color: C.ok }
  if (st === 'ven') return { label: 'Vencida', color: C.bad }
  if (st === 'pv') return { label: 'Vence pronto', color: C.warn }
  return { label: kind === 'prestamo' ? 'Por recuperar' : 'Al día', color: C.stone }
}

export function dueText(days: number, due: string) {
  if (days < 0) return 'venció hace ' + -days + (days === -1 ? ' día' : ' días')
  if (days === 0) return 'vence hoy'
  if (days === 1) return 'vence mañana'
  if (days <= 7) return 'vence el ' + wd(due)
  return 'vence el ' + fd(due)
}

export const fillTpl = (tpl: string, name: string, saldo: number, due: string) =>
  String(tpl).split('{nombre}').join(firstName(name)).split('${saldo}').join(cop(saldo)).split('{fecha}').join(fl(due))

export const daysLabel = (r: CarRow) =>
  r.saldo <= 0 ? '—' : r.days < 0 ? -r.days + ' días de mora' : r.days === 0 ? 'Vence hoy' : r.days === 1 ? 'Mañana' : r.days + ' días'

export function lastFollowUp(r: CarRow) {
  const gs = r.c.gestiones || []
  const lg = gs[gs.length - 1]
  if (r.promSt && r.prom) return 'Promesa ' + fd(r.prom.promesa!) + (r.promSt === 'incumplida' ? ' · incumplida' : r.promSt === 'hoy' ? ' · es hoy' : '')
  return lg ? lg.tipo + ' · ' + fd(lg.date) : 'Sin gestiones'
}

export const carRef = (c: CarteraEntry) => (c.kind === 'venta' ? c.saleId! : c.kind === 'prestamo' ? 'Préstamo' : 'Manual')
