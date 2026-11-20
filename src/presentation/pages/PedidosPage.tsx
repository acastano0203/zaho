import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { useSession } from '../store/SessionStore'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { PageHeader } from '../components/ui/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { Box, Empty } from '../components/ui/Display'
import { SuggestedOrders } from '../features/pedidos/components/SuggestedOrders'
import { OrdersTable } from '../features/pedidos/components/OrdersTable'
import { usePedidosView } from '../features/pedidos/hooks/usePedidos'
import { plural } from '../../shared/lib/format'

type Tab = 'pedir' | 'camino' | 'historial'

export default function PedidosPage() {
  const v = usePedidosView()
  const ui = useUI()
  const { can } = useSession()
  const [tab, setTab] = useState<Tab>(() => (v.refs === 0 && v.enCamino.length > 0 ? 'camino' : 'pedir'))

  const sub = plural(v.refs, 'referencia por pedir', 'referencias por pedir') + ' · ' +
    plural(v.enCamino.length, 'pedido en camino', 'pedidos en camino') + (v.unidadesEnCamino ? ' (' + v.unidadesEnCamino + ' und)' : '')

  return (
    <>
      <PageHeader title="Pedidos" sub={sub}
        actions={
          <>
            <Segmented full label="Vista de pedidos" value={tab} onChange={setTab} options={[
              { value: 'pedir', label: 'Por pedir' + (v.refs ? ' · ' + v.refs : '') },
              { value: 'camino', label: 'En camino' + (v.enCamino.length ? ' · ' + v.enCamino.length : '') },
              { value: 'historial', label: 'Historial' },
            ]} />
            {can('pedidos.crear') && <Button variant="dark" onClick={() => ui.openModal({ type: 'order' })}><IconPlus size={16} />Nuevo pedido</Button>}
          </>
        } />

      {tab === 'pedir' && (
        <>
          <p className="mb-3 text-[13px] text-taupe">Productos por debajo de su stock mínimo, agrupados por el proveedor que surte su marca. La cantidad sugerida deja el stock en el doble del mínimo.</p>
          <SuggestedOrders groups={v.groups} />
          {v.sinProveedor.length > 0 && (
            <Box warn className="mt-4">
              <span className="text-[13px] font-semibold text-ink">{plural(v.sinProveedor.length, 'referencia sin proveedor', 'referencias sin proveedor')}</span>
              <span className="text-[13px] text-char">
                {[...new Set(v.sinProveedor.map(p => p.brand))].join(', ')}: asigna estas marcas a un proveedor en <b>Proveedores</b> para poder pedirlas.
              </span>
            </Box>
          )}
        </>
      )}

      {tab === 'camino' && (v.enCamino.length
        ? <><p className="mb-3 text-[13px] text-taupe">Cuando llegue la mercancía toca Recibir: confirmas cuánto llegó de cada producto y se suma al stock que ya tiene en la bodega de llegada. Marcar Confirmado es opcional.</p><OrdersTable rows={v.enCamino} /></>
        : <Empty>No hay pedidos en camino.</Empty>)}

      {tab === 'historial' && (v.historial.length
        ? <OrdersTable rows={v.historial} />
        : <Empty>Aún no hay pedidos recibidos.</Empty>)}
    </>
  )
}
