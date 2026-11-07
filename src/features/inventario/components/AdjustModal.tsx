import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select } from '../../../components/ui/Field'
import { MOTIVOS } from '../../../lib/constants'
import { useInventoryActions } from '../hooks/useInventory'
import { ProductPickList } from './ProductPickList'

export function AdjustModal({ pid: initial }: { pid?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { adjust } = useInventoryActions()
  const [pid, setPid] = useState(initial)
  const p = pid ? data.products.find(x => x.id === pid) : undefined
  const [qty, setQty] = useState(p ? String(p.stock) : '')
  const [motivo, setMotivo] = useState(MOTIVOS[0])

  const pick = (id: string) => { setPid(id); setQty(String(data.products.find(x => x.id === id)?.stock ?? '')) }

  return (
    <Modal kicker="Inventario" title="Ajustar stock" onClose={ui.closeModal}>
      <ProductPickList pid={pid} onPick={pick} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Nuevo stock"><Input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></Field>
        <Field label="Motivo"><Select value={motivo} onChange={e => setMotivo(e.target.value)} options={MOTIVOS} /></Field>
      </div>
      <span className="text-xs text-taupe">{p ? 'Stock actual: ' + p.stock + ' und en ' + p.wh + '. Mínimo: ' + p.min + '.' : 'Elige un producto de la lista.'}</span>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (adjust(pid, qty, motivo)) ui.closeModal() }}>Guardar ajuste</Button>
      </ModalActions>
    </Modal>
  )
}
