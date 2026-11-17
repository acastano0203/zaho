import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { useSession } from '../store/SessionStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Chips } from '../components/ui/Chip'
import { Empty } from '../components/ui/Display'
import { Segmented } from '../components/ui/Segmented'
import { IconLoan, IconMinus, IconPlus, IconTransfer } from '../components/ui/Icons'
import { TIPO_KEYS, TIPOS } from '../../shared/lib/constants'
import { cop } from '../../shared/lib/format'
import { CuentasCards } from '../features/caja/components/CuentasCards'
import { LibroCaja } from '../features/caja/components/LibroCaja'
import { ArqueosTable } from '../features/caja/components/ArqueosTable'
import { useCaja } from '../features/caja/hooks/useCaja'
import { OutTypeChart } from '../features/salidas/components/OutTypeChart'
import { OutTable } from '../features/salidas/components/OutTable'
import { BalanceView } from '../features/salidas/components/BalanceView'
import { useSalidasView } from '../features/salidas/hooks/useSalidas'
import { useLoans } from '../features/prestamos/hooks/useLoans'
import { LoansSummary } from '../features/prestamos/components/LoansSummary'
import { LoansTable } from '../features/prestamos/components/LoansTable'

type View = 'libro' | 'gastos' | 'prest' | 'arqueos' | 'bal'

export default function CajaPage() {
  const ui = useUI()
  const { can } = useSession()
  const [view, setView] = useState<View>('libro')
  const [filter, setFilter] = useState('')
  const caja = useCaja()
  const v = useSalidasView(filter)
  const { loans, summary } = useLoans()
  const opts = [{ value: '', label: 'Todas · ' + v.all.length }, ...TIPO_KEYS.filter(k => k !== 'prestamo').map(k => ({ value: k as string, label: TIPOS[k] + ' · ' + v.all.filter(g => g.tipo === k).length }))]
  const gastos = v.rows.filter(g => g.tipo !== 'prestamo')

  return (
    <>
      <PageHeader title="Caja" sub={'Disponible ' + cop(caja.total) + ' · hoy entró ' + cop(caja.entradasHoy) + ' y salió ' + cop(caja.salidasHoy)}
        actions={can('caja.crear') && (
          <>
            <Button onClick={() => ui.openModal({ type: 'cajaIngreso' })}><IconPlus size={16} />Otro ingreso</Button>
            <Button onClick={() => ui.openModal({ type: 'cajaTraslado' })}><IconTransfer size={16} />Traslado</Button>
            <Button variant="dark" onClick={() => ui.openDrawer({ type: 'salida', kind: 'gasto', origin: 'salidas' })}><IconMinus size={16} />Registrar gasto</Button>
          </>
        )} />

      <CuentasCards />

      <div className="mb-4">
        <Segmented full label="Vista de caja" value={view} onChange={setView} options={[
          { value: 'libro', label: 'Libro de caja' },
          { value: 'gastos', label: 'Gastos' },
          { value: 'prest', label: 'Préstamos · ' + summary.nOpen },
          { value: 'arqueos', label: 'Arqueos' },
          { value: 'bal', label: 'Balance' },
        ]} />
      </div>

      {view === 'libro' && <LibroCaja />}

      {view === 'gastos' && (
        <>
          <OutTypeChart view={v} />
          <div className="mb-3"><Chips scroll value={filter} onChange={setFilter} options={opts} /></div>
          {gastos.length ? <OutTable rows={gastos} colors={v.colors} /> : <Empty>Sin gastos registrados. Usa “Registrar gasto”.</Empty>}
        </>
      )}

      {view === 'prest' && (
        <>
          <div className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-taupe">Dinero que salió de caja prestado a terceros y debe volver. Cada devolución entra a caja.</p>
            {can('caja.crear') && <Button onClick={() => ui.openDrawer({ type: 'salida', kind: 'prestamo', origin: 'salidas' })}><IconLoan size={16} />Prestar dinero</Button>}
          </div>
          <LoansSummary s={summary} />
          {loans.length ? <LoansTable loans={loans} /> : <Empty>No has prestado dinero.</Empty>}
        </>
      )}

      {view === 'arqueos' && <ArqueosTable />}
      {view === 'bal' && <BalanceView />}
    </>
  )
}
