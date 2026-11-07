import { Box, Stepper } from '../../../components/ui/Display'
import { Field, Input, Label } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { fl, wd } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import { planPreview } from '../../../lib/finance'
import { FREQ_OPTS } from '../../ventas/components/CreditOptions'
import type { SalidaForm } from '../services/salidasService'

interface Props { f: SalidaForm; amount: number; isLoan: boolean; set: (p: Partial<SalidaForm>) => void }

/** Fecha única o cuotas para préstamos y cuentas por cobrar */
export function RepaymentPlan({ f, amount, isLoan, set }: Props) {
  const prev = f.mode === 'multi' && amount ? planPreview(amount, f.n, f.freq, f.first) : []
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>{isLoan ? 'Devolución' : 'Forma de pago'}</Label>
        <Segmented label="Forma de devolución" value={f.mode} onChange={v => set({ mode: v })}
          options={[{ value: 'single', label: 'Una sola fecha' }, { value: 'multi', label: 'En cuotas' }]} />
      </div>
      {f.mode === 'single' ? (
        <Field label={isLoan ? 'Fecha de devolución' : 'Fecha de vencimiento'}><Input type="date" value={f.dev} onChange={e => set({ dev: e.target.value })} /></Field>
      ) : (
        <>
          <Box>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label>Cuotas</Label>
                <Stepper value={f.n} onDec={() => set({ n: Math.max(2, f.n - 1) })} onInc={() => set({ n: Math.min(24, f.n + 1) })} />
              </div>
              <Field label="Primera cuota"><Input type="date" value={f.first} onChange={e => set({ first: e.target.value })} /></Field>
            </div>
            <div className="flex flex-col gap-1.5"><Label>Frecuencia</Label>
              <Segmented label="Frecuencia" value={f.freq} onChange={v => set({ freq: v })} options={FREQ_OPTS} />
            </div>
          </Box>
          {prev.length > 0 && (
            <div className="rounded-md border border-linen bg-white">
              {prev.map(q => (
                <div key={q.n} className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-stone text-xs font-semibold">{q.n}</span>
                  <span>{wd(q.due)} {fl(q.due)}</span>
                  <strong className="tabular">{cop(q.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <Field label="Nota (opcional)"><Input placeholder="Ej. Para surtir su puesto" value={f.desc} onChange={e => set({ desc: e.target.value })} /></Field>
      <span className="text-xs text-taupe">
        {isLoan ? 'Sale de caja: queda en Salidas y en Cartera como “por recuperar”, con su plan. Cada fecha aparece en Alertas.'
          : 'No es una salida de dinero: solo crea la cuenta en Cartera con su plan de pagos.'}
      </span>
    </>
  )
}
