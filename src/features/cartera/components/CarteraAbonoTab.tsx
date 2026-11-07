import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Button } from '../../../components/ui/Button'
import { Chip, Chips } from '../../../components/ui/Chip'
import { Box, Empty, Progress } from '../../../components/ui/Display'
import { Field, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { Segmented } from '../../../components/ui/Segmented'
import { fl } from '../../../lib/dates'
import { cop, num } from '../../../lib/format'
import { allocate } from '../../../lib/finance'
import type { CarRow } from '../../../types'
import { useCarteraActions } from '../hooks/useCartera'

const METS = ['Nequi', 'Bancolombia', 'Efectivo', 'Transferencia']

export function CarteraAbonoTab({ r, onDone }: { r: CarRow; onDone: (done: boolean) => void }) {
  const ui = useUI()
  const { abono } = useCarteraActions()
  const [val, setVal] = useState('')
  const [met, setMet] = useState('Nequi')
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [sel, setSel] = useState<number[]>([])

  if (r.saldo <= 0) return <Empty>Esta cuenta está saldada.</Empty>

  const amt = num(val)
  const pend = r.cu.filter(q => q.paid < q.amount)
  const al = allocate(r, amt, mode, sel)
  const nxRem = r.next ? r.next.amount - r.next.paid : 0
  const half = Math.round(r.saldo / 2)
  const quick = (nxRem && r.hasPlan ? [{ label: 'Próxima cuota · ' + cop(nxRem), v: nxRem }] : [])
    .concat([{ label: 'Saldo completo · ' + cop(r.saldo), v: r.saldo }, { label: 'Mitad · ' + cop(half), v: half }])

  let left = ''
  if (al.over > 0) left = 'El abono supera el saldo por ' + cop(al.over) + '. Se registra solo ' + cop(r.saldo) + '.'
  else if (al.spill > 0) left = 'Las cuotas elegidas solo necesitan ' + cop(al.applied - al.spill) + '. Los ' + cop(al.spill) + ' que sobran pasan a la siguiente cuota pendiente.'

  const toggle = (n: number) => {
    if (mode !== 'manual') { setMode('manual'); setSel([n]); return }
    setSel(sel.includes(n) ? sel.filter(x => x !== n) : [...sel, n].sort((a, b) => a - b))
  }
  const submit = () => {
    const res = abono(r.c.id, amt, met, mode, sel)
    if (!res.ok) return
    onDone(res.done)
    if (res.done && r.c.kind !== 'prestamo') setTimeout(() => ui.openModal({ type: 'wa', cid: r.c.id, tpl: 'gracias' }), 60)
  }

  return (
    <>
      <Field label="Valor del abono"><MoneyInput value={val} onChange={setVal} className="h-12 text-lg" /></Field>
      <div className="flex flex-wrap gap-1.5">{quick.map(b => <Chip key={b.label} label={b.label} onClick={() => setVal(String(b.v))} />)}</div>
      <div className="flex flex-col gap-1.5"><Label>Método</Label>
        <Chips value={met} onChange={setMet} options={METS.map(m => ({ value: m, label: m }))} />
      </div>
      {pend.length > 1 && (
        <div className="flex flex-col gap-1.5"><Label>Asignación del abono</Label>
          <Segmented label="Asignación" value={mode} onChange={v => { setMode(v); setSel(v === 'manual' && pend.length ? [pend[0].n] : []) }}
            options={[{ value: 'auto', label: 'Automática' }, { value: 'manual', label: 'Elegir cuotas' }]} />
          <span className="text-xs text-taupe">{mode === 'auto' ? 'Cubre primero la cuota más antigua. Toca una cuota para elegir tú.' : 'Toca las cuotas a las que va este abono.'}</span>
        </div>
      )}
      <div className="flex flex-col gap-1.5"><Label>Así queda</Label>
        <div className="rounded-md border border-linen bg-white">
          {pend.map(q => {
            const add = al.map[q.n] || 0, after = q.paid + add, on = mode === 'manual' && sel.includes(q.n)
            return (
              <button key={q.n} type="button" onClick={() => toggle(q.n)} aria-pressed={on}
                className={'grid min-h-[52px] w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-mist ' + (on ? 'bg-mist shadow-[inset_3px_0_0_#3E3A38]' : '')}>
                <span className={'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold ' + (after >= q.amount ? 'border-ok bg-ok text-cream' : 'border-stone')}>{q.n}</span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="font-semibold text-ink">{(r.hasPlan ? 'Cuota ' + q.n + ' · ' : 'Saldo · ') + fl(q.due)}</span>
                  <Progress className="max-w-60" value={Math.round((after / Math.max(q.amount, 1)) * 100)} />
                  <span className="text-xs text-taupe">Falta {cop(q.amount - q.paid)}{add ? (after >= q.amount ? ' → queda pagada' : ' → faltarán ' + cop(q.amount - after)) : ''}</span>
                </span>
                <span className="font-semibold text-util tabular">{add ? '+' + cop(add) : ''}</span>
              </button>
            )
          })}
        </div>
      </div>
      {left && <Box warn>{left}</Box>}
      <Button variant="dark" size="lg" onClick={submit}>Registrar abono de {cop(Math.min(amt, r.saldo))}</Button>
    </>
  )
}
