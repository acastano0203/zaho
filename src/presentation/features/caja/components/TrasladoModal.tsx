import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { cop } from '../../../../shared/lib/format'
import { today } from '../../../../shared/lib/dates'
import { useCaja, useCajaActions } from '../hooks/useCaja'

/** Mover dinero entre cuentas: consignar efectivo, pasar de Nequi al banco… */
export function TrasladoModal() {
  const ui = useUI()
  const { todas, cuentas } = useCaja()
  const { traslado } = useCajaActions()
  const efectivo = todas.find(c => c.tipo === 'efectivo')
  const desde0 = efectivo?.id ?? todas[0]?.id ?? ''
  const [f, setF] = useState({ desde: desde0, hasta: todas.find(c => c.id !== desde0)?.id ?? '', date: today(), val: '', concepto: '' })
  const up = (p: Partial<typeof f>) => setF({ ...f, ...p })
  const saldo = cuentas.find(c => c.cuenta.id === f.desde)?.saldo ?? 0
  const opts = todas.map(c => ({ value: c.id, label: c.nombre }))

  return (
    <Modal kicker="Caja" title="Trasladar entre cuentas" onClose={ui.closeModal}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Sale de"><Select value={f.desde} onChange={e => up({ desde: e.target.value })} options={opts} /></Field>
        <Field label="Entra a"><Select value={f.hasta} onChange={e => up({ hasta: e.target.value })} options={opts} /></Field>
      </div>
      <p className="-mt-1 text-xs text-taupe">Disponible hoy en la cuenta de origen: <b className="text-ink">{cop(saldo)}</b></p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Valor"><MoneyInput value={f.val} onChange={v => up({ val: v })} /></Field>
        <Field label="Fecha"><Input type="date" value={f.date} max={today()} onChange={e => up({ date: e.target.value })} /></Field>
      </div>
      <Field label="Detalle (opcional)"><Input value={f.concepto} onChange={e => up({ concepto: e.target.value })} placeholder="Ej. consignación del efectivo de la semana" /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (traslado(f)) ui.closeModal() }}>Trasladar</Button>
      </ModalActions>
    </Modal>
  )
}
