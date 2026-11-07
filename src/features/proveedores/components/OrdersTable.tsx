import { useApp } from '../../../store/AppStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useUI } from '../../../store/UIStore'
import { C } from '../../../lib/constants'
import { fd } from '../../../lib/dates'
import type { Order } from '../../../types'
import { useSupplierActions } from '../hooks/useSuppliers'

const ST_COLOR = { Enviado: C.warn, Confirmado: C.stone, Recibido: C.ok }

export function OrdersTable({ rows }: { rows: Order[] }) {
  const { data } = useApp()
  const ui = useUI()
  const { advance, removeOrder } = useSupplierActions()
  const lines = (o: Order) => o.lines.map(l => { const p = data.products.find(x => x.id === l.pid); return (p ? p.name + ' T' + p.size : '—') + ' ×' + l.qty }).join(', ')
  const columns: Column<Order>[] = [
    { key: 'id', header: 'Pedido', width: '72px', primary: true, render: o => <span className="font-semibold text-ink">{o.id}</span> },
    { key: 'date', header: 'Fecha', width: '76px', render: o => <span className="text-taupe">{fd(o.date)}</span> },
    { key: 'sup', header: 'Proveedor', width: '160px', render: o => data.suppliers.find(s => s.id === o.sup)?.name || '—' },
    { key: 'lines', header: 'Productos', width: 'minmax(240px,2fr)', render: o => <span className="text-taupe" title={lines(o)}>{lines(o)}</span> },
    { key: 'st', header: 'Estado', width: '130px', badge: true, render: o => <Pill color={ST_COLOR[o.status]}>{o.status + (o.auto ? ' · auto' : '')}</Pill> },
  ]
  return (
    <DataTable columns={columns} rows={rows} rowKey={o => o.id} minWidth={960} actionsWidth="230px"
      actions={o => (
        <RowActions name={'pedido ' + o.id}
          onEdit={o.status !== 'Recibido' ? () => ui.openModal({ type: 'orderEdit', id: o.id }) : undefined}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar pedido ' + o.id,
            message: o.status === 'Recibido' ? 'Se borra del historial. Las unidades que ya sumó al inventario se mantienen.' : 'El pedido se cancela y deja de contar como pedido en curso.',
            onConfirm: () => removeOrder(o.id) })}>
          {o.status !== 'Recibido' && <Button size="sm" onClick={() => advance(o.id)}>{o.status === 'Enviado' ? 'Marcar confirmado' : 'Marcar recibido'}</Button>}
        </RowActions>
      )} />
  )
}
