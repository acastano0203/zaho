import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { useUI } from '../../../store/UIStore'
import { useApp } from '../../../store/AppStore'
import { useSalidaActions } from '../hooks/useSalidas'
import { TIPOS } from '../../../lib/constants'
import { fd } from '../../../lib/dates'
import { cop } from '../../../lib/format'
import type { Salida, SalidaTipo } from '../../../types'

export function OutTable({ rows, colors }: { rows: Salida[]; colors: Record<SalidaTipo, string> }) {
  const ui = useUI()
  const { data, carRows } = useApp()
  const { remove } = useSalidaActions()
  const columns: Column<Salida>[] = [
    { key: 'date', header: 'Fecha', width: '72px', render: g => <span className="text-taupe">{fd(g.date)}</span> },
    { key: 'tipo', header: 'Tipo', width: '180px', badge: true,
      render: g => <Pill color={colors[g.tipo]}>{g.tipo === 'otro' && g.otro ? 'Otro · ' + g.otro : TIPOS[g.tipo]}</Pill> },
    { key: 'desc', header: 'Descripción', width: 'minmax(220px,2fr)', primary: true,
      render: g => {
        const loan = g.tipo === 'prestamo' ? carRows.find(r => r.c.salidaId === g.id) : undefined
        if (!loan) return <span title={g.desc}>{g.desc}</span>
        return (
          <span className="flex min-w-0 flex-col">
            <button type="button" onClick={() => ui.openDrawer({ type: 'cartera', cid: loan.c.id, sec: 'detalle' })}
              className="max-w-full truncate text-left underline decoration-sand-dark underline-offset-[3px]" title={g.desc}>{g.desc}</button>
            <span className={'text-xs font-normal ' + (loan.saldo <= 0 ? 'text-util' : loan.st === 'ven' ? 'text-bad' : 'text-taupe')}>
              {loan.saldo <= 0 ? 'Recuperado completo' : 'Devuelto ' + cop(loan.paid) + ' · falta ' + cop(loan.saldo) + (loan.st === 'ven' ? ' · vencido' : '')}
            </span>
          </span>
        )
      } },
    { key: 'val', header: 'Valor', width: '110px', align: 'right', render: g => <span className="font-semibold text-ink">{cop(g.val)}</span> },
    { key: 'met', header: 'Método', width: '120px', render: g => g.met },
    { key: 'file', header: 'Soporte', width: '110px', render: g => <span className="text-taupe">{g.file ? 'Adjunto' : '—'}</span> },
  ]
  // Un préstamo se edita desde su cuenta en Cartera para no descuadrar abonos
  const edit = (g: Salida) => {
    const loan = g.tipo === 'prestamo' ? data.cartera.find(c => c.salidaId === g.id) : undefined
    if (loan) ui.openModal({ type: 'carteraEdit', cid: loan.id })
    else ui.openModal({ type: 'salidaEdit', id: g.id })
  }
  return (
    <DataTable columns={columns} rows={rows} rowKey={g => g.id} minWidth={920} actionsWidth="76px"
      actions={g => (
        <RowActions name={'salida ' + g.id} onEdit={() => edit(g)}
          onDelete={() => ui.openModal({ type: 'confirm', title: 'Eliminar salida ' + g.id,
            message: g.tipo === 'prestamo' ? 'Es un préstamo: también se borra su cuenta por recuperar en Cartera.' : 'Se borra el gasto: ' + g.desc + '.',
            onConfirm: () => remove(g.id) })} />
      )} />
  )
}
