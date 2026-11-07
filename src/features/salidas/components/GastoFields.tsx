import { useApp } from '../../../store/AppStore'
import { Chips } from '../../../components/ui/Chip'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { METODOS, TIPOS } from '../../../lib/constants'
import { monthName, today } from '../../../lib/dates'
import { cop, firstName } from '../../../lib/format'
import { saleTotal } from '../../../lib/finance'
import type { SalidaTipo } from '../../../types'
import type { SalidaForm } from '../services/salidasService'

type Auto = { autoDesc: boolean; autoVal: boolean }
interface Props { f: SalidaForm & Auto; set: (p: Partial<SalidaForm & Auto>) => void }

const GASTO_TIPOS: SalidaTipo[] = ['compra', 'transporte', 'operativo', 'comerciales', 'otro']

export function GastoFields({ f, set }: Props) {
  const { data } = useApp()
  const T = today()
  const SUBS: Partial<Record<SalidaTipo, string[]>> = {
    operativo: ['Arriendo', 'Servicios públicos', 'Empaques', 'Mantenimiento', 'Publicidad'],
    transporte: ['Domicilio local', 'Envío nacional', 'Transporte de mercancía'],
    compra: data.suppliers.map(x => x.name),
    comerciales: data.comerciales.map(x => x.name),
  }
  const SUBL: Partial<Record<SalidaTipo, string>> = { operativo: 'Concepto', transporte: 'Concepto', compra: 'Proveedor', comerciales: 'Comercial' }
  const commOf = (name: string) => {
    const c = data.comerciales.find(y => y.name === name)
    if (!c) return 0
    return Math.round((data.sales.filter(x => x.com === c.id && x.date.slice(0, 7) === T.slice(0, 7)).reduce((a, x) => a + saleTotal(x), 0) * c.pct) / 100)
  }
  const descFor = (t: SalidaTipo, x: string) =>
    t === 'operativo' ? x + ' ' + monthName() : t === 'compra' ? 'Pedido ' + x : t === 'comerciales' ? 'Comisiones ' + monthName() + ' · ' + x : x

  const pickSub = (x: string) => {
    const p: Partial<SalidaForm & Auto> = { sub: x }
    if (!f.desc || f.autoDesc) { p.desc = descFor(f.tipo, x); p.autoDesc = true }
    if (f.tipo === 'comerciales') { const cm = commOf(x); if (cm && (!f.val || f.autoVal)) { p.val = String(cm); p.autoVal = true } }
    set(p)
  }
  const subs = SUBS[f.tipo]

  return (
    <>
      <div className="flex flex-col gap-1.5"><Label>Tipo de gasto</Label>
        <Chips value={f.tipo} options={GASTO_TIPOS.map(t => ({ value: t, label: TIPOS[t] }))}
          onChange={t => set({ tipo: t, sub: '', desc: f.autoDesc ? '' : f.desc, autoDesc: false, val: f.autoVal ? '' : f.val, autoVal: false })} />
      </div>
      {subs && (
        <div className="flex flex-col gap-1.5"><Label>{SUBL[f.tipo]}</Label>
          <Chips value={f.sub} onChange={pickSub} options={subs.map(x => ({ value: x, label: x }))} />
          {f.tipo === 'comerciales' && f.sub && <span className="text-xs text-taupe">Comisión ganada en {monthName()} por {firstName(f.sub)}: {cop(commOf(f.sub))}</span>}
        </div>
      )}
      {f.tipo === 'otro' && (
        <Field label="¿Qué tipo de salida?"><Input placeholder="Ej. Cafetería, papelería" value={f.otro} onChange={e => set({ otro: e.target.value })} /></Field>
      )}
      <Field label="Descripción"><Input placeholder="Ej. Arriendo local noviembre" value={f.desc} onChange={e => set({ desc: e.target.value, autoDesc: false })} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Valor"><MoneyInput value={f.val} onChange={v => set({ val: v, autoVal: false })} /></Field>
        <Field label="Fecha"><Input type="date" value={f.date} onChange={e => set({ date: e.target.value })} /></Field>
      </div>
      <div className="flex flex-col gap-1.5"><Label>Método de pago</Label>
        <Chips value={f.met} onChange={v => set({ met: v })} options={METODOS.map(m => ({ value: m, label: m }))} />
      </div>
      <Field label="Soporte (foto de factura, opcional)">
        <Input type="file" accept="image/*,application/pdf" className="pt-2" onChange={e => set({ file: e.target.files?.[0]?.name || '' })} />
      </Field>
    </>
  )
}
