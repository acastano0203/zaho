import { useMemo, useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Chips } from '../../../components/ui/Chip'
import { Segmented } from '../../../components/ui/Segmented'
import { Empty, Pill } from '../../../components/ui/Display'
import { Input } from '../../../components/ui/Field'
import { RowActions } from '../../../components/ui/RowActions'
import { C } from '../../../../shared/lib/constants'
import { fd, plus, today } from '../../../../shared/lib/dates'
import { cop } from '../../../../shared/lib/format'
import { ORIGEN_LABEL, libroPeriodo, type LineaCaja, type OrigenLinea } from '../../../../domain/rules/caja'
import { useCaja, useCajaActions } from '../hooks/useCaja'

type Periodo = 'hoy' | 'semana' | 'mes' | 'rango'
type Fila = LineaCaja & { saldo: number }

const COLOR: Record<OrigenLinea, string> = {
  inicial: C.ink, venta: C.ok, abono: C.ok, recuperado: C.ok, manual: C.ok,
  gasto: C.bad, prestamo: C.warn, traslado: C.stone, ajuste: C.warn,
}

/** Movimientos que se crean y borran desde Caja (el resto se gestiona en su módulo) */
const PROPIOS: OrigenLinea[] = ['manual', 'traslado', 'ajuste']

export function LibroCaja() {
  const ui = useUI()
  const { can } = useSession()
  const { lineas, todas } = useCaja()
  const { eliminarMovimiento } = useCajaActions()
  const [cuentaId, setCuentaId] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const T = today()
  const [desde, setDesde] = useState(T.slice(0, 7) + '-01')
  const [hasta, setHasta] = useState(T)

  const rango = periodo === 'hoy' ? [T, T] : periodo === 'semana' ? [plus(-6), T] : periodo === 'mes' ? [T.slice(0, 7) + '-01', T] : [desde, hasta]
  const libro = useMemo(() => libroPeriodo(lineas, cuentaId, rango[0], rango[1]), [lineas, cuentaId, rango[0], rango[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = (id: string) => todas.find(c => c.id === id)?.nombre ?? '—'

  const columns: Column<Fila>[] = [
    { key: 'date', header: 'Fecha', width: '72px', render: l => <span className="text-taupe tabular">{fd(l.date)}</span> },
    { key: 'cuenta', header: 'Cuenta', width: '120px', render: l => <span className="text-taupe">{nombre(l.cuentaId)}</span> },
    { key: 'origen', header: 'Tipo', width: '160px', badge: true, render: l => <Pill color={COLOR[l.origen]}>{ORIGEN_LABEL[l.origen]}</Pill> },
    { key: 'concepto', header: 'Concepto', width: 'minmax(220px,2fr)', primary: true, render: l => <span title={l.concepto}>{l.concepto}</span> },
    { key: 'in', header: 'Entrada', width: '110px', align: 'right', render: l => l.tipo === 'ingreso' ? <span className="font-semibold text-util">{cop(l.val)}</span> : <span className="text-stone">—</span> },
    { key: 'out', header: 'Salida', width: '110px', align: 'right', render: l => l.tipo === 'egreso' ? <span className="font-semibold text-bad">{cop(l.val)}</span> : <span className="text-stone">—</span> },
    { key: 'saldo', header: 'Saldo', width: '120px', align: 'right', render: l => <span className={'tabular ' + (l.saldo < 0 ? 'text-bad' : 'text-ink')}>{cop(l.saldo)}</span> },
  ]

  /** Libro para Excel/PDF: saldo anterior, movimientos en orden y totales */
  const exportData = () => ({
    headers: ['Fecha', 'Cuenta', 'Tipo', 'Concepto', 'Entrada', 'Salida', 'Saldo'],
    rows: [
      [fd(rango[0]), cuentaId ? nombre(cuentaId) : 'Todas', 'Saldo anterior', '', null, null, libro.saldoAnterior],
      ...libro.filas.map(l => [fd(l.date), nombre(l.cuentaId), ORIGEN_LABEL[l.origen], l.concepto, l.tipo === 'ingreso' ? l.val : null, l.tipo === 'egreso' ? l.val : null, l.saldo]),
      [fd(rango[1]), '', 'Totales', '', libro.entradas, libro.salidas, libro.saldoFinal],
    ],
  })
  const tituloLibro = 'Libro de caja' + (cuentaId ? ' ' + nombre(cuentaId) : '') + ' ' + rango[0] + ' a ' + rango[1]

  return (
    <>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Chips scroll value={cuentaId} onChange={setCuentaId}
          options={[{ value: '', label: 'Todas las cuentas' }, ...todas.map(c => ({ value: c.id, label: c.nombre }))]} />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Periodo" value={periodo} onChange={setPeriodo}
            options={[{ value: 'hoy', label: 'Hoy' }, { value: 'semana', label: '7 días' }, { value: 'mes', label: 'Mes' }, { value: 'rango', label: 'Rango' }]} />
        </div>
      </div>
      {periodo === 'rango' && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-taupe">
          Del <Input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)} className="w-auto" />
          al <Input type="date" value={hasta} min={desde} onChange={e => setHasta(e.target.value)} className="w-auto" />
        </div>
      )}

      {/* Encabezado tradicional del libro: saldo anterior + entradas − salidas = saldo final */}
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-md border border-linen bg-paper p-3.5 text-[13px] sm:grid-cols-4">
        <Cifra label="Saldo anterior" value={libro.saldoAnterior} />
        <Cifra label="+ Entradas" value={libro.entradas} cls="text-util" />
        <Cifra label="− Salidas" value={libro.salidas} cls="text-bad" />
        <Cifra label="= Saldo final" value={libro.saldoFinal} strong />
      </div>

      {libro.filas.length ? (
        <DataTable exportar={{ title: tituloLibro, data: exportData }} columns={columns} rows={libro.filas.slice().reverse()} rowKey={l => l.key} minWidth={980} actionsWidth="48px"
          actions={l => (PROPIOS.includes(l.origen) && can('caja.eliminar')) ? (
            <RowActions name={l.concepto} onDelete={() => ui.openModal({
              type: 'confirm', title: 'Eliminar movimiento',
              message: l.origen === 'traslado' ? 'Se borran las dos partes del traslado (salida y entrada).'
                : l.origen === 'ajuste' ? 'Se borra el ajuste y el arqueo que lo generó.' : 'Se borra: ' + l.concepto + ' por ' + cop(l.val) + '.',
              onConfirm: () => eliminarMovimiento(l.refId!),
            })} />
          ) : null} />
      ) : <Empty>No hay movimientos en este periodo.</Empty>}
      <p className="mt-3 text-xs text-taupe">Las ventas, abonos, gastos y préstamos se editan o eliminan desde su propio módulo. Aquí solo se borran los ingresos manuales, traslados y ajustes.</p>
    </>
  )
}

function Cifra({ label, value, cls = 'text-ink', strong }: { label: string; value: number; cls?: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-taupe">{label}</span>
      <span className={'tabular ' + cls + (strong ? ' font-display text-[15px]' : ' font-semibold')}>{cop(value)}</span>
    </div>
  )
}
