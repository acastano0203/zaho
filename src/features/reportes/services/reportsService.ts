import type { AppData, CarRow, Product } from '../../../types'
import { C } from '../../../lib/constants'
import { DS, MONTHS_SHORT, addDays, addMonths, fl, monthName, plus, today, weekdayIndex } from '../../../lib/dates'
import { pct } from '../../../lib/format'
import { saleBase, saleCost, saleTotal, unitPrice } from '../../../lib/finance'

export type RepPeriod = 'semana' | 'mes' | 'todo'

export function periodRange(d: AppData, rp: RepPeriod) {
  const T = today()
  const firstSale = d.sales.map(x => x.date).sort()[0] || T
  const from = rp === 'semana' ? plus(-6) : rp === 'mes' ? T.slice(0, 7) + '-01' : firstSale < T ? firstSale : T
  const label = rp === 'semana' ? 'Últimos 7 días: ' + fl(from) + ' a ' + fl(T)
    : rp === 'mes' ? 'Mes de ' + monthName() + ' ' + T.slice(0, 4) + ', hasta hoy' : 'Todo el histórico, desde el ' + fl(from)
  return { from, to: T, label, inR: (dt: string) => dt >= from && dt <= T }
}

export function salesReport(d: AppData, rp: RepPeriod) {
  const { from, to, inR } = periodRange(d, rp)
  const rs = d.sales.filter(x => inR(x.date))
  const sumT = (arr: typeof rs) => arr.reduce((a, x) => a + saleTotal(x), 0)
  const tot = sumT(rs), cost = rs.reduce((a, x) => a + saleCost(x, d.products), 0)
  const units = rs.reduce((a, x) => a + x.items.reduce((b, i) => b + i.qty, 0), 0)
  const cont = rs.filter(x => x.pay === 'contado'), cred = rs.filter(x => x.pay === 'credito')
  const tCont = sumT(cont), tCred = sumT(cred)
  const recargo = cred.reduce((a, x) => a + saleTotal(x) - saleBase(x), 0)

  // Barras por día o por mes
  const buckets: { key: string; lbl: string; full: string }[] = []
  if (rp === 'todo') {
    let mm = from.slice(0, 7) + '-01', guard = 0
    while (mm.slice(0, 7) <= to.slice(0, 7) && guard++ < 60) {
      buckets.push({ key: mm.slice(0, 7), lbl: MONTHS_SHORT[Number(mm.slice(5, 7)) - 1], full: fl(mm).replace(/^1 de /, '') })
      mm = addMonths(mm, 1)
    }
  } else {
    let dd = from, guard = 0
    while (dd <= to && guard++ < 62) { buckets.push({ key: dd, lbl: '', full: fl(dd) }); dd = addDays(dd, 1) }
    buckets.forEach((b, ix) => {
      const dn = Number(b.key.slice(8))
      b.lbl = buckets.length <= 10 ? DS[weekdayIndex(b.key)] + ' ' + dn : ix === 0 || ix === buckets.length - 1 || dn % 5 === 0 ? String(dn) : ''
    })
  }
  const bv = buckets.map(b => {
    const xs = d.sales.filter(x => (rp === 'todo' ? x.date.slice(0, 7) : x.date) === b.key)
    return { ...b, c: sumT(xs.filter(x => x.pay === 'contado')), k: sumT(xs.filter(x => x.pay === 'credito')), n: xs.length }
  })
  const maxB = Math.max(...bv.map(x => x.c + x.k), 1)
  const bars = bv.map(x => ({ ...x, hc: Math.round((x.c / maxB) * 100), hk: Math.round((x.k / maxB) * 100) }))

  const byCom = d.comerciales.map(c => {
    const xs = rs.filter(x => x.com === c.id)
    const v = sumT(xs)
    return { name: c.name, n: xs.length, v, util: v - xs.reduce((a, x) => a + saleCost(x, d.products), 0), comm: (v * c.pct) / 100 }
  }).sort((a, b) => b.v - a.v)

  const byKey = (fn: (p: Product) => string) => {
    const m: Record<string, number> = {}
    rs.forEach(x => x.items.forEach(i => {
      const p = d.products.find(y => y.id === i.pid)
      const k = p ? fn(p) : '—'
      m[k] = (m[k] || 0) + i.qty * unitPrice(i.price, x.pay)
    }))
    const arr = Object.keys(m).map(label => ({ label, v: m[label] })).sort((a, b) => b.v - a.v)
    const mx = Math.max(...arr.map(a => a.v), 1)
    return arr.map(a => ({ ...a, pct: Math.round((a.v / mx) * 100) }))
  }

  return {
    tot, cost, util: tot - cost, n: rs.length, units, avg: rs.length ? tot / rs.length : 0,
    tCont, tCred, nCont: cont.length, nCred: cred.length, recargo, bars, byCom,
    byCat: byKey(p => p.cat), byBrand: byKey(p => p.brand), chartTitle: rp === 'todo' ? 'Ventas por mes' : 'Ventas por día',
  }
}

