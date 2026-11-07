import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label } from '../../../components/ui/Field'
import { otherWarehouse } from '../services/inventoryService'
import { useInventoryActions } from '../hooks/useInventory'
import { ProductPickList } from './ProductPickList'

export function TransferModal({ pid: initial }: { pid?: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { transfer } = useInventoryActions()
  const [pid, setPid] = useState(initial)
  const [qty, setQty] = useState('1')
  const p = pid ? data.products.find(x => x.id === pid) : undefined

  return (
    <Modal kicker="Inventario" title="Trasladar entre bodegas" onClose={ui.closeModal}>
      <ProductPickList pid={pid} onPick={setPid} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Desde → hacia</Label>
          <span className="font-semibold leading-10 text-ink">{p ? p.wh + ' → ' + otherWarehouse(p.wh) : 'Elige un producto'}</span>
        </div>
        <Field label="Unidades"><Input inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></Field>
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={() => { if (transfer(pid, qty)) ui.closeModal() }}>Trasladar</Button>
      </ModalActions>
    </Modal>
  )
}
