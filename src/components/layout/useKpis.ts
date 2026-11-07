import { useMemo } from 'react'
import { useApp } from '../../store/AppStore'
import { today } from '../../lib/dates'
import { cop, plural } from '../../lib/format'
import { productStatus, saleTotal } from '../../lib/finance'

export function useKpis() {
  const { data, carRows } = useApp()
  return useMemo(() => {
    const T = today()
    const ts = data.sales.filter(x => x.date === T)
    const to = data.salidas.filter(x => x.date === T)
    const open = carRows.filter(r => r.saldo > 0)
    const risk = open.filter(r => r.st === 'ven' || r.st === 'pv')
    const nAgo = data.products.filter(p => productStatus(p) === 'ago').length
    const nBaj = data.products.filter(p => productStatus(p) === 'baj').length
    return [
      { label: 'Ventas del día', value: cop(ts.reduce((a, x) => a + saleTotal(x), 0)), sub: plural(ts.length, 'venta hoy', 'ventas hoy') },
      { label: 'Salidas del día', value: cop(to.reduce((a, x) => a + x.val, 0)), sub: plural(to.length, 'movimiento', 'movimientos') },
      { label: 'Cartera por cobrar', value: cop(open.reduce((a, r) => a + r.saldo, 0)), sub: plural(open.length, 'cuenta abierta', 'cuentas abiertas') },
      { label: 'Vencida o vence ≤ 3 días', value: cop(risk.reduce((a, r) => a + r.saldo, 0)), sub: plural(risk.length, 'cliente', 'clientes'), danger: true },
      { label: 'Agotados / stock bajo', value: nAgo + ' / ' + nBaj, sub: 'agotados / bajos' },
    ]
  }, [data, carRows])
}
