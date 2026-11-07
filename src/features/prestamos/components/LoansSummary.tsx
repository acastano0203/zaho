import { KpiCard } from '../../../components/ui/Display'
import { cop, pct, plural } from '../../../lib/format'
import type { loansSummary } from '../services/loansService'

/** Totales históricos de préstamos a terceros */
export function LoansSummary({ s }: { s: ReturnType<typeof loansSummary> }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <KpiCard label="Total prestado" value={cop(s.given)} sub={plural(s.count, 'préstamo entregado', 'préstamos entregados')} />
      <KpiCard label="Ya recuperado" value={cop(s.recovered)} valueClass="text-util!" sub={pct(s.recovered, s.given) + '% de lo prestado'} />
      <KpiCard label="Por recuperar" value={cop(s.saldo)} sub={plural(s.nOpen, 'préstamo abierto', 'préstamos abiertos')} />
      <KpiCard label="Vencido" value={cop(s.vencido)} valueClass={s.vencido ? 'text-bad!' : ''} sub={s.nVenc ? plural(s.nVenc, 'persona atrasada', 'personas atrasadas') : 'Nadie atrasado'} />
    </div>
  )
}
