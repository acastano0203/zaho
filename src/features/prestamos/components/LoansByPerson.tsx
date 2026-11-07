import { Card, Dot, Progress } from '../../../components/ui/Display'
import { C } from '../../../lib/constants'
import { cop, pct, plural } from '../../../lib/format'
import type { loansPeriod } from '../services/loansService'

type P = ReturnType<typeof loansPeriod>['byPerson'][number]

/** Cuánto se le ha prestado a cada persona y cuánto debe todavía */
export function LoansByPerson({ people }: { people: P[] }) {
  return (
    <Card className="bg-white">
      <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Por persona</span>
      {people.map(p => (
        <div key={p.name} className="flex flex-col gap-1.5 border-t border-line py-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <Dot color={p.saldo <= 0 ? C.ok : p.vencido ? C.bad : C.warn} />
              <strong className="truncate">{p.name}</strong>
            </span>
            <span className="text-right font-semibold text-ink tabular">{p.saldo > 0 ? 'Debe ' + cop(p.saldo) : 'Al día'}</span>
          </div>
          <Progress value={pct(p.recovered, p.amount)} />
          <span className="text-xs text-taupe">{plural(p.n, 'préstamo', 'préstamos')} · prestado {cop(p.amount)} · devuelto {cop(p.recovered)}{p.vencido ? ' · atrasado' : ''}</span>
        </div>
      ))}
      {!people.length && <span className="text-xs text-taupe">No hay préstamos registrados.</span>}
    </Card>
  )
}
