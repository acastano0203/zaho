import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { buildLoans, loansPeriod, loansSummary } from '../../prestamos/services/loansService'
import { carteraReport, periodRange, rankingReport, salesReport, type RepPeriod } from '../services/reportsService'

export function useReports(rp: RepPeriod, sort: 'unidades' | 'ventas') {
  const { data, carRows } = useApp()
  return useMemo(() => {
    const range = periodRange(data, rp)
    const loans = buildLoans(data, carRows)
    return {
      label: range.label,
      sales: salesReport(data, rp),
      ranking: rankingReport(data, rp, sort),
      cartera: carteraReport(data, carRows, rp),
      loans: { loans, s: loansSummary(loans), p: loansPeriod(loans, range.inR) },
    }
  }, [data, carRows, rp, sort])
}
