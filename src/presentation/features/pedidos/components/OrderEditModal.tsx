import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import type { OrderLine } from '../../../../domain/entities'
import { useOrderActions } from '../hooks/usePedidos'
import { OrderProductList } from './OrderProductList'
import { orderWarehouse } from '../../../../domain/rules/pedidos'

/** Modifica las cantidades de un pedido en curso: se ven todos los productos del proveedor */
export function OrderEditModal({ id }: { id: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { updateOrder } = useOrderActions()
  const o = data.orders.find(x => x.id === id)
  const [lines, setLines] = useState<OrderLine[]>(() => o?.lines.map(l => ({ ...l })) || [])
  if (!o) return null
  const sup = data.suppliers.find(s => s.id === o.sup)

  return (
    <Modal kicker={'Pedido ' + o.id + ' · ' + o.status + ' · llega a ' + orderWarehouse(data, o)} title={sup?.name || 'Pedido'} onClose={ui.closeModal}>
      {o.status === 'Recibido' ? (
        <p className="text-sm text-taupe">Este pedido ya fue recibido y sumó al inventario, así que no se puede modificar.</p>
      ) : (
        <>
          {sup
            ? <OrderProductList supplier={sup} wh={orderWarehouse(data, o)} lines={lines} onChange={setLines} orderId={o.id} />
            : <p className="text-sm text-taupe">El proveedor de este pedido ya no existe.</p>}
        </>
      )}
      <ModalActions>
        <Button onClick={ui.closeModal}>{o.status === 'Recibido' ? 'Cerrar' : 'Cancelar'}</Button>
        {o.status !== 'Recibido' && <Button variant="dark" onClick={() => { if (updateOrder(o.id, lines)) ui.closeModal() }}>Guardar cambios</Button>}
      </ModalActions>
    </Modal>
  )
}
