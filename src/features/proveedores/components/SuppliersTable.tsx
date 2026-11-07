import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Switch } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useUI } from '../../../store/UIStore'
import { fd } from '../../../lib/dates'
import { phone } from '../../../lib/format'
import { useSupplierActions, type useSuppliersView } from '../hooks/useSuppliers'

type Row = ReturnType<typeof useSuppliersView>['suppliers'][number]

export function SuppliersTable({ rows }: { rows: Row[] }) {
  const ui = useUI()
  const { toggle, removeSupplier } = useSupplierActions()
  const columns: Column<Row>[] = [
    { key: 'name', header: 'Proveedor', width: 'minmax(170px,1.2fr)', primary: true, render: r => <span className="font-semibold text-ink">{r.sup.name}</span> },
    { key: 'brands', header: 'Marca que surte', width: '160px', render: r => r.sup.brands.join(', ') },
    { key: 'contact', header: 'Contacto', width: '150px', render: r => r.sup.contact },
    { key: 'wa', header: 'WhatsApp', width: '120px', render: r => <span className="text-taupe tabular">{phone(r.sup.wa)}</span> },
    { key: 'last', header: 'Último pedido', width: '120px', render: r => (r.last ? fd(r.last.date) + ' · ' + r.last.id : '—') },
    { key: 'mode', header: 'Modo de pedido', width: '210px',
      render: r => (
        <span className="flex items-center gap-2.5">
          <Switch on={r.sup.auto} onClick={() => toggle(r.sup.id)} label={'Pedido automático para ' + r.sup.name} />
          <span>{r.sup.auto ? 'Pedido automático' : 'Pedido manual'}</span>
        </span>
      ) },
  ]
  return (
    <DataTable columns={columns} rows={rows} rowKey={r => r.sup.id} minWidth={1060} actionsWidth="76px"
      actions={r => (
        <RowActions name={r.sup.name}
          onEdit={() => ui.openModal({ type: 'supplier', id: r.sup.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar ' + r.sup.name, message: 'Sus pedidos recibidos quedan en el historial. No se puede eliminar si tiene pedidos en curso.', onConfirm: () => removeSupplier(r.sup.id) })} />
      )} />
  )
}
