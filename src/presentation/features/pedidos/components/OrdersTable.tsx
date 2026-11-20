import { useApp } from '../../../store/AppStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { C } from '../../../../shared/lib/constants'
import { fd } from '../../../../shared/lib/dates'
import { lineProduct, orderWarehouse } from '../../../../domain/rules/pedidos'
import type { Order } from '../../../../domain/entities'
import { useOrderActions } from '../hooks/usePedidos'

const ST_COLOR = { Enviado: C.warn, Confirmado: C.stone, Recibido: C.ok }

export function OrdersTable({ rows }: { rows: Order[] }) {
  const { data } = useApp()
  const ui = useUI()
  const { can } = useSession()
  const { confirm, removeOrder } = useOrderActions()
  const lines = (o: Order) => o.lines.map(l => { const p = lineProduct(data, l.pid); return (p ? p.name + ' T' + p.size : '—') + ' ×' + l.qty }).join(', ')
  const units = (o: Order) => o.lines.reduce((a, l) => a + l.qty, 0)
  const columns: Column<Order>[] = [
    { key: 'id', header: 'Pedido', width: '72px', primary: true, render: o => <span className="font-semibold text-ink">{o.id}</span> },
    { key: 'date', header: 'Fecha', width: '76px', render: o => <span className="text-taupe">{fd(o.date)}</span> },
    { key: 'sup', header: 'Proveedor', width: '150px', render: o => data.suppliers.find(s => s.id === o.sup)?.name || '—' },
    { key: 'wh', header: 'Llega a', width: '130px', render: o => orderWarehouse(data, o) || '—' },
    { key: 'lines', header: 'Productos', width: 'minmax(220px,2fr)', render: o => <span className="text-taupe" title={lines(o)}>{lines(o)}</span> },
    { key: 'units', header: 'Und', width: '56px', align: 'right', render: o => <span className="font-semibold text-ink tabular">{units(o)}</span> },
    { key: 'st', header: 'Estado', width: '116px', badge: true, render: o => <Pill color={ST_COLOR[o.status]}>{o.status}</Pill> },
  ]
  return (
    <DataTable exportar={{ title: 'Pedidos a proveedores' }} columns={columns} rows={rows} rowKey={o => o.id} minWidth={1060} actionsWidth="250px"
      actions={o => (
        <RowActions name={'pedido ' + o.id}
          onEdit={o.status !== 'Recibido' && can('pedidos.editar') ? () => ui.openModal({ type: 'orderEdit', id: o.id }) : undefined}
          onDelete={!can('pedidos.eliminar') ? undefined : () => ui.openModal({ type: 'confirm', title: 'Eliminar pedido ' + o.id,
            message: o.status === 'Recibido' ? 'Se borra del historial. Las unidades que ya sumó al inventario se mantienen.' : 'El pedido se cancela y deja de contar como pedido en curso.',
            onConfirm: () => removeOrder(o.id) })}>
          {o.status === 'Enviado' && can('pedidos.editar') && (
            <Button size="sm" variant="ghost" onClick={() => confirm(o.id)} title="El proveedor confirmó el pedido">Confirmado</Button>
          )}
          {o.status !== 'Recibido' && can('pedidos.editar') && (
            <Button size="sm" variant="dark" onClick={() => ui.openModal({ type: 'receive', id: o.id })}>Recibir</Button>
          )}
        </RowActions>
      )} />
  )
}
