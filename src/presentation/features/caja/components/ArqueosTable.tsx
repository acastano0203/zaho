import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Empty, Pill } from '../../../components/ui/Display'
import { RowActions } from '../../../components/ui/RowActions'
import { C } from '../../../../shared/lib/constants'
import { fd } from '../../../../shared/lib/dates'
import { cop } from '../../../../shared/lib/format'
import type { CierreCaja } from '../../../../domain/entities'
import { useCaja, useCajaActions } from '../hooks/useCaja'

export function ArqueosTable() {
  const ui = useUI()
  const { can } = useSession()
  const { cierres, todas } = useCaja()
  const { eliminarArqueo } = useCajaActions()
  const rows = cierres.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  if (!rows.length) return <Empty>Aún no hay arqueos. Al final del día usa “Arqueo” en la tarjeta de cada cuenta para contar el dinero.</Empty>

  const columns: Column<CierreCaja>[] = [
    { key: 'date', header: 'Fecha', width: '80px', render: x => <span className="text-taupe tabular">{fd(x.date)}</span> },
    { key: 'cuenta', header: 'Cuenta', width: 'minmax(140px,1fr)', primary: true, render: x => <span className="font-semibold text-ink">{todas.find(c => c.id === x.cuentaId)?.nombre ?? '—'}</span> },
    { key: 'sis', header: 'Sistema', width: '120px', align: 'right', render: x => cop(x.saldoSistema) },
    { key: 'real', header: 'Contado', width: '120px', align: 'right', render: x => cop(x.saldoContado) },
    {
      key: 'dif', header: 'Resultado', width: '170px', badge: true,
      render: x => {
        const d = x.saldoContado - x.saldoSistema
        return <Pill color={d === 0 ? C.ok : d > 0 ? C.warn : C.bad}>{d === 0 ? 'Cuadró' : (d > 0 ? 'Sobrante ' : 'Faltante ') + cop(Math.abs(d))}</Pill>
      },
    },
    { key: 'nota', header: 'Observación', width: 'minmax(160px,1.5fr)', render: x => <span className="text-taupe">{x.nota || '—'}</span> },
  ]
  return (
    <DataTable exportar={{ title: 'Arqueos de caja' }} columns={columns} rows={rows} rowKey={x => x.id} minWidth={860} actionsWidth="48px"
      actions={x => can('caja.eliminar') ? (
        <RowActions name={'arqueo'} onDelete={() => ui.openModal({
          type: 'confirm', title: 'Eliminar arqueo', message: 'Se borra el arqueo y, si hubo diferencia, también su ajuste en el libro de caja.',
          onConfirm: () => eliminarArqueo(x.id),
        })} />
      ) : null} />
  )
}
