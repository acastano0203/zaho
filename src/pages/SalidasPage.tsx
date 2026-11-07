import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Chips } from '../components/ui/Chip'
import { Empty } from '../components/ui/Display'
import { Segmented } from '../components/ui/Segmented'
import { IconLoan, IconPlus } from '../components/ui/Icons'
import { TIPO_KEYS, TIPOS } from '../lib/constants'
import { monthName } from '../lib/dates'
import { cop } from '../lib/format'
import { OutTypeChart } from '../features/salidas/components/OutTypeChart'
import { OutTable } from '../features/salidas/components/OutTable'
import { BalanceView } from '../features/salidas/components/BalanceView'
import { useSalidasView } from '../features/salidas/hooks/useSalidas'
import { useLoans } from '../features/prestamos/hooks/useLoans'
import { LoansSummary } from '../features/prestamos/components/LoansSummary'
import { LoansTable } from '../features/prestamos/components/LoansTable'

export default function SalidasPage() {
  const ui = useUI()
  const [view, setView] = useState<'mov' | 'pres' | 'bal'>('mov')
  const [filter, setFilter] = useState('')
  const v = useSalidasView(filter)
  const { loans, summary } = useLoans()
  const opts = [{ value: '', label: 'Todas · ' + v.all.length }, ...TIPO_KEYS.map(k => ({ value: k as string, label: TIPOS[k] + ' · ' + v.all.filter(g => g.tipo === k).length }))]

  return (
    <>
      <PageHeader title="Salidas de dinero" sub={v.month.length + ' salidas en ' + monthName() + ' · hoy ' + cop(v.todayTotal)}
        actions={
          <>
            <Segmented full label="Vista de salidas" value={view} onChange={setView} options={[{ value: 'mov', label: 'Movimientos' }, { value: 'pres', label: 'Préstamos · ' + summary.nOpen }, { value: 'bal', label: 'Balance' }]} />
            <Button onClick={() => ui.openDrawer({ type: 'salida', kind: 'prestamo', origin: 'salidas' })}><IconLoan size={16} />Prestar dinero</Button>
            <Button variant="dark" onClick={() => ui.openDrawer({ type: 'salida', kind: 'gasto', origin: 'salidas' })}><IconPlus size={16} />Registrar gasto</Button>
          </>
        } />
      {view === 'mov' && (
        <>
          <OutTypeChart view={v} />
          <div className="mb-3"><Chips scroll value={filter} onChange={setFilter} options={opts} /></div>
          {v.rows.length ? <OutTable rows={v.rows} colors={v.colors} /> : <Empty>Sin salidas registradas. Usa “Registrar gasto” o “Prestar dinero”.</Empty>}
        </>
      )}
      {view === 'pres' && (
        <>
          <p className="mb-3.5 text-[13px] text-taupe">Dinero que salió de caja prestado a terceros y debe volver. Cada devolución entra a caja y se ve en el Balance.</p>
          <LoansSummary s={summary} />
          {loans.length ? <LoansTable loans={loans} /> : <Empty>No has prestado dinero. Usa “Prestar dinero” para registrar el primero.</Empty>}
        </>
      )}
      {view === 'bal' && <BalanceView />}
    </>
  )
}
