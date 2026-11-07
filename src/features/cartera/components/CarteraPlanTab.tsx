import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Box, Pill, Progress, Stepper } from '../../../components/ui/Display'
import { Field, Input, Label } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { QST } from '../../../lib/constants'
import { addDays, diff, fl, today, wd } from '../../../lib/dates'
import { cap, cop } from '../../../lib/format'
import { cuotaStatus, dueText, planPreview } from '../../../lib/finance'
import type { CarRow, Freq } from '../../../types'
import { FREQ_OPTS } from '../../ventas/components/CreditOptions'
import { useCarteraActions } from '../hooks/useCartera'

export function CarteraPlanTab({ r, goAbono }: { r: CarRow; goAbono: () => void }) {
  const { plan } = useCarteraActions()
  const [edit, setEdit] = useState(false)
  const [n, setN] = useState(r.hasPlan ? r.cu.length : 3)
  const [freq, setFreq] = useState<Freq>('quincenal')
  const [first, setFirst] = useState(addDays(today(), 7))

  if (edit) {
    const prev = planPreview(r.saldo, n, freq, first)
    return (
      <>
        <Box>
          <div className="flex flex-wrap items-baseline justify-between gap-3"><Label>Saldo a repartir</Label><span className="font-display text-base text-ink tabular">{cop(r.saldo)}</span></div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><Label>Cuotas</Label>
              <Stepper value={n} onDec={() => setN(Math.max(1, n - 1))} onInc={() => setN(Math.min(24, n + 1))} />
            </div>
            <Field label="Primera cuota"><Input type="date" value={first} onChange={e => setFirst(e.target.value)} /></Field>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Frecuencia</Label>
            <Segmented label="Frecuencia" value={freq} onChange={setFreq} options={FREQ_OPTS} />
          </div>
        </Box>
        <div className="rounded-md border border-linen bg-white">
          {prev.map(q => (
            <div key={q.n} className="grid min-h-12 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-stone text-xs font-semibold">{q.n}</span>
              <span>{cap(wd(q.due))} {fl(q.due)}</span>
              <strong className="tabular">{cop(q.amount)}</strong>
            </div>
          ))}
        </div>
        <span className="text-xs text-taupe">{r.paid > 0 ? 'El plan reparte el saldo actual. Los ' + cop(r.paid) + ' ya abonados quedan en el historial.' : 'El plan reparte el valor total de la deuda.'}</span>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setEdit(false)}>Cancelar</Button>
          <Button variant="dark" onClick={() => { if (plan(r.c.id, n, freq, first)) setEdit(false) }}>Aplicar plan</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="rounded-md border border-linen bg-white">
        {r.cu.map(q => {
          const st = cuotaStatus(q)
          const dt = dueText(diff(q.due, today()), q.due)
          return (
            <div key={q.n} className="grid min-h-[52px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0">
              <span className={'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold ' + (st === 'pag' ? 'border-ok bg-ok text-cream' : 'border-stone')}>{q.n}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span><strong className="tabular">{cop(q.amount)}</strong> <span className="text-taupe">· {fl(q.due)}</span></span>
                <Progress className="max-w-56" value={Math.round((q.paid / Math.max(q.amount, 1)) * 100)} />
                <span className="text-xs text-taupe">
                  {st === 'pag' ? 'Pagada completa' : q.paid > 0 ? 'Abonado ' + cop(q.paid) + ' · falta ' + cop(q.amount - q.paid) + ' · ' + dt : cap(dt)}
                </span>
              </div>
              <Pill color={QST[st][1]}>{QST[st][0]}</Pill>
            </div>
          )
        })}
      </div>
      {r.saldo > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEdit(true)}>{r.hasPlan ? 'Rehacer plan con el saldo' : 'Dividir en cuotas'}</Button>
          <Button variant="dark" onClick={goAbono}>Registrar abono</Button>
        </div>
      )}
    </>
  )
}
