import type { AppData, CarRow, Salida } from '../../../types'

/** Un préstamo a un tercero: su cuenta en cartera + la salida de dinero que lo originó */
export interface LoanRow {
  r: CarRow
  salida: Salida | undefined
  /** Fecha de entrega */
  given: string
  amount: number
  recovered: number
  saldo: number
}

export function buildLoans(d: AppData, carRows: CarRow[]): LoanRow[] {
  return carRows
    .filter(r => r.c.kind === 'prestamo')
    .map(r => ({
      r,
      salida: d.salidas.find(g => g.id === r.c.salidaId),
      given: r.c.created,
      amount: r.total,
      recovered: r.paid,
      saldo: r.saldo,
    }))
    .sort((a, b) => (a.saldo > 0 ? 0 : 1) - (b.saldo > 0 ? 0 : 1) || a.r.days - b.r.days)
}

export function loansSummary(loans: LoanRow[]) {
  const open = loans.filter(l => l.saldo > 0)
  const venc = open.filter(l => l.r.st === 'ven')
  return {
    count: loans.length,
    nOpen: open.length,
    given: loans.reduce((a, l) => a + l.amount, 0),
    recovered: loans.reduce((a, l) => a + l.recovered, 0),
    saldo: open.reduce((a, l) => a + l.saldo, 0),
    vencido: venc.reduce((a, l) => a + l.saldo, 0),
    nVenc: venc.length,
  }
}

export interface LoanMove { key: string; date: string; kind: 'entrega' | 'devolucion'; who: string; val: number; met: string; cid: string }

/** Entregas y devoluciones dentro del periodo, más el resumen por persona */
export function loansPeriod(loans: LoanRow[], inR: (dt: string) => boolean) {
  const moves: LoanMove[] = []
  loans.forEach(l => {
    if (inR(l.given)) moves.push({ key: l.r.c.id + '-e', date: l.given, kind: 'entrega', who: l.r.c.client, val: l.amount, met: l.r.c.met || '—', cid: l.r.c.id })
    l.r.c.abonos.forEach((a, i) => {
      if (inR(a.date)) moves.push({ key: l.r.c.id + '-a' + i, date: a.date, kind: 'devolucion', who: l.r.c.client, val: a.val, met: a.met || '—', cid: l.r.c.id })
    })
  })
  moves.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.kind === 'entrega' ? 1 : -1))
  const entregas = moves.filter(m => m.kind === 'entrega'), devol = moves.filter(m => m.kind === 'devolucion')

  const people: Record<string, { name: string; n: number; amount: number; recovered: number; saldo: number; vencido: boolean }> = {}
  loans.forEach(l => {
    const k = l.r.c.client.trim().toLowerCase()
    const p = people[k] || (people[k] = { name: l.r.c.client, n: 0, amount: 0, recovered: 0, saldo: 0, vencido: false })
    p.n += 1; p.amount += l.amount; p.recovered += l.recovered; p.saldo += l.saldo
    if (l.saldo > 0 && l.r.st === 'ven') p.vencido = true
  })

  return {
    moves,
    givenP: entregas.reduce((a, m) => a + m.val, 0), nGivenP: entregas.length,
    recoveredP: devol.reduce((a, m) => a + m.val, 0), nRecP: devol.length,
    byPerson: Object.values(people).sort((a, b) => b.saldo - a.saldo || b.amount - a.amount),
  }
}
