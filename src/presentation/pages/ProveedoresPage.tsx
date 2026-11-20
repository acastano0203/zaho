import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { useSession } from '../store/SessionStore'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { PageHeader } from '../components/ui/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { Input } from '../components/ui/Field'
import { Empty } from '../components/ui/Display'
import { SuppliersTable } from '../features/proveedores/components/SuppliersTable'
import { BrandsGallery } from '../features/proveedores/components/BrandsGallery'
import { useSuppliersView } from '../features/proveedores/hooks/useSuppliers'
import { useBrandsView } from '../features/proveedores/hooks/useBrands'

type View = 'prov' | 'marcas'

export default function ProveedoresPage() {
  const [view, setView] = useState<View>('prov')
  const [q, setQ] = useState('')
  const v = useSuppliersView()
  const brands = useBrandsView(q)
  const ui = useUI()
  const { can } = useSession()

  const sub = view === 'prov'
    ? v.summary
    : brands.total + ' marcas' + (brands.sinProveedor ? ' · ' + brands.sinProveedor + ' sin proveedor' : '')

  return (
    <>
      <PageHeader title={view === 'prov' ? 'Proveedores' : 'Marcas'} sub={sub}
        actions={
          <>
            <Segmented full label="Vista de proveedores" value={view} onChange={setView}
              options={[{ value: 'prov', label: 'Proveedores' }, { value: 'marcas', label: 'Marcas' }]} />
            {view === 'prov'
              ? can('proveedores.crear') && <Button variant="dark" onClick={() => ui.openModal({ type: 'supplier' })}><IconPlus size={16} />Nuevo proveedor</Button>
              : (can('proveedores.crear') || can('inventario.crear')) && <Button variant="dark" onClick={() => ui.openModal({ type: 'brand' })}><IconPlus size={16} />Nueva marca</Button>}
          </>
        } />

      {view === 'prov' ? (
        <>
          {v.suppliers.length ? <SuppliersTable rows={v.suppliers} /> : <Empty>Aún no hay proveedores. Crea el primero y asígnale las marcas que surte.</Empty>}
        </>
      ) : (
        <>
          {brands.total > 6 && (
            <div className="mb-4 max-w-sm"><Input type="search" placeholder="Buscar marca" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar marca" /></div>
          )}
          <BrandsGallery rows={brands.rows} filtered={!!q.trim()} />
        </>
      )}
    </>
  )
}
