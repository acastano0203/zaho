import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Field, Input, Label, Select } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { CATEGORIAS_INGRESO } from '../../../../domain/rules/caja'
import { today } from '../../../../shared/lib/dates'
import { useCaja, useCajaActions } from '../hooks/useCaja'

/** Dinero que entra y no viene de una venta ni de un abono: aportes, préstamos recibidos… */
export function IngresoModal() {
  const ui = useUI()
  const { todas } = useCaja()
  const { ingreso } = useCajaActions()
  const [f, setF] = useState({ cuentaId: todas[0]?.id ?? '', date: today(), categoria: CATEGORIAS_INGRESO[0], concepto: '', val: '' })
  const up = (p: Partial<typeof f>) => setF({ ...f, ...p })

  return (
    <Modal kicker="Caja" title="Registrar otro ingreso" onClose={ui.closeModal}>
      <p className="-mt-1 text-[13px] text-taupe">Las ventas de contado y los abonos entran solos a caja. Usa esto para dinero de otro origen.</p>
      <div className="flex flex-col gap-1.5">
        <Label>Tipo de ingreso</Label>
        <Chips value={f.categoria} onChange={v => up({ categoria: v })} options={CATEGORIAS_INGRESO.map(c => ({ value: c, label: c }))} />
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Valor"><MoneyInput value={f.val} onChange={v => up({ val: v })} /></Field>
        <Field label="Entra a"><Select value={f.cuentaId} onChange={e => up({ cuentaId: e.target.value })} options={todas.map(c => ({ value: c.id, label: c.nombre }))} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[1fr_2fr]">
        <Field label="Fecha"><Input type="date" value={f.date} max={today()} onChange={e => up({ date: e.target.value })} /></Field>
        <Field label="Detalle"><Input value={f.concepto} onChange={e => up({ concepto: e.target.value })} placeholder="Ej. aporte de la socia" /></Field>
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (ingreso(f)) ui.closeModal() }}>Registrar ingreso</Button>
      </ModalActions>
    </Modal>
  )
}
