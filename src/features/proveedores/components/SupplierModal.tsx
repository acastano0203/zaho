import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Chip } from '../../../components/ui/Chip'
import { Switch } from '../../../components/ui/Display'
import { Field, Input, Label } from '../../../components/ui/Field'
import { BRANDS } from '../../../lib/constants'
import type { SupplierForm } from '../services/suppliersService'
import { useSupplierActions } from '../hooks/useSuppliers'

export function SupplierModal({ id }: { id?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { saveSupplier } = useSupplierActions()
  const s = id ? data.suppliers.find(x => x.id === id) : undefined
  const [f, setF] = useState<SupplierForm>({ id, name: s?.name || '', brands: s?.brands || [], contact: s?.contact || '', wa: s?.wa || '', auto: s?.auto || false })
  const toggleBrand = (b: string) => setF({ ...f, brands: f.brands.includes(b) ? f.brands.filter(x => x !== b) : [...f.brands, b] })

  return (
    <Modal kicker="Proveedores" title={id ? 'Modificar proveedor' : 'Nuevo proveedor'} onClose={ui.closeModal}>
      <Field label="Nombre"><Input placeholder="Ej. Textiles del Norte" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <div className="flex flex-col gap-1.5">
        <Label>Marcas que surte</Label>
        <div className="flex flex-wrap gap-1.5">{BRANDS.map(b => <Chip key={b} label={b} on={f.brands.includes(b)} onClick={() => toggleBrand(b)} />)}</div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Contacto"><Input value={f.contact} onChange={e => setF({ ...f, contact: e.target.value })} /></Field>
        <Field label="WhatsApp"><Input inputMode="tel" placeholder="300 000 0000" value={f.wa} onChange={e => setF({ ...f, wa: e.target.value })} /></Field>
      </div>
      <div className="flex items-center gap-3 rounded-md border border-linen p-3">
        <Switch on={f.auto} onClick={() => setF({ ...f, auto: !f.auto })} label="Pedido automático" />
        <span className="text-[13px]">Pedido automático cuando un producto baje del mínimo</span>
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (saveSupplier(f)) ui.closeModal() }}>Guardar</Button>
      </ModalActions>
    </Modal>
  )
}
