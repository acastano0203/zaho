import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useClientActions } from '../hooks/useClients'
import { fd } from '../../../lib/dates'
import { cop, phone } from '../../../lib/format'
import type { ClientSummary } from '../hooks/useClients'

export function ClientsTable({ rows }: { rows: ClientSummary[] }) {
  const ui = useUI()
  const { remove } = useClientActions()
  const open = (x: ClientSummary) => ui.openDrawer({ type: 'client', id: x.c.id })
  const columns: Column<ClientSummary>[] = [
    { key: 'name', header: 'Cliente', width: 'minmax(160px,1.3fr)', primary: true,
      render: x => <button type="button" onClick={() => open(x)} className="max-w-full truncate text-left font-semibold text-ink underline decoration-sand-dark underline-offset-[3px]">{x.c.name}</button> },
    { key: 'wa', header: 'WhatsApp', width: '120px', render: x => <span className="text-taupe tabular">{x.c.phone ? phone(x.c.phone) : '—'}</span> },
    { key: 'doc', header: 'Documento', width: '110px', hideMobile: true, render: x => <span className="text-taupe">{x.c.doc || '—'}</span> },
    { key: 'city', header: 'Ciudad', width: '110px', render: x => x.c.city || '—' },
    { key: 'n', header: 'Compras', width: '80px', align: 'right', render: x => x.sales.length },
    { key: 'total', header: 'Total comprado', width: '124px', align: 'right', render: x => cop(x.total) },
    { key: 'saldo', header: 'Saldo', width: '110px', align: 'right', render: x => <span className="font-semibold text-ink">{cop(x.saldo)}</span> },
    { key: 'last', header: 'Última compra', width: '104px', render: x => <span className="text-taupe">{x.last ? fd(x.last.date) : '—'}</span> },
    { key: 'st', header: 'Estado', width: '116px', badge: true, render: x => <Pill color={x.st.color}>{x.st.label}</Pill> },
  ]
  return (
    <DataTable columns={columns} rows={rows} rowKey={x => x.c.id} minWidth={1260} actionsWidth="210px"
      actions={x => (
        <RowActions name={x.c.name}
          onEdit={() => ui.openModal({ type: 'clientForm', id: x.c.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar a ' + x.c.name,
            message: x.sales.length ? 'Sus ' + x.sales.length + ' compras quedan en el historial como venta sin cliente registrado.' : 'El cliente no tiene compras registradas.',
            onConfirm: () => remove(x.c.id) })}>
          <Button size="sm" onClick={() => open(x)}>Ver</Button>
          <Button size="sm" onClick={() => ui.openDrawer({ type: 'sale', clientId: x.c.id })}>Vender</Button>
        </RowActions>
      )} />
  )
}
