import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Field, Input, Label } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { METODOS, TIPOS } from '../../../lib/constants'
import type { SalidaTipo } from '../../../types'
import type { SalidaEditForm } from '../services/salidasService'
import { useSalidaActions } from '../hooks/useSalidas'

const GASTO_TIPOS: SalidaTipo[] = ['compra', 'transporte', 'operativo', 'comerciales', 'otro']

export function SalidaEditModal({ id }: { id: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { update } = useSalidaActions()
  const g = data.salidas.find(x => x.id === id)
  const [f, setF] = useState<SalidaEditForm>({ tipo: g?.tipo || 'operativo', otro: g?.otro || '', desc: g?.desc || '', val: String(g?.val || ''), date: g?.date || '', met: g?.met || 'Efectivo' })
  if (!g) return null

  return (
    <Modal kicker={'Salida ' + g.id} title="Modificar gasto" onClose={ui.closeModal}>
      <div className="flex flex-col gap-1.5"><Label>Tipo</Label>
        <Chips value={f.tipo} onChange={t => setF({ ...f, tipo: t })} options={GASTO_TIPOS.map(t => ({ value: t, label: TIPOS[t] }))} />
      </div>
      {f.tipo === 'otro' && <Field label="¿Qué tipo de salida?"><Input value={f.otro} onChange={e => setF({ ...f, otro: e.target.value })} /></Field>}
      <Field label="Descripción"><Input value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Valor"><MoneyInput value={f.val} onChange={v => setF({ ...f, val: v })} /></Field>
        <Field label="Fecha"><Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      </div>
      <div className="flex flex-col gap-1.5"><Label>Método de pago</Label>
        <Chips value={f.met} onChange={v => setF({ ...f, met: v })} options={METODOS.map(m => ({ value: m, label: m }))} />
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (update(g.id, f)) ui.closeModal() }}>Guardar cambios</Button>
      </ModalActions>
    </Modal>
  )
}
