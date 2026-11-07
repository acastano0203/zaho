import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useSaleActions } from '../hooks/useSales'
import { fd } from '../../../lib/dates'
import { cop, plural } from '../../../lib/format'
import { comName, itemsLabel, payColor, payLabel } from '../../../lib/selectors'
import type { useSalesList } from '../hooks/useSales'

type Row = ReturnType<typeof useSalesList>['rows'][number]

export function SalesTable({ rows }: { rows: Row[] }) {
  const { data } = useApp()
  const ui = useUI()
  const { remove } = useSaleActions()
  const view = (r: Row) => ui.openDrawer({ type: 'saleDetail', id: r.sale.id })

  const columns: Column<Row>[] = [
    { key: 'date', header: 'Fecha', width: '72px', render: r => <span className="text-taupe">{fd(r.sale.date)}</span> },
    { key: 'client', header: 'Cliente', width: 'minmax(150px,1.2fr)', primary: true,
      render: r => <button type="button" onClick={() => view(r)} className="max-w-full truncate text-left font-semibold text-ink underline decoration-sand-dark underline-offset-[3px] hover:decoration-char">{r.sale.client}</button> },
    { key: 'com', header: 'Comercial', width: '130px', render: r => comName(data, r.sale.com) },
    { key: 'prods', header: 'Productos', width: 'minmax(200px,2fr)', render: r => <span className="text-taupe" title={itemsLabel(data, r.sale)}>{itemsLabel(data, r.sale)}</span> },
    { key: 'total', header: 'Total', width: '110px', align: 'right', render: r => <span className="font-semibold text-ink">{cop(r.total)}</span> },
    { key: 'cost', header: 'Costo', width: '100px', align: 'right', hideMobile: true, render: r => <span className="text-taupe">{cop(r.cost)}</span> },
    { key: 'util', header: 'Utilidad', width: '110px', align: 'right', render: r => <span className="font-semibold text-util">{cop(r.util)} <span className="font-normal md:hidden">· {r.utilPct}%</span></span> },
    { key: 'pct', header: '%', width: '56px', align: 'right', hideMobile: true, render: r => <span className="text-util">{r.utilPct}%</span> },
    { key: 'pay', header: 'Pago', width: '120px', render: r => <Pill color={payColor(r.sale)}>{payLabel(r.sale)}</Pill> },
    { key: 'st', header: 'Estado', width: '170px', badge: true, render: r => <Pill color={r.status.color}>{r.status.label}</Pill> },
  ]

  return (
    <DataTable columns={columns} rows={rows} rowKey={r => r.sale.id} minWidth={1440} actionsWidth="140px"
      actions={r => (
        <RowActions name={'venta ' + r.sale.id}
          onEdit={() => ui.openDrawer({ type: 'sale', editId: r.sale.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar venta ' + r.sale.id,
            message: 'Se devuelven ' + plural(r.sale.items.reduce((a, i) => a + i.qty, 0), 'prenda', 'prendas') + ' al inventario' + (r.car ? ' y se borra su cuenta en Cartera con todos sus abonos' : '') + '. Esta acción no se puede deshacer.',
            onConfirm: () => remove(r.sale.id) })}>
          <Button size="sm" onClick={() => view(r)} aria-label={'Ver detalle de la venta ' + r.sale.id}>Ver</Button>
        </RowActions>
      )} />
  )
}
