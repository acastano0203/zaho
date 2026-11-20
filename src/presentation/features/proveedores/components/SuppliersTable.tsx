import { DataTable, type Column } from '../../../components/ui/DataTable'
import { RowActions } from '../../../components/ui/RowActions'
import { useUI } from '../../../store/UIStore'
import { fd } from '../../../../shared/lib/dates'
import { phone } from '../../../../shared/lib/format'
import { DOC_LABEL, formatDoc } from '../../../../domain/rules/documentos'
import { useSupplierActions, type useSuppliersView } from '../hooks/useSuppliers'

type Row = ReturnType<typeof useSuppliersView>['suppliers'][number]

export function SuppliersTable({ rows }: { rows: Row[] }) {
  const ui = useUI()
  const { removeSupplier } = useSupplierActions()
  const columns: Column<Row>[] = [
    { key: 'name', header: 'Proveedor', width: 'minmax(170px,1.2fr)', primary: true, render: r => <span className="font-semibold text-ink">{r.sup.name}</span> },
    { key: 'doc', header: 'NIT / Cédula', width: '150px',
      render: r => (r.sup.doc ? <span className="tabular"><span className="text-taupe">{DOC_LABEL[r.sup.docType ?? 'nit']}</span> {formatDoc(r.sup.docType, r.sup.doc)}</span> : '—') },
    { key: 'brands', header: 'Marca que surte', width: '160px', render: r => r.sup.brands.join(', ') },
    { key: 'contact', header: 'Contacto', width: '150px', render: r => r.sup.contact },
    { key: 'wa', header: 'WhatsApp', width: '120px', render: r => <span className="text-taupe tabular">{phone(r.sup.wa)}</span> },
    { key: 'email', header: 'Correo', width: '190px', render: r => (r.sup.email ? <a className="truncate underline-offset-4 hover:underline" href={'mailto:' + r.sup.email}>{r.sup.email}</a> : '—') },
    { key: 'address', header: 'Dirección', width: '190px', render: r => <span className="truncate">{r.sup.address || '—'}</span> },
    { key: 'last', header: 'Último pedido', width: '120px', render: r => (r.last ? fd(r.last.date) + ' · ' + r.last.id : '—') },
  ]
  return (
    <DataTable exportar={{ title: 'Proveedores' }} columns={columns} rows={rows} rowKey={r => r.sup.id} minWidth={1380} actionsWidth="76px"
      actions={r => (
        <RowActions name={r.sup.name}
          onEdit={() => ui.openModal({ type: 'supplier', id: r.sup.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar ' + r.sup.name, message: 'Sus pedidos recibidos quedan en el historial. No se puede eliminar si tiene pedidos en curso.', onConfirm: () => removeSupplier(r.sup.id) })} />
      )} />
  )
}
