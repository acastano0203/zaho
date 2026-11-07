import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input } from '../../../components/ui/Field'
import type { ComercialForm } from '../services/comercialesService'
import { useComercialActions } from '../hooks/useComerciales'

export function ComercialModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { save } = useComercialActions()
  const c = id ? data.comerciales.find(x => x.id === id) : null
  const [f, setF] = useState<ComercialForm>({ id, name: c?.name || '', phone: c?.phone || '', pct: c ? String(c.pct) : '7' })

  return (
    <Modal kicker="Comerciales" title={id ? 'Editar comercial' : 'Crear comercial'} onClose={ui.closeModal}>
      <Field label="Nombre"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Teléfono"><Input inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Comisión %"><Input inputMode="decimal" value={f.pct} onChange={e => setF({ ...f, pct: e.target.value })} /></Field>
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (save(f)) ui.closeModal() }}>Guardar</Button>
      </ModalActions>
    </Modal>
  )
}
