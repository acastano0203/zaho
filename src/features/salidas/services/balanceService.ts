import type { AppData, SalidaTipo } from '../../../types'
import { SCALE, TIPO_KEYS, TIPOS } from '../../../lib/constants'
import { fl, monthName, plus, today } from '../../../lib/dates'
import { saleCost, saleTotal } from '../../../lib/finance'

export type BalPeriod = 'hoy' | 'semana' | 'mes'

/** Color por tipo según el ranking del mes (más gasto = más oscuro) */
export function typeColors(d: AppData) {
  const T = today()
  const month = d.salidas.filter(g => g.date.slice(0, 7) === T.slice(0, 7))
  const byType = TIPO_KEYS.map(key => ({ key, label: TIPOS[key], v: month.filter(g => g.tipo === key).reduce((a, g) => a + g.val, 0) })).sort((a, b) => b.v - a.v)
  const colors = {} as Record<SalidaTipo, string>
  byType.forEach((b, i) => (colors[b.key] = SCALE[i]))
  const max = Math.max(...byType.map(b => b.v), 1)
  return { month, byType, colors, max, monthTotal: month.reduce((a, g) => a + g.val, 0) }
}

export function computeBalance(d: AppData, p: BalPeriod) {
  const T = today()
  const from = p === 'hoy' ? T : p === 'semana' ? plus(-6) : T.slice(0, 7) + '-01'
  const inR = (dt: string) => dt >= from && dt <= T
  const { colors } = typeColors(d)

  const contado = d.sales.filter(x => x.pay === 'contado' && inR(x.date))
  const vCont = contado.reduce((a, x) => a + saleTotal(x), 0)
  let abCli = 0, abLoan = 0, nIn = contado.length
  d.cartera.forEach(c => c.abonos.forEach(a => {
    if (!inR(a.date)) return
    nIn += 1
    if (c.kind === 'prestamo') abLoan += a.val
    else abCli += a.val
  }))
  const outP = d.salidas.filter(g => inR(g.date))
  const byT = TIPO_KEYS.map(key => ({ key, label: TIPOS[key], v: outP.filter(g => g.tipo === key).reduce((a, g) => a + g.val, 0) })).filter(b => b.v > 0).sort((a, b) => b.v - a.v)
  const inTot = vCont + abCli + abLoan
  const outTot = byT.reduce((a, b) => a + b.v, 0)
  const salesP = d.sales.filter(x => inR(x.date))
  const vTot = salesP.reduce((a, x) => a + saleTotal(x), 0)
  const cmv = salesP.reduce((a, x) => a + saleCost(x, d.products), 0)
  const gOp = outP.filter(g => ['transporte', 'operativo', 'comerciales', 'otro'].includes(g.tipo)).reduce((a, g) => a + g.val, 0)

  return {
    period: { hoy: 'hoy, ' + fl(T), semana: fl(from) + ' a ' + fl(T), mes: monthName() + ' ' + T.slice(0, 4) }[p],
    inTot, outTot, net: inTot - outTot, nIn, nOut: outP.length,
    inRows: [{ label: 'Ventas de contado', v: vCont }, { label: 'Abonos de clientes', v: abCli }, { label: 'Préstamos recuperados', v: abLoan }],
    outRows: byT.map(b => ({ ...b, color: colors[b.key] })),
    vTot, vCont, cmv, gOp, util: vTot - cmv - gOp,
  }
}
