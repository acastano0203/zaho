import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill, Progress } from '../../../components/ui/Display'
import { WaIcon } from '../../../components/ui/Icons'
import { RowActions } from '../../../components/ui/RowActions'
import { useCarteraActions } from '../hooks/useCartera'
import { fd } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import { carRef, daysLabel, lastFollowUp, stInfo } from '../../../lib/finance'
import type { CarRow } from '../../../types'

export const waLabel = (r: CarRow) => (r.c.kind === 'prestamo' ? 'Recordar' : r.st === 'pag' ? 'Agradecer' : 'Cobrar')

export function CarteraTable({ rows }: { rows: CarRow[] }) {
  const ui = useUI()
  const { remove } = useCarteraActions()
  const open = (r: CarRow, sec: 'detalle' | 'seg' | 'abono') => ui.openDrawer({ type: 'cartera', cid: r.c.id, sec })
  const columns: Column<CarRow>[] = [
    { key: 'client', header: 'Cliente', width: 'minmax(150px,1.2fr)', primary: true,
      render: r => <button type="button" onClick={() => open(r, 'detalle')} className="max-w-full truncate text-left font-semibold text-ink underline decoration-sand-dark underline-offset-[3px]">{r.c.client}</button> },
    { key: 'ref', header: 'Venta', width: '82px', render: r => <span className="text-taupe">{carRef(r.c)}</span> },
    { key: 'saldo', header: 'Saldo', width: '100px', align: 'right', render: r => <span className="font-semibold text-ink">{cop(r.saldo)}</span> },
    { key: 'paid', header: 'Pagado', width: '130px',
      render: r => <span className="flex items-center gap-2"><Progress value={r.pct} /><span className="min-w-[34px] text-right text-xs tabular">{r.pct}%</span></span> },
    { key: 'next', header: 'Próxima cuota', width: '160px',
      render: r => r.next ? (r.hasPlan ? 'C' + r.next.n + '/' + r.cu.length + ' · ' : '') + cop(r.next.amount - r.next.paid) + ' · ' + fd(r.next.due) : '—' },
    { key: 'days', header: 'Días', width: '116px', render: r => daysLabel(r) },
    { key: 'st', header: 'Estado', width: '118px', badge: true, render: r => { const i = stInfo(r.st, r.c.kind); return <Pill color={i.color}>{i.label}</Pill> } },
    { key: 'last', header: 'Último seguimiento', width: 'minmax(160px,1fr)', render: r => <span className="text-taupe" title={lastFollowUp(r)}>{lastFollowUp(r)}</span> },
  ]
  return (
    <DataTable columns={columns} rows={rows} rowKey={r => r.c.id} minWidth={1490} actionsWidth="370px"
      actions={r => (
        <RowActions name={'cuenta de ' + r.c.client}
          onEdit={() => ui.openModal({ type: 'carteraEdit', cid: r.c.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar cuenta de ' + r.c.client,
            message: 'Se borra la cuenta con sus ' + r.c.abonos.length + ' abonos y su seguimiento.' + (r.c.kind === 'prestamo' ? ' También se elimina la salida de dinero del préstamo.' : r.c.kind === 'venta' ? ' La venta ' + r.c.saleId + ' se conserva.' : ''),
            onConfirm: () => remove(r.c.id) })}>
          <Button size="sm" onClick={() => open(r, 'seg')}>Seguimiento</Button>
          {r.saldo > 0 && <Button size="sm" onClick={() => open(r, 'abono')}>Abonar</Button>}
          <Button size="sm" onClick={() => ui.openModal({ type: 'wa', cid: r.c.id })}><WaIcon />{waLabel(r)}</Button>
        </RowActions>
      )} />
  )
}
