import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select, TextArea } from '../../../components/ui/Field'
import { CIUDADES } from '../../../../shared/lib/constants'
import { useClientActions } from '../hooks/useClients'
import type { ClientForm } from '../services/clientsService'

const OTRA = '__otra__'

export function ClientFormModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { save } = useClientActions()
  const c = id ? data.clientes.find(x => x.id === id) : null
  const [f, setF] = useState<ClientForm>({ id, name: c?.name || '', phone: c?.phone || '', doc: c?.doc || '', city: c?.city || '', note: c?.note || '' })
  const set = (k: keyof ClientForm) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  // Ciudad: lista de las principales; "Otra" deja escribirla (también conserva valores viejos que no están en la lista)
  const [otra, setOtra] = useState(!!f.city && !CIUDADES.includes(f.city))
  const ciudad = otra ? OTRA : f.city
  const elegirCiudad = (e: { target: { value: string } }) => {
    const v = e.target.value
    setOtra(v === OTRA)
    setF({ ...f, city: v === OTRA ? (CIUDADES.includes(f.city) ? '' : f.city) : v })
  }

  return (
    <Modal kicker="Clientes" title={id ? 'Editar cliente' : 'Nuevo cliente'} onClose={ui.closeModal}>
      <Field label="Nombre completo"><Input placeholder="Nombre y apellido" value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Cédula o NIT"><Input inputMode="numeric" value={f.doc} onChange={set('doc')} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Ciudad">
          <Select value={ciudad} onChange={elegirCiudad}
            options={[{ value: '', label: 'Sin ciudad' }, ...CIUDADES.map(c => ({ value: c, label: c })), { value: OTRA, label: 'Otra…' }]} />
        </Field>
        {otra && <Field label="¿Cuál ciudad?"><Input placeholder="Escribe la ciudad" value={f.city} onChange={set('city')} autoFocus /></Field>}
      </div>
      <Field label="Nota"><TextArea rows={3} placeholder="Ej. Talla M en blusas, prefiere pagar por Nequi" value={f.note} onChange={set('note')} /></Field>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (save(f)) ui.closeModal() }}>Guardar cliente</Button>
      </ModalActions>
    </Modal>
  )
}
