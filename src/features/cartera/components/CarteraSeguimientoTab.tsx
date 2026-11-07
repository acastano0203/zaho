import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Box } from '../../../components/ui/Display'
import { Field, Input, Label, TextArea } from '../../../components/ui/Field'
import { C } from '../../../lib/constants'
import { fd, fl } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import { comName } from '../../../lib/selectors'
import type { CarRow } from '../../../types'
import { useCarteraActions } from '../hooks/useCartera'

const TIPOS = ['Llamada', 'WhatsApp', 'Visita', 'Nota']
interface Ev { k: string; date: string; title: string; sub: string; color: string }

export function CarteraSeguimientoTab({ r }: { r: CarRow }) {
  const { data } = useApp()
  const { gestion } = useCarteraActions()
  const [tipo, setTipo] = useState('Llamada')
  const [nota, setNota] = useState('')
  const [promesa, setPromesa] = useState('')

  const save = () => { if (gestion(r.c.id, tipo, nota, promesa)) { setNota(''); setPromesa('') } }

  const ev: Ev[] = []
  const pad = (n: number) => ('000' + n).slice(-3)
  if (r.sale) ev.push({
    k: r.sale.date + '0', date: fd(r.sale.date), title: 'Venta a crédito ' + r.sale.id + ' · ' + cop(r.total), color: '#3E3A38',
    sub: r.sale.items.map(it => { const p = data.products.find(x => x.id === it.pid); return p ? p.name + ' T' + p.size + ' ×' + it.qty : '' }).join(', ') + ' · vendió ' + comName(data, r.c.com),
  })
  const start = r.hasPlan ? r.c.planStart || 0 : 0
  r.c.abonos.forEach((a, ix) => ev.push({
    k: a.date + '1' + pad(ix), date: fd(a.date), title: a.label + ' · ' + cop(a.val) + (a.met ? ' · ' + a.met : ''), color: C.ok,
    sub: ix < start ? 'Antes del plan de pagos' : a.alloc && a.alloc.length && r.hasPlan ? 'Aplicado a ' + a.alloc.map(x => 'cuota ' + x.n + ' (' + cop(x.val) + ')').join(', ') : 'Aplicado al saldo',
  }))
  r.c.gestiones.forEach((g, ix) => ev.push({
    k: g.date + '2' + pad(ix), date: fd(g.date), title: g.tipo,
    sub: (g.nota || '') + (g.promesa ? ' · Promete pagar el ' + fl(g.promesa) : ''),
    color: g.tipo === 'Plan' || g.tipo === 'Préstamo' ? '#3E3A38' : g.promesa ? C.warn : C.stone,
  }))
  const tl = ev.sort((a, b) => (a.k < b.k ? 1 : -1))

  return (
    <>
      <Box>
        <Label>Registrar gestión</Label>
        <Chips value={tipo} onChange={setTipo} options={TIPOS.map(t => ({ value: t, label: t }))} />
        <Field label="Qué pasó"><TextArea rows={3} placeholder="Ej. Contestó, dice que paga el viernes por Nequi" value={nota} onChange={e => setNota(e.target.value)} /></Field>
        <div className="grid grid-cols-1 items-end gap-3.5 sm:grid-cols-2">
          <Field label="Promesa de pago (opcional)"><Input type="date" value={promesa} onChange={e => setPromesa(e.target.value)} /></Field>
          <Button variant="dark" onClick={save}>Guardar gestión</Button>
        </div>
      </Box>
      <div className="flex flex-col">
        {tl.map(t => (
          <div key={t.k} className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-3 pb-4 before:absolute before:top-4 before:bottom-0 before:left-1.5 before:w-px before:bg-sand last:before:hidden">
            <span className="mt-[3px] h-[13px] w-[13px] rounded-full border-2 border-white shadow-[0_0_0_1px_#8A837C]" style={{ background: t.color }} />
            <div className="min-w-0">
              <div><strong>{t.title}</strong> <span className="text-taupe">· {t.date}</span></div>
              <div className="text-xs text-taupe">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