export function rankingReport(d: AppData, rp: RepPeriod, sort: 'unidades' | 'ventas') {
  const { inR } = periodRange(d, rp)
  const rs = d.sales.filter(x => inR(x.date))
  const agg: Record<string, { pid: string; u: number; v: number; c: number }> = {}
  rs.forEach(x => x.items.forEach(i => {
    const a = agg[i.pid] || (agg[i.pid] = { pid: i.pid, u: 0, v: 0, c: 0 })
    const p = d.products.find(y => y.id === i.pid)
    a.u += i.qty
    a.v += i.qty * unitPrice(i.price, x.pay)
    a.c += i.qty * (p ? p.cost : 0)
  }))
  const byV = sort === 'ventas'
  const list = Object.values(agg).sort((a, b) => (byV ? b.v - a.v : b.u - a.u || b.v - a.v))
  const tot = list.reduce((a, x) => a + x.v, 0), units = list.reduce((a, x) => a + x.u, 0)
  const top = Math.max(...list.map(a => (byV ? a.v : a.u)), 1)
  const rank = list.slice(0, 15).map((a, ix) => ({
    ...a, n: ix + 1, p: d.products.find(y => y.id === a.pid),
    share: Math.round(((byV ? a.v : a.u) / top) * 100), shareL: (byV ? pct(a.v, tot) : pct(a.u, units)) + '%',
  }))
  const idle = d.products.filter(p => !agg[p.id])
  return { rank, idle, refs: list.length, units, tot }
}

export function carteraReport(d: AppData, rows: CarRow[], rp: RepPeriod) {
  const { inR } = periodRange(d, rp)
  const open = rows.filter(r => r.saldo > 0)
  const openTot = open.reduce((a, r) => a + r.saldo, 0)
  const AG: [string, (r: CarRow) => boolean, string][] = [
    ['Al día', r => r.days > 3, C.stone],
    ['Vence en 3 días o menos', r => r.days >= 0 && r.days <= 3, C.warn],
    ['Vencida 1 a 30 días', r => r.days < 0 && r.days >= -30, C.bad],
    ['Vencida 31 a 60 días', r => r.days < -30 && r.days >= -60, C.bad],
    ['Vencida más de 60 días', r => r.days < -60, '#7E3F33'],
  ]
  const aging = AG.map(([label, fn, color]) => {
    const rs = open.filter(fn)
    const v = rs.reduce((a, r) => a + r.saldo, 0)
    return { label, v, n: rs.length, pct: pct(v, openTot), color }
  })
  let rec = 0, nAb = 0
  d.cartera.forEach(c => c.abonos.forEach(a => { if (inR(a.date)) { rec += a.val; nAb += 1 } }))
  const venc = open.filter(r => r.st === 'ven')
  const vencTot = venc.reduce((a, r) => a + r.saldo, 0)
  const gests = d.cartera.flatMap(c => c.gestiones.filter(g => inR(g.date)))
  const gBy = (t: string) => gests.filter(g => g.tipo === t).length
  const cred = d.sales.filter(x => x.pay === 'credito' && inR(x.date))
  const tCred = cred.reduce((a, x) => a + saleTotal(x), 0)
  const recargo = cred.reduce((a, x) => a + saleTotal(x) - saleBase(x), 0)
  const loans = open.filter(r => r.c.kind === 'prestamo')
  return {
    openTot, nOpen: open.length, vencTot, nVenc: venc.length, rec, nAb, tCred, nCred: cred.length, recargo, aging,
    idx: tCred ? pct(rec, tCred) + '%' : '—',
    follow: [
      ['Promesas de pago pendientes', rows.filter(r => r.promSt === 'pendiente' || r.promSt === 'hoy').length],
      ['Promesas incumplidas', rows.filter(r => r.promSt === 'incumplida').length],
      ['Llamadas del periodo', gBy('Llamada')], ['WhatsApp enviados', gBy('WhatsApp')], ['Visitas', gBy('Visita')], ['Abonos registrados', nAb],
    ] as [string, number][],
    loansTot: loans.reduce((a, r) => a + r.saldo, 0), nLoans: loans.length,
    loansVenc: loans.filter(r => r.st === 'ven').reduce((a, r) => a + r.saldo, 0),
    debtors: open.slice().sort((a, b) => b.saldo - a.saldo).slice(0, 10),
  }
}
