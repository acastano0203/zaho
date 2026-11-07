import { useUI } from '../../store/UIStore'
import { SaleDrawer } from '../../features/ventas/components/SaleDrawer'
import { SaleDetailDrawer } from '../../features/ventas/components/SaleDetailDrawer'
import { ClientDrawer } from '../../features/clientes/components/ClientDrawer'
import { ClientFormModal } from '../../features/clientes/components/ClientFormModal'
import { CarteraDrawer } from '../../features/cartera/components/CarteraDrawer'
import { WhatsAppModal } from '../../features/cartera/components/WhatsAppModal'
import { SalidaDrawer } from '../../features/salidas/components/SalidaDrawer'
import { OrderModal } from '../../features/proveedores/components/OrderModal'
import { ProductModal } from '../../features/inventario/components/ProductModal'
import { AdjustModal } from '../../features/inventario/components/AdjustModal'
import { TransferModal } from '../../features/inventario/components/TransferModal'
import { ComercialModal } from '../../features/comerciales/components/ComercialModal'
import { SupplierModal } from '../../features/proveedores/components/SupplierModal'
import { OrderEditModal } from '../../features/proveedores/components/OrderEditModal'
import { SalidaEditModal } from '../../features/salidas/components/SalidaEditModal'
import { CarteraEditModal } from '../../features/cartera/components/CarteraEditModal'
import { ConfirmModal } from '../ui/ConfirmModal'

/** Renderiza el panel lateral y el modal activos. La `key` reinicia su estado al cambiar de registro. */
export function OverlayHost() {
  const { drawer: d, modal: m } = useUI()
  const dk = d ? JSON.stringify(d) : ''
  const mk = m ? m.type + ('id' in m ? m.id : '') + ('pid' in m ? m.pid : '') + ('cid' in m ? m.cid : '') + ('sup' in m ? m.sup : '') : ''

  return (
    <>
      {d?.type === 'sale' && <SaleDrawer key={dk} editId={d.editId} clientId={d.clientId} />}
      {d?.type === 'saleDetail' && <SaleDetailDrawer key={dk} id={d.id} />}
      {d?.type === 'client' && <ClientDrawer key={dk} id={d.id} />}
      {d?.type === 'cartera' && <CarteraDrawer key={dk} cid={d.cid} sec={d.sec} />}
      {d?.type === 'salida' && <SalidaDrawer key={dk} kind={d.kind} origin={d.origin} />}

      {m?.type === 'wa' && <WhatsAppModal key={mk} cid={m.cid} tpl={m.tpl} />}
      {m?.type === 'order' && <OrderModal key={mk} sup={m.sup} firstPid={m.firstPid} />}
      {m?.type === 'product' && <ProductModal key={mk} id={m.id} onCreated={m.onCreated} />}
      {m?.type === 'adjust' && <AdjustModal key={mk} pid={m.pid} />}
      {m?.type === 'transfer' && <TransferModal key={mk} pid={m.pid} />}
      {m?.type === 'clientForm' && <ClientFormModal key={mk} id={m.id} />}
      {m?.type === 'comercial' && <ComercialModal key={mk} id={m.id} />}
      {m?.type === 'supplier' && <SupplierModal key={mk} id={m.id} />}
      {m?.type === 'orderEdit' && <OrderEditModal key={mk} id={m.id} />}
      {m?.type === 'salidaEdit' && <SalidaEditModal key={mk} id={m.id} />}
      {m?.type === 'carteraEdit' && <CarteraEditModal key={mk} cid={m.cid} />}
      {m?.type === 'confirm' && <ConfirmModal key={m.title} title={m.title} message={m.message} cta={m.cta} onConfirm={m.onConfirm} />}
    </>
  )
}
