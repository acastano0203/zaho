import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Stepper } from '../../../components/ui/Display'
import { Field, Select } from '../../../components/ui/Field'
import type { OrderLine } from '../../../types'
import { useSupplierActions } from '../hooks/useSuppliers'

/** Modifica las cantidades de un pedido en curso y permite agregar productos del mismo proveedor */
export function OrderEditModal({ id }: { id: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { updateOrder } = useSupplierActions()
  const o = data.orders.find(x => x.id === id)
  const [lines, setLines] = useState<OrderLine[]>(() => o?.lines.map(l => ({ ...l })) || [])
  if (!o) return null
  const sup = data.suppliers.find(s => s.id === o.sup)
  const available = data.products.filter(p => sup?.brands.includes(p.brand) && !lines.some(l => l.pid === p.id))
  const qty = (pid: string, d: number) => setLines(lines.map(l => (l.pid === pid ? { ...l, qty: Math.max(0, l.qty + d) } : l)).filter(l => l.qty > 0))

  return (
    <Modal kicker={'Pedido ' + o.id + ' · ' + o.status} title={sup?.name || 'Pedido'} onClose={ui.closeModal}>
      {o.status === 'Recibido' ? (
        <p className="text-sm text-taupe">Este pedido ya fue recibido y sumó al inventario, así que no se puede modificar.</p>
      ) : (
        <>
          <div className="rounded-md border border-linen bg-white">
            {lines.map(l => {
              const p = data.products.find(x => x.id === l.pid)
              return (
                <div key={l.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                  <div className="min-w-0"><div className="font-semibold text-ink">{p?.name || 'Producto eliminado'}</div><div className="text-xs text-taupe">{p ? 'Talla ' + p.size + ' · ' + p.color + ' · stock ' + p.stock : ''}</div></div>
                  <Stepper small value={l.qty} onDec={() => qty(l.pid, -1)} onInc={() => qty(l.pid, 1)} />
                </div>
              )
            })}
            {!lines.length && <p className="p-4 text-center text-[13px] text-taupe">Sin productos.</p>}
          </div>
          {available.length > 0 && (
            <Field label="Agregar producto">
              <Select value="" onChange={e => e.target.value && setLines([...lines, { pid: e.target.value, qty: 1 }])}
                options={[{ value: '', label: 'Elegir…' }, ...available.map(p => ({ value: p.id, label: p.name + ' · T' + p.size }))]} />
            </Field>
          )}
        </>
      )}
      <ModalActions>
        <Button onClick={ui.closeModal}>{o.status === 'Recibido' ? 'Cerrar' : 'Cancelar'}</Button>
        {o.status !== 'Recibido' && <Button variant="dark" onClick={() => { if (updateOrder(o.id, lines)) ui.closeModal() }}>Guardar cambios</Button>}
      </ModalActions>
    </Modal>
  )
}
