import { useUI } from '../store/UIStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { monthName } from '../lib/dates'
import { ComercialesTable } from '../features/comerciales/components/ComercialesTable'
import { useComercialesList } from '../features/comerciales/hooks/useComerciales'

export default function ComercialesPage() {
  const ui = useUI()
  const rows = useComercialesList()
  return (
    <>
      <PageHeader title="Comerciales" sub={'Ventas y comisiones de ' + monthName()}
        actions={<Button variant="dark" onClick={() => ui.openModal({ type: 'comercial' })}><IconPlus size={16} />Crear comercial</Button>} />
      <ComercialesTable rows={rows} />
    </>
  )
}
