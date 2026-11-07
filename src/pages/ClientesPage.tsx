import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Chips } from '../components/ui/Chip'
import { Empty } from '../components/ui/Display'
import { Input } from '../components/ui/Field'
import { IconPlus } from '../components/ui/Icons'
import { norm } from '../lib/format'
import { ClientsTable } from '../features/clientes/components/ClientsTable'
import { matchClientFilter, useClientSummaries } from '../features/clientes/hooks/useClients'

const FILTERS = [['all', 'Todos'], ['saldo', 'Con saldo'], ['mora', 'En mora'], ['new', 'Sin compras']]

export default function ClientesPage() {
  const ui = useUI()
  const all = useClientSummaries()
  const [st, setSt] = useState('all')
  const [q, setQ] = useState('')
  const nq = norm(q)
  const rows = all.filter(x => matchClientFilter(x, st) && (!nq || norm(x.c.name + ' ' + x.c.phone + ' ' + x.c.doc).includes(nq)))
    .sort((a, b) => b.saldo - a.saldo || a.c.name.localeCompare(b.c.name))

  return (
    <>
      <PageHeader title="Clientes" sub={all.length + ' clientes · ' + all.filter(x => x.saldo > 0).length + ' con saldo pendiente'}
        actions={<Button variant="dark" onClick={() => ui.openModal({ type: 'clientForm' })}><IconPlus size={16} />Nuevo cliente</Button>} />
      <div className="mb-3.5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <Chips scroll value={st} onChange={setSt} options={FILTERS.map(([v, l]) => ({ value: v, label: l + ' · ' + all.filter(x => matchClientFilter(x, v)).length }))} />
        <Input className="lg:ml-auto lg:max-w-xs" placeholder="Buscar por nombre, teléfono o documento" aria-label="Buscar cliente" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {rows.length ? <ClientsTable rows={rows} />
        : <Empty>{all.length ? 'Ningún cliente coincide con el filtro.' : 'Aún no hay clientes. Créalos aquí o desde el desplegable de una venta.'}</Empty>}
    </>
  )
}
