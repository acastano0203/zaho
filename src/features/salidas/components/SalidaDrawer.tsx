import { useState, type ReactNode } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI, type SalidaKind } from '../../../store/UIStore'
import { useNavigate } from 'react-router-dom'
import { Drawer } from '../../../components/ui/Drawer'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { IconDoc, IconLoan, IconReceipt } from '../../../components/ui/Icons'
import { METODOS, TIPOS } from '../../../lib/constants'
import { plus, today } from '../../../lib/dates'
import { cop, num } from '../../../lib/format'
import type { SalidaForm } from '../services/salidasService'
import { useSalidaActions } from '../hooks/useSalidas'
import { GastoFields } from './GastoFields'
import { RepaymentPlan } from './RepaymentPlan'

type Form = SalidaForm & { autoDesc: boolean; autoVal: boolean }

function KindButton({ on, onClick, icon, title, sub }: { on: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={'flex min-h-24 flex-col gap-1.5 rounded-md border p-3.5 text-left ' + (on ? 'border-char bg-cream shadow-[inset_0_0_0_1px_#3E3A38]' : 'border-stone hover:bg-mist')}>
      <span className="flex items-center gap-2 font-bold text-ink">{icon}{title}</span>
      <span className="text-xs leading-snug text-taupe">{sub}</span>
    </button>
  )
}

export function SalidaDrawer({ kind, origin }: { kind: SalidaKind; origin: 'salidas' | 'cartera' }) {
  const { data } = useApp()
  const ui = useUI()
  const nav = useNavigate()
  const { save } = useSalidaActions()
  const [f, setF] = useState<Form>({
    kind, date: today(), tipo: 'operativo', sub: '', desc: '', val: '', met: kind === 'prestamo' ? 'Nequi' : 'Efectivo', file: '', otro: '',
    to: '', toPhone: '', dev: plus(15), concepto: '', abono: '', com: '', mode: 'single', n: 2, freq: 'quincenal', first: plus(15), autoDesc: false, autoVal: false,
  })
  const set = (p: Partial<Form>) => setF(x => ({ ...x, ...p }))
  const isLoan = f.kind === 'prestamo', isDeuda = f.kind === 'deuda'
  const val = num(f.val)
  const planAmt = isDeuda ? Math.max(val - num(f.abono), 0) : val

  const submit = () => {
    const r = save(f)
    if (!r.ok) return
    if (r.cid) { nav('/cartera'); ui.openDrawer({ type: 'cartera', cid: r.cid, sec: 'detalle' }) }
    else ui.closeDrawer()
  }

  return (
    <Drawer onClose={ui.closeDrawer}
      kicker={origin === 'cartera' ? 'Agregar a cartera' : 'Salidas de dinero'}
      title={isLoan ? 'Prestar dinero' : isDeuda ? 'Nueva cuenta por cobrar' : 'Registrar gasto'}
      footer={
        <>
          <div className="min-w-0">
            <span className="block truncate text-[11px] uppercase tracking-[0.22em]">{isLoan ? 'Préstamo · por recuperar' : isDeuda ? 'Saldo por cobrar' : TIPOS[f.tipo]}</span>
            <div className="font-display text-xl text-ink tabular">{cop(planAmt)}</div>
          </div>
          <Button variant="dark" size="lg" onClick={submit}>{isLoan ? 'Registrar préstamo' : isDeuda ? 'Crear cuenta' : 'Guardar gasto'}</Button>
        </>
      }>
      <div className="flex flex-col gap-1.5">
        <Label>¿Qué vas a registrar?</Label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {origin !== 'cartera' && <KindButton on={f.kind === 'gasto'} onClick={() => set({ kind: 'gasto', met: 'Efectivo' })} icon={<IconReceipt />} title="Gasto o costo" sub="Arriendo, compras, envíos, comisiones. El dinero no vuelve." />}
          <KindButton on={isLoan} onClick={() => set({ kind: 'prestamo', met: 'Nequi' })} icon={<IconLoan />} title="Préstamo" sub="Dinero que sale de caja y debe volver. Queda en Salidas y en Cartera." />
          {origin === 'cartera' && <KindButton on={isDeuda} onClick={() => set({ kind: 'deuda' })} icon={<IconDoc />} title="Cuenta por cobrar" sub="Alguien te debe sin venta registrada: saldo anterior, fiado. No sale dinero." />}
        </div>
      </div>

      {f.kind === 'gasto' && <GastoFields f={f} set={set} />}

      {isLoan && (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="¿A quién le prestas?"><Input placeholder="Nombre" value={f.to} onChange={e => set({ to: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.toPhone} onChange={e => set({ toPhone: e.target.value })} /></Field>
            <Field label="Valor prestado"><MoneyInput value={f.val} onChange={v => set({ val: v })} /></Field>
            <Field label="Fecha de entrega"><Input type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Cómo lo entregas</Label>
            <Chips value={f.met} onChange={v => set({ met: v })} options={METODOS.map(m => ({ value: m, label: m }))} />
          </div>
        </>
      )}

      {isDeuda && (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Cliente"><Input placeholder="Nombre" list="zaho-clientes" value={f.to} onChange={e => set({ to: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.toPhone} onChange={e => set({ toPhone: e.target.value })} /></Field>
          </div>
          <datalist id="zaho-clientes">{data.clientes.map(c => <option key={c.id} value={c.name} />)}</datalist>
          <Field label="Concepto"><Input placeholder="Ej. Saldo anterior, prendas fiadas en feria" value={f.concepto} onChange={e => set({ concepto: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label="Valor total"><MoneyInput value={f.val} onChange={v => set({ val: v })} /></Field>
            <Field label="Abono inicial"><MoneyInput value={f.abono} onChange={v => set({ abono: v })} /></Field>
            <Field label="Fecha"><Input type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Comercial a cargo</Label>
            <Chips value={f.com} onChange={v => set({ com: v })} options={[{ value: '', label: 'Sin comercial' }, ...data.comerciales.map(c => ({ value: c.id, label: c.name }))]} />
          </div>
        </>
      )}

      {(isLoan || isDeuda) && <RepaymentPlan f={f} amount={planAmt} isLoan={isLoan} set={set} />}
    </Drawer>
  )
}
