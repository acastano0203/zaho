import { Bar } from '../../../components/ui/Display'
import { monthName } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import type { useSalidasView } from '../hooks/useSalidas'

type V = ReturnType<typeof useSalidasView>

export function OutTypeChart({ view }: { view: V }) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-md border border-linen bg-cream p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.22em]">Resumen de {monthName()} por tipo</span>
        <span className="font-display text-lg text-ink tabular">{cop(view.monthTotal)}</span>
      </div>
      <div className="flex flex-col gap-3">
        {view.byType.map(b => (
          <div key={b.key} className="grid grid-cols-[110px_minmax(0,1fr)_90px] items-center gap-3 text-xs md:grid-cols-[170px_minmax(0,1fr)_110px] md:text-sm">
            <span>{b.label}</span>
            <div role="img" aria-label={b.label + ': ' + cop(b.v)}>
              <Bar value={Math.max(Math.round((b.v / view.max) * 100), b.v ? 2 : 0)} color={view.colors[b.key]} />
            </div>
            <span className="text-right font-semibold text-ink tabular">{cop(b.v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
