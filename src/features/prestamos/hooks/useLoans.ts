import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { buildLoans, loansSummary } from '../services/loansService'

export function useLoans() {
  const { data, carRows } = useApp()
  return useMemo(() => {
    const loans = buildLoans(data, carRows)
    return { loans, summary: loansSummary(loans) }
  }, [data, carRows])
}
