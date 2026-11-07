import { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Segmented } from '../components/ui/Segmented'
import { ReportVentas } from '../features/reportes/components/ReportVentas'
import { ReportPrendas } from '../features/reportes/components/ReportPrendas'
import { ReportCartera } from '../features/reportes/components/ReportCartera'
import { ReportPrestamos } from '../features/reportes/components/ReportPrestamos'
import { useReports } from '../features/reportes/hooks/useReports'
import type { RepPeriod } from '../features/reportes/services/reportsService'

export default function ReportesPage() {
  const [rv, setRv] = useState<'ventas' | 'prendas' | 'cartera' | 'prestamos'>('ventas')
  const [rp, setRp] = useState<RepPeriod>('mes')
  const [sort, setSort] = useState<'unidades' | 'ventas'>('unidades')
  const r = useReports(rp, sort)

  return (
    <>
      <PageHeader title="Reportes" sub={r.label}
        actions={
          <>
            <Segmented full label="Reporte" value={rv} onChange={setRv} options={[{ value: 'ventas', label: 'Ventas' }, { value: 'prendas', label: 'Más vendidas' }, { value: 'cartera', label: 'Cartera' }, { value: 'prestamos', label: 'Préstamos' }]} />
            <Segmented full label="Periodo" value={rp} onChange={setRp} options={[{ value: 'semana', label: '7 días' }, { value: 'mes', label: 'Mes' }, { value: 'todo', label: 'Todo' }]} />
          </>
        } />
      {rv === 'ventas' && <ReportVentas r={r.sales} />}
      {rv === 'prendas' && <ReportPrendas r={r.ranking} sort={sort} onSort={setSort} />}
      {rv === 'cartera' && <ReportCartera r={r.cartera} />}
      {rv === 'prestamos' && <ReportPrestamos loans={r.loans.loans} s={r.loans.s} p={r.loans.p} />}
    </>
  )
}
