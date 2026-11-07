import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import type { CarteraEditForm } from '../services/carteraService'
import { useCarteraActions } from '../hooks/useCartera'

/** Modifica los datos de una cuenta de préstamo o manual. Las de venta se editan desde la venta. */
export function CarteraEditModal({ cid }: { cid: string }) {
  const { carRows } = useApp()
  const ui = useUI()
  const { update } = useCarteraActions()
  const r = carRows.find(x => x.c.id === cid)
  const [f, setF] = useState<CarteraEditForm>({
    client: r?.c.client || '', phone: r?.c.phone || '', concepto: r?.c.concepto || '', nota: r?.c.nota || '', total: String(r?.total || ''), due: r?.c.due || '',
  })
  if (!r) return null
  const c = r.c

  return (
    <Modal kicker={c.kind === 'prestamo' ? 'Préstamo' : 'Cuenta por cobrar'} title={'Modificar · ' + c.client} onClose={ui.closeModal}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label={c.kind === 'prestamo' ? 'A quién se le prestó' : 'Cliente'}><Input value={f.client} onChange={e => setF({ ...f, client: e.target.value })} /></Field>
        <Field label="WhatsApp"><Input inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      {c.kind === 'manual' && <Field label="Concepto"><Input value={f.concepto} onChange={e => setF({ ...f, concepto: e.target.value })} /></Field>}
      {c.kind !== 'venta' && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label={c.kind === 'prestamo' ? 'Valor prestado' : 'Valor total'}><MoneyInput value={f.total} onChange={v => setF({ ...f, total: v })} /></Field>
          {!r.hasPlan && <Field label="Fecha de vencimiento"><Input type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} /></Field>}
        </div>
      )}
      {c.kind === 'venta' && !r.hasPlan && <Field label="Fecha de vencimiento"><Input type="date" value={f.due} onChange={e => setF({ ...f, due: e.target.value })} /></Field>}
      <Field label="Nota"><Input value={f.nota} onChange={e => setF({ ...f, nota: e.target.value })} /></Field>
      <span className="text-xs text-taupe">
        {c.kind === 'venta' ? 'Los productos y el valor se cambian editando la venta ' + c.saleId + '.' : r.hasPlan ? 'Si cambias el valor, la diferencia se ajusta en la última cuota. Las fechas se cambian rehaciendo el plan.' : ''}
        {c.kind === 'prestamo' ? ' La salida de dinero del préstamo se actualiza también.' : ''}
      </span>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        {c.kind === 'venta' && <Button onClick={() => ui.openDrawer({ type: 'sale', editId: c.saleId })}>Editar la venta</Button>}
        <Button variant="dark" onClick={() => { if (update(cid, f)) ui.closeModal() }}>Guardar cambios</Button>
      </ModalActions>
    </Modal>
  )
}
