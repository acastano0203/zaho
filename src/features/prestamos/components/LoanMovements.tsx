import { useUI } from '../../../store/UIStore'
import { Card, Dot, Empty } from '../../../components/ui/Display'
import { C } from '../../../lib/constants'
import { fd } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import type { LoanMove } from '../services/loansService'

/** Línea de tiempo de entregas (sale dinero) y devoluciones (entra dinero) */
export function LoanMovements({ moves }: { moves: LoanMove[] }) {
  const ui = useUI()
  if (!moves.length) return <Empty>Sin entregas ni devoluciones de préstamos en este periodo.</Empty>
  return (
    <Card className="bg-white">
      <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Movimientos de préstamos</span>
      {moves.map(m => (
        <button key={m.key} type="button" onClick={() => ui.openDrawer({ type: 'cartera', cid: m.cid, sec: 'detalle' })}
          className="grid min-h-12 w-full grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2.5 text-left hover:bg-mist">
          <Dot color={m.kind === 'entrega' ? C.bad : C.ok} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{m.kind === 'entrega' ? 'Préstamo a ' : 'Devolución de '}{m.who}</span>
            <span className="text-xs text-taupe">{fd(m.date)} · {m.met}</span>
          </span>
          <span className={'font-semibold tabular ' + (m.kind === 'entrega' ? 'text-bad' : 'text-util')}>{m.kind === 'entrega' ? '−' : '+'}{cop(m.val)}</span>
        </button>
      ))}
    </Card>
  )
}
