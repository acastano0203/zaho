import { useState } from 'react'
import { Bar, Card, Dot, KpiCard, Row } from '../../../components/ui/Display'
import { Segmented } from '../../../components/ui/Segmented'
import { C } from '../../../lib/constants'
import { cop, pct } from '../../../lib/format'
import type { BalPeriod } from '../services/balanceService'
import { useBalance } from '../hooks/useSalidas'

export function BalanceView() {
  const [p, setP] = useState<BalPeriod>('mes')
  const b = useBalance(p)
  const mx = Math.max(b.inTot, b.outTot, 1)

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Periodo del balance" value={p} onChange={setP}
          options={[{ value: 'hoy', label: 'Hoy' }, { value: 'semana', label: '7 días' }, { value: 'mes', label: 'Mes' }]} />
        <span className="text-xs text-taupe">Periodo: {b.period}</span>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Entradas" value={cop(b.inTot)} sub={b.nIn + ' movimientos de entrada'} />
        <KpiCard label="Salidas" value={cop(b.outTot)} sub={b.nOut + ' salidas registradas'} />
        <KpiCard dark label="Balance de caja" value={cop(b.net)}
          sub={<span className="flex items-center gap-2"><Dot color={b.net >= 0 ? C.ok : C.bad} />{b.net >= 0 ? 'Entró más de lo que salió' : 'Salió más de lo que entró'}</span>} />
      </div>
      <Card className="mb-4 gap-2.5 bg-cream">
        {[['Entran', b.inTot, C.ok], ['Salen', b.outTot, '#3E3A38']].map(([l, v, c]) => (
          <div key={l as string} className="grid grid-cols-[64px_minmax(0,1fr)_100px] items-center gap-3 md:grid-cols-[80px_minmax(0,1fr)_120px]">
            <span className="text-[11px] uppercase tracking-[0.22em]">{l}</span>
            <Bar value={Math.round(((v as number) / mx) * 100)} color={c as string} />
            <span className="text-right font-semibold text-ink tabular">{cop(v as number)}</span>
          </div>
        ))}
      </Card>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="bg-cream">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Entradas de dinero</span>
          {b.inRows.map(r => <Row key={r.label} label={r.label} value={cop(r.v)} />)}
          <Row strong label="Total entradas" value={cop(b.inTot)} />
        </Card>
        <Card className="bg-cream">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Salidas por tipo</span>
          {b.outRows.map(r => (
            <Row key={r.key} label={<span className="flex items-center gap-2"><Dot color={r.color} className="border border-stone" />{r.label}</span>}
              value={<span className="flex items-center gap-2.5"><span className="text-xs font-normal text-taupe">{pct(r.v, b.outTot)}%</span>{cop(r.v)}</span>} />
          ))}
          {b.outRows.length === 0 && <span className="py-2.5 text-xs text-taupe">Sin salidas en este periodo.</span>}
          <Row strong label="Total salidas" value={cop(b.outTot)} />
        </Card>
      </div>
      <Card className="mt-4">
        <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Resultado estimado del periodo</span>
        <Row label="Ventas del periodo (contado y crédito)" value={cop(b.vTot)} />
        <Row label="− Costo de la mercancía vendida" value={cop(b.cmv)} />
        <Row label="= Margen bruto" value={cop(b.vTot - b.cmv) + (b.vTot ? ' · ' + pct(b.vTot - b.cmv, b.vTot) + '%' : '')} />
        <Row label="− Gastos de operación" value={cop(b.gOp)} />
        <Row strong label={<span className="flex items-center gap-2"><Dot color={b.util >= 0 ? C.ok : C.bad} />Utilidad estimada</span>} value={cop(b.util)} />
        <span className="mt-2 text-xs text-taupe">
          Gastos de operación: transporte, costos operativos, comisiones y otros{b.vTot ? ' (' + pct(b.gOp, b.vTot) + '% de las ventas)' : ''}. La compra de inventario no se resta aquí porque queda como mercancía, y los préstamos tampoco porque se recuperan. Ventas a crédito del periodo: {cop(b.vTot - b.vCont)}.
        </span>
      </Card>
    </>
  )
}
