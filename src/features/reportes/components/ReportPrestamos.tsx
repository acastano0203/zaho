import { Card, KpiCard, Row, SubTitle, Empty } from '../../../components/ui/Display'
import { cop, pct, plural } from '../../../lib/format'
import { LoansByPerson } from '../../prestamos/components/LoansByPerson'
import { LoanMovements } from '../../prestamos/components/LoanMovements'
import { LoansTable } from '../../prestamos/components/LoansTable'
import type { LoanRow, loansPeriod, loansSummary } from '../../prestamos/services/loansService'

interface Props {
  loans: LoanRow[]
  s: ReturnType<typeof loansSummary>
  p: ReturnType<typeof loansPeriod>
}

export function ReportPrestamos({ loans, s, p }: Props) {
  const neto = p.recoveredP - p.givenP
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KpiCard label="Prestado en el periodo" value={cop(p.givenP)} sub={plural(p.nGivenP, 'entrega', 'entregas')} />
        <KpiCard label="Devuelto en el periodo" value={cop(p.recoveredP)} valueClass="text-util!" sub={plural(p.nRecP, 'devolución', 'devoluciones')} />
        <KpiCard label="Por recuperar hoy" value={cop(s.saldo)} sub={plural(s.nOpen, 'préstamo abierto', 'préstamos abiertos') + ' en total'} />
        <KpiCard label="Vencido" value={cop(s.vencido)} valueClass={s.vencido ? 'text-bad!' : ''} sub={pct(s.vencido, s.saldo) + '% de lo que falta'} />
      </div>

      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Efecto en caja del periodo</span>
          <Row label="Salió como préstamo" value={'−' + cop(p.givenP)} />
          <Row label="Volvió por devoluciones" value={'+' + cop(p.recoveredP)} />
          <Row strong label="Neto de préstamos" value={(neto >= 0 ? '+' : '') + cop(neto)} />
          <span className="mt-2 text-xs text-taupe">Histórico: se han prestado {cop(s.given)} y han vuelto {cop(s.recovered)} ({pct(s.recovered, s.given)}%).</span>
        </Card>
        <LoansByPerson people={p.byPerson} />
      </div>

      <LoanMovements moves={p.moves} />

      <SubTitle>Todos los préstamos</SubTitle>
      {loans.length ? <LoansTable loans={loans} /> : <Empty>No hay préstamos registrados.</Empty>}
    </>
  )
}
