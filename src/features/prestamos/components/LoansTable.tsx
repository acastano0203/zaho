import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Pill, Progress } from '../../../components/ui/Display'
import { WaIcon } from '../../../components/ui/Icons'
import { RowActions } from '../../../components/ui/RowActions'
import { fd } from '../../../lib/dates'
import { cop, phone } from '../../../lib/format'
import { daysLabel, stInfo } from '../../../lib/finance'
import { useCarteraActions } from '../../cartera/hooks/useCartera'
import type { LoanRow } from '../services/loansService'

/** Detalle de cada préstamo: a quién, cuánto, cuánto ha devuelto y cuánto falta */
export function LoansTable({ loans }: { loans: LoanRow[] }) {
  const ui = useUI()
  const { remove } = useCarteraActions()
  const open = (l: LoanRow, sec: 'detalle' | 'abono' = 'detalle') => ui.openDrawer({ type: 'cartera', cid: l.r.c.id, sec })

  const columns: Column<LoanRow>[] = [
    { key: 'who', header: 'A quién', width: 'minmax(160px,1.2fr)', primary: true,
      render: l => (
        <span className="flex min-w-0 flex-col">
          <button type="button" onClick={() => open(l)} className="max-w-full truncate text-left font-semibold text-ink underline decoration-sand-dark underline-offset-[3px]">{l.r.c.client}</button>
          <span className="truncate text-xs font-normal text-taupe">{phone(l.r.c.phone)}{l.r.c.nota ? ' · ' + l.r.c.nota : ''}</span>
        </span>
      ) },
    { key: 'given', header: 'Entregado', width: '110px', render: l => <span className="text-taupe">{fd(l.given)} · {l.r.c.met || '—'}</span> },
    { key: 'amount', header: 'Prestado', width: '110px', align: 'right', render: l => <span className="font-semibold text-ink">{cop(l.amount)}</span> },
    { key: 'rec', header: 'Devuelto', width: '110px', align: 'right', render: l => <span className="text-util">{cop(l.recovered)}</span> },
    { key: 'saldo', header: 'Falta', width: '110px', align: 'right', render: l => <span className="font-semibold text-ink">{cop(l.saldo)}</span> },
    { key: 'pct', header: 'Avance', width: '130px',
      render: l => <span className="flex items-center gap-2"><Progress value={l.r.pct} /><span className="min-w-[34px] text-right text-xs tabular">{l.r.pct}%</span></span> },
    { key: 'next', header: 'Próxima devolución', width: '170px',
      render: l => l.r.next ? (l.r.hasPlan ? 'C' + l.r.next.n + '/' + l.r.cu.length + ' · ' : '') + cop(l.r.next.amount - l.r.next.paid) + ' · ' + fd(l.r.next.due) + ' (' + daysLabel(l.r).toLowerCase() + ')' : '—' },
    { key: 'st', header: 'Estado', width: '120px', badge: true, render: l => { const i = stInfo(l.r.st, 'prestamo'); return <Pill color={i.color}>{i.label}</Pill> } },
  ]

  return (
    <DataTable columns={columns} rows={loans} rowKey={l => l.r.c.id} minWidth={1380} actionsWidth="250px"
      actions={l => (
        <RowActions name={'préstamo a ' + l.r.c.client}
          onEdit={() => ui.openModal({ type: 'carteraEdit', cid: l.r.c.id })}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar préstamo a ' + l.r.c.client,
            message: 'Se borra el préstamo de ' + cop(l.amount) + ', su salida de dinero' + (l.r.c.abonos.length ? ' y las ' + l.r.c.abonos.length + ' devoluciones registradas' : '') + '.',
            onConfirm: () => remove(l.r.c.id) })}>
          {l.saldo > 0 && <Button size="sm" onClick={() => open(l, 'abono')}>Registrar devolución</Button>}
          {l.saldo > 0 && <Button size="sm" onClick={() => ui.openModal({ type: 'wa', cid: l.r.c.id })}><WaIcon />Recordar</Button>}
        </RowActions>
      )} />
  )
}
