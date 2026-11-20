import { useUI } from '../../../store/UIStore'
import { useApp } from '../../../store/AppStore'
import { useSession } from '../../../store/SessionStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill } from '../../../components/ui/Display'
import { IconAdjust, IconTransfer, IconTruck } from '../../../components/ui/Icons'
import { RowActions } from '../../../components/ui/RowActions'
import { useInventoryActions } from '../hooks/useInventory'
import { inventoryExport } from '../services/inventoryExport'
import { PROD_ST, SWATCH } from '../../../../shared/lib/constants'
import { cop } from '../../../../shared/lib/format'
import { productStatus, supplierOf } from '../../../../domain/rules/finance'
import { skuInOpenOrder } from '../../../../domain/rules/pedidos'
import type { Product } from '../../../../domain/entities'

function Swatch({ p }: { p: Product }) {
  const [bg, ink] = SWATCH[p.color] || ['#E8E2D9', '#2B2826']
  return <span aria-hidden="true" className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-linen text-[10px] font-bold tracking-wide" style={{ background: bg, color: ink }}>{p.cat.slice(0, 2).toUpperCase()}</span>
}

export function InventoryTable({ rows }: { rows: Product[] }) {
  const ui = useUI()
  const { remove } = useInventoryActions()
  const { data } = useApp()
  const { can } = useSession()
  /** Proveedor al que se le puede pedir el producto ahora (bajo el mínimo, sin pedido en camino) */
  const pedirA = (p: Product) => (p.stock < p.min && can('pedidos.crear') && !skuInOpenOrder(data, p) ? supplierOf(data, p) : undefined)
  const columns: Column<Product>[] = [
    { key: 'photo', header: 'Foto', width: '40px', hideMobile: true, noExport: true, render: p => <Swatch p={p} /> },
    { key: 'code', header: 'Código', width: '92px', render: p => <span className="text-taupe tabular">{p.code}</span> },
    { key: 'brand', header: 'Marca', width: '104px', render: p => p.brand },
    { key: 'name', header: 'Nombre', width: 'minmax(150px,1.4fr)', primary: true,
      render: p => <span className="flex min-w-0 items-center gap-2.5"><span className="md:hidden"><Swatch p={p} /></span><span className="truncate font-semibold text-ink">{p.name}</span></span> },
    { key: 'cat', header: 'Categoría', width: '92px', render: p => p.cat },
    { key: 'size', header: 'Talla', width: '50px', render: p => p.size },
    { key: 'color', header: 'Color', width: '84px', render: p => p.color },
    { key: 'wh', header: 'Bodega', width: '128px', render: p => <span className="text-taupe">{p.wh}</span> },
    { key: 'stock', header: 'Stock', width: '56px', align: 'right', render: p => <span className="font-semibold text-ink">{p.stock} <span className="font-normal text-taupe md:hidden">/ mín {p.min}</span></span> },
    { key: 'min', header: 'Mín', width: '48px', align: 'right', hideMobile: true, render: p => <span className="text-taupe">{p.min}</span> },
    { key: 'cost', header: 'Costo', width: '90px', align: 'right', render: p => cop(p.cost) },
    { key: 'price', header: 'Precio', width: '96px', align: 'right', render: p => cop(p.price) },
    { key: 'util', header: 'Utilidad', width: '96px', align: 'right', render: p => <span className="font-semibold text-util">{cop(p.price - p.cost)}</span> },
    { key: 'margin', header: 'Util. %', width: '64px', align: 'right', render: p => <span className="text-util">{p.price ? Math.round(((p.price - p.cost) / p.price) * 100) + '%' : '—'}</span> },
    { key: 'st', header: 'Estado', width: '116px', badge: true, render: p => { const s = PROD_ST[productStatus(p)]; return <Pill color={s.color}>{s.label}</Pill> } },
  ]
  return (
    <DataTable exportar={{ title: 'Inventario', data: () => inventoryExport(rows) }} columns={columns} rows={rows} rowKey={p => p.id}
      onRowOpen={p => ui.openDrawer({ type: 'product', id: p.id })} minWidth={1780} actionsWidth="186px"
      actions={p => (
        <RowActions name={p.name}
          onEdit={() => ui.openModal({ type: 'product', id: p.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar ' + p.code, message: 'Se elimina ' + p.name + ' talla ' + p.size + ' (' + p.stock + ' und en ' + p.wh + '). Solo es posible si no tiene ventas registradas.', onConfirm: () => remove(p.id) })}>
          <Button size="sm" className="md:hidden" onClick={() => ui.openDrawer({ type: 'product', id: p.id })}>Ver detalle</Button>
          {(() => {
            const sup = pedirA(p)
            if (sup) return (
              <Button size="sm" variant="ghost" className="text-warn md:w-8 md:px-0" onClick={() => ui.openModal({ type: 'order', sup: sup.id, firstPid: p.id })}
                aria-label={'Pedir ' + p.name + ' a ' + sup.name} title={'Pedir a ' + sup.name}>
                <IconTruck size={16} /><span className="md:hidden">Pedir</span>
              </Button>
            )
            if (p.stock < p.min && skuInOpenOrder(data, p)) return <span className="hidden size-8 items-center justify-center text-stone md:inline-flex" title="Ya tiene pedido en camino"><IconTruck size={16} /></span>
            return <span className="hidden size-8 md:inline-block" aria-hidden />
          })()}
          <Button size="sm" variant="ghost" className="md:w-8 md:px-0" onClick={() => ui.openModal({ type: 'adjust', pid: p.id })} aria-label={'Ajustar stock de ' + p.name} title="Ajustar stock">
            <IconAdjust size={16} /><span className="md:hidden">Ajustar</span>
          </Button>
          <Button size="sm" variant="ghost" className="md:w-8 md:px-0" onClick={() => ui.openModal({ type: 'transfer', pid: p.id })} aria-label={'Trasladar ' + p.name} title="Trasladar">
            <IconTransfer size={16} /><span className="md:hidden">Trasladar</span>
          </Button>
        </RowActions>
      )} />
  )
}
