import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Empty } from '../components/ui/Display'
import { IconPlus } from '../components/ui/Icons'
import { SalesTable } from '../features/ventas/components/SalesTable'
import { useSalesList } from '../features/ventas/hooks/useSales'

export default function VentasPage() {
  const ui = useUI()
  const { rows, summary } = useSalesList()
  return (
    <>
      <PageHeader title="Ventas" sub={summary}
        actions={<Button variant="dark" onClick={() => ui.openDrawer({ type: 'sale' })}><IconPlus size={16} />Nueva venta</Button>} />
      {rows.length ? <SalesTable rows={rows} /> : <Empty>Todavía no hay ventas. Usa “+ Nueva venta” para registrar la primera.</Empty>}
    </>
  )
}
