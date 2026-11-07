import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Chips } from '../components/ui/Chip'
import { Empty, KpiCard } from '../components/ui/Display'
import { Input } from '../components/ui/Field'
import { IconLoan, IconPlus } from '../components/ui/Icons'
import { cop } from '../lib/format'
import { CarteraTable } from '../features/cartera/components/CarteraTable'
import { TemplatesEditor } from '../features/cartera/components/TemplatesEditor'
import { matchCarFilter, useCarteraList } from '../features/cartera/hooks/useCartera'

const FILTERS = [['all', 'Todas'], ['ven', 'Vencidas'], ['pv', 'Vencen pronto'], ['ok', 'Al día'], ['prestamo', 'Préstamos'], ['pag', 'Pagadas']]

export default function CarteraPage() {
  const ui = useUI()
  const [st, setSt] = useState('all')
  const [q, setQ] = useState('')
  const { rows, all, summary: s } = useCarteraList({ q, st })

  return (
    <>
      <PageHeader title="Cartera" sub="Créditos a clientes y préstamos por recuperar"
        actions={
          <>
            <Button onClick={() => ui.openDrawer({ type: 'salida', kind: 'prestamo', origin: 'cartera' })}><IconLoan size={16} />Registrar préstamo</Button>
            <Button variant="dark" onClick={() => ui.openDrawer({ type: 'salida', kind: 'deuda', origin: 'cartera' })}><IconPlus size={16} />Cuenta por cobrar</Button>
          </>
        } />
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KpiCard label="Total por cobrar" value={cop(s.total)} sub={s.totalN + ' cuentas abiertas'} />
        <KpiCard label="Vencida" value={cop(s.ven)} sub={s.venN + ' clientes en mora'} />
        <KpiCard label="Vence en 3 días o menos" value={cop(s.pv)} sub={s.pvN + ' clientes'} />
        <KpiCard label="Préstamos por recuperar" value={cop(s.pr)} sub={s.prN + (s.prN === 1 ? ' préstamo' : ' préstamos')} />
      </div>
      <div className="mb-3.5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <Chips scroll value={st} onChange={setSt} options={FILTERS.map(([v, l]) => ({ value: v, label: l + ' · ' + all.filter(r => matchCarFilter(r, v)).length }))} />
        <Input className="lg:ml-auto lg:max-w-xs" placeholder="Buscar cliente" aria-label="Buscar cliente" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {rows.length ? <CarteraTable rows={rows} /> : <Empty>No hay cuentas con ese filtro.</Empty>}
      <TemplatesEditor />
    </>
  )
}
