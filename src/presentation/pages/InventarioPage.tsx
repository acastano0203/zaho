import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Empty } from '../components/ui/Display'
import { Segmented } from '../components/ui/Segmented'
import { IconAdjust, IconPlus, IconTransfer } from '../components/ui/Icons'
import { InventoryFilters } from '../features/inventario/components/InventoryFilters'
import { InventoryTable } from '../features/inventario/components/InventoryTable'
import { WarehouseCards } from '../features/inventario/components/WarehouseCards'
import { emptyFilters, useInventoryList } from '../features/inventario/hooks/useInventory'

export default function InventarioPage() {
  const ui = useUI()
  const [view, setView] = useState<'prod' | 'bod'>('prod')
  const [f, setF] = useState(emptyFilters)
  const { list, summary, bodegas } = useInventoryList(f)

  return (
    <>
      <PageHeader title="Inventario" sub={summary}
        actions={
          <>
            <Segmented full label="Vista de inventario" value={view} onChange={setView} options={[{ value: 'prod', label: 'Productos' }, { value: 'bod', label: 'Bodegas' }]} />
            <Button onClick={() => ui.openModal({ type: 'adjust' })}><IconAdjust size={16} />Ajustar stock</Button>
            <Button onClick={() => ui.openModal({ type: 'transfer' })}><IconTransfer size={16} />Trasladar</Button>
            <Button variant="dark" onClick={() => ui.openModal({ type: 'product' })}><IconPlus size={16} />Crear producto</Button>
          </>
        } />
      {view === 'prod' ? (
        <>
          <InventoryFilters value={f} onChange={setF} />
          {list.length ? <InventoryTable rows={list} /> : <Empty>Ningún producto coincide con los filtros.</Empty>}
        </>
      ) : <WarehouseCards bodegas={bodegas} />}
    </>
  )
}
