import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { RowActions } from '../../../components/ui/RowActions'
import { useComercialActions } from '../hooks/useComerciales'
import { cop, phone } from '../../../lib/format'
import type { useComercialesList } from '../hooks/useComerciales'

type Row = ReturnType<typeof useComercialesList>[number]

export function ComercialesTable({ rows }: { rows: Row[] }) {
  const ui = useUI()
  const { remove } = useComercialActions()
  const columns: Column<Row>[] = [
    { key: 'name', header: 'Nombre', width: 'minmax(160px,1.3fr)', primary: true, render: r => <span className="font-semibold text-ink">{r.c.name}</span> },
    { key: 'phone', header: 'Teléfono', width: '120px', render: r => <span className="text-taupe tabular">{phone(r.c.phone)}</span> },
    { key: 'pct', header: 'Comisión', width: '100px', align: 'right', render: r => String(r.c.pct).replace('.', ',') + '%' },
    { key: 'sales', header: 'Ventas del mes', width: '130px', align: 'right', render: r => cop(r.sales) },
    { key: 'comm', header: 'Comisión ganada', width: '130px', align: 'right', render: r => <span className="font-semibold text-ink">{cop(r.comm)}</span> },
    { key: 'cart', header: 'Cartera a cargo', width: '140px', align: 'right', render: r => cop(r.cart) },
  ]
  return (
    <DataTable columns={columns} rows={rows} rowKey={r => r.c.id} minWidth={900} actionsWidth="80px"
      actions={r => (
        <RowActions name={r.c.name}
          onEdit={() => ui.openModal({ type: 'comercial', id: r.c.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar a ' + r.c.name, message: 'Sus ventas y cuentas en cartera quedan sin comercial asignado.', onConfirm: () => remove(r.c.id) })} />
      )} />
  )
}
