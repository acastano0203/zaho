import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, TextArea } from '../../../components/ui/Field'
import { useClientActions } from '../hooks/useClients'
import type { ClientForm } from '../services/clientsService'

export function ClientFormModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { save } = useClientActions()
  const c = id ? data.clientes.find(x => x.id === id) : null
  const [f, setF] = useState<ClientForm>({ id, name: c?.name || '', phone: c?.phone || '', doc: c?.doc || '', city: c?.city || '', note: c?.note || '' })
  const set = (k: keyof ClientForm) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  return (
    <Modal kicker="Clientes" title={id ? 'Editar cliente' : 'Nuevo cliente'} onClose={ui.closeModal}>
      <Field label="Nombre completo"><Input placeholder="Ej. Laura Gómez" value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Cédula o NIT"><Input inputMode="numeric" value={f.doc} onChange={set('doc')} /></Field>
      </div>
      <Field label="Ciudad o barrio"><Input placeholder="Ej. Envigado" value={f.city} onChange={set('city')} /></Field>
      <Field label="Nota"><TextArea rows={3} placeholder="Ej. Talla M en blusas, prefiere pagar por Nequi" value={f.note} onChange={set('note')} /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (save(f)) ui.closeModal() }}>Guardar cliente</Button>
      </ModalActions>
    </Modal>
  )
}
