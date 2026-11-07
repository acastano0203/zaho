import { Box, Dot, Stepper } from '../../../components/ui/Display'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { Segmented } from '../../../components/ui/Segmented'
import { REC } from '../../../lib/constants'
import { fl, wd } from '../../../lib/dates'
import { cop, num } from '../../../lib/format'
import { planPreview } from '../../../lib/finance'
import type { Freq } from '../../../types'
import type { SaleDraft } from '../services/salesService'

interface Props {
  draft: SaleDraft
  total: number
  base: number
  lockPlan: boolean
  set: (p: Partial<SaleDraft>) => void
}

export const FREQ_OPTS: { value: Freq; label: string }[] = [
  { value: 'semanal', label: 'Semanal' }, { value: 'quincenal', label: 'Quincenal' }, { value: 'mensual', label: 'Mensual' },
]

export function CreditOptions({ draft, total, base, lockPlan, set }: Props) {
  const saldo = Math.max(total - num(draft.abono), 0)
  const plan = !lockPlan && draft.planMode === 'multi' && saldo > 0 ? planPreview(saldo, draft.n, draft.freq, draft.first) : []

  return (
    <Box warn>
      <div className="flex items-center gap-2.5">
        <Dot color="#C29A4B" />
        <span className="font-semibold text-ink">Precio a crédito: +{REC}% sobre cada prenda{draft.items.length ? ' (+' + cop(total - base) + ' en esta venta)' : ''}</span>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Abono inicial"><MoneyInput value={draft.abono} onChange={v => set({ abono: v })} /></Field>
        <div className="flex flex-col gap-1.5">
          <Label>Saldo a crédito</Label>
          <span className="font-display text-lg leading-10 text-ink tabular">{cop(saldo)}</span>
        </div>
      </div>
      {!lockPlan && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Plan de pagos</Label>
            <Segmented label="Plan de pagos" value={draft.planMode} onChange={v => set({ planMode: v })}
              options={[{ value: 'single', label: 'Una sola fecha' }, { value: 'multi', label: 'En cuotas' }]} />
          </div>
          {draft.planMode === 'single' ? (
            <Field label="Fecha de vencimiento"><Input type="date" value={draft.due} onChange={e => set({ due: e.target.value })} /></Field>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5"><Label>Cuotas</Label>
                  <Stepper value={draft.n} onDec={() => set({ n: Math.max(2, draft.n - 1) })} onInc={() => set({ n: Math.min(24, draft.n + 1) })} />
                </div>
                <Field label="Primera cuota"><Input type="date" value={draft.first} onChange={e => set({ first: e.target.value })} /></Field>
              </div>
              <div className="flex flex-col gap-1.5"><Label>Frecuencia</Label>
                <Segmented label="Frecuencia" value={draft.freq} onChange={v => set({ freq: v })} options={FREQ_OPTS} />
              </div>
              {plan.length > 0 && (
                <div className="rounded-md border border-linen bg-cream">
                  {plan.map(q => (
                    <div key={q.n} className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-stone text-xs font-semibold tabular">{q.n}</span>
                      <span>{wd(q.due)} {fl(q.due)}</span>
                      <strong className="tabular">{cop(q.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      <span className="text-xs text-taupe">
        {lockPlan ? 'El plan de pagos de esta venta se ajusta desde Cartera.'
          : draft.planMode === 'multi' ? 'Se crea en Cartera con ' + draft.n + ' cuotas. Puedes ajustarlo después desde Cartera.'
          : 'Se crea en Cartera con pago único el ' + fl(draft.due) + '.'}
      </span>
    </Box>
  )
}
