import { useUI } from '../store/UIStore'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { PageHeader } from '../components/ui/PageHeader'
import { Empty, SubTitle } from '../components/ui/Display'
import { SuggestedOrders } from '../features/proveedores/components/SuggestedOrders'
import { SuppliersTable } from '../features/proveedores/components/SuppliersTable'
import { OrdersTable } from '../features/proveedores/components/OrdersTable'
import { useSuppliersView } from '../features/proveedores/hooks/useSuppliers'

export default function ProveedoresPage() {
  const v = useSuppliersView()
  const ui = useUI()
  return (
    <>
      <PageHeader title="Proveedores y pedidos" sub={v.summary}
        actions={<Button variant="dark" onClick={() => ui.openModal({ type: 'supplier' })}><IconPlus size={16} />Nuevo proveedor</Button>} />
      <SubTitle className="mt-0">Sugerido para pedir</SubTitle>
      <SuggestedOrders groups={v.groups} />
      <SubTitle>Proveedores</SubTitle>
      <SuppliersTable rows={v.suppliers} />
      <p className="mt-2 text-xs text-taupe">En automático, el pedido sale solo cuando una referencia de ese proveedor baja del stock mínimo y no tiene pedido en curso.</p>
      <SubTitle>Historial de pedidos</SubTitle>
      {v.orders.length ? <OrdersTable rows={v.orders} /> : <Empty>Aún no hay pedidos. Los que envíes por WhatsApp quedan aquí.</Empty>}
    </>
  )
}
