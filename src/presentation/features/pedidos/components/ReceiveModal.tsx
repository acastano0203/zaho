import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { lineProduct, inWarehouse, orderWarehouse } from '../../../../domain/rules/pedidos'
import { plural } from '../../../../shared/lib/format'
import type { OrderLine } from '../../../../domain/entities'
import { useOrderActions } from '../hooks/usePedidos'
import { QtyField } from './OrderProductList'

/**
 * Recepción del pedido: se confirma cuánto llegó de cada producto y se suma
 * al stock que ya existe de esa referencia en la bodega de llegada.
 */
export function ReceiveModal({ id }: { id: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { receive } = useOrderActions()
  const o = data.orders.find(x => x.id === id)
  const [got, setGot] = useState<OrderLine[]>(() => o?.lines.map(l => ({ ...l })) ?? [])
  if (!o) return null
  const sup = data.suppliers.find(s => s.id === o.sup)
  const wh = orderWarehouse(data, o)
  const ordered = (pid: string) => o.lines.find(l => l.pid === pid)?.qty ?? 0
  const units = got.reduce((a, l) => a + l.qty, 0)
  const faltan = o.lines.reduce((a, l) => a + l.qty, 0) - units
  const setQty = (pid: string, qty: number) => setGot(got.map(l => (l.pid === pid ? { ...l, qty } : l)))

  if (o.status === 'Recibido') return (
    <Modal kicker={'Pedido ' + o.id} title="Ya recibido" onClose={ui.closeModal}>
      <p className="text-sm text-taupe">Este pedido ya fue recibido y sumó al inventario.</p>
      <ModalActions><Button onClick={ui.closeModal}>Cerrar</Button></ModalActions>
    </Modal>
  )

  return (
    <Modal kicker={'Recibir pedido ' + o.id + (sup ? ' · ' + sup.name : '')} title={'Llega a ' + wh} onClose={ui.closeModal}>
      <p className="text-[13px] text-taupe">Revisa la mercancía y ajusta lo que realmente llegó. Se suma al stock actual de cada producto en {wh}.</p>

      <ul className="rounded-md border border-linen bg-white">
        {got.map(l => {
          const p = lineProduct(data, l.pid)
          const here = p ? inWarehouse(data, p, wh) : undefined
          const before = here?.stock ?? 0
          const ped = ordered(l.pid)
          return (
            <li key={l.pid} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-ink">{p ? p.name : 'Producto eliminado'} {p && <span className="font-normal text-taupe">· T{p.size} · {p.color}</span>}</div>
                <div className="text-xs text-taupe tabular">
                  Pedido {ped} · Stock {before} {l.qty > 0 && <>+ <b className="text-util">{l.qty}</b> = <b className="text-ink">{before + l.qty}</b></>}
                  {l.qty !== ped && <span className={l.qty < ped ? ' text-warn' : ' text-ok'}> · {l.qty < ped ? 'faltan ' + (ped - l.qty) : 'llegaron ' + (l.qty - ped) + ' de más'}</span>}
                </div>
              </div>
              <QtyField value={l.qty} onChange={n => setQty(l.pid, n)} label={(p?.name ?? 'producto') + ' recibido'} />
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-1 rounded-md border border-linen bg-mist p-3 text-[13px]">
        <span className="font-semibold text-ink">Entran {units} und a {wh}</span>
        {faltan > 0 && <span className="text-warn">Llegan {plural(faltan, 'unidad menos', 'unidades menos')} de lo pedido. El pedido se cierra con lo recibido; lo que falte, pídelo de nuevo.</span>}
      </div>

      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" disabled={units <= 0} onClick={() => { if (receive(o.id, got)) ui.closeModal() }}>Confirmar recepción</Button>
      </ModalActions>
    </Modal>
  )
}
