import { Bar, Card, Dot, KpiCard } from '../../../components/ui/Display'
import { C } from '../../../lib/constants'
import { cop, pct } from '../../../lib/format'
import type { salesReport } from '../services/reportsService'

type R = ReturnType<typeof salesReport>

function BarList({ title, items, color }: { title: string; items: R['byCat']; color: string }) {
  return (
    <Card className="bg-white">
      <span className="mb-2 text-[11px] uppercase tracking-[0.22em]">{title}</span>
      <div className="flex flex-col gap-3">
        {items.map(b => (
          <div key={b.label} className="grid grid-cols-[90px_minmax(0,1fr)_100px] items-center gap-3 text-sm">
            <span className="truncate">{b.label}</span><Bar value={b.pct} color={color} /><span className="text-right font-semibold text-ink tabular">{cop(b.v)}</span>
          </div>
        ))}
        {!items.length && <span className="text-xs text-taupe">Sin ventas en el periodo.</span>}
      </div>
    </Card>
  )
}

export function ReportVentas({ r }: { r: R }) {
  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KpiCard label="Ventas" value={cop(r.tot)} sub={r.n + (r.n === 1 ? ' venta' : ' ventas')} />
        <KpiCard label="Utilidad" value={cop(r.util)} valueClass="text-util!" sub={pct(r.util, r.tot) + '% sobre ventas · costo ' + cop(r.cost)} />
        <KpiCard label="Ticket promedio" value={cop(r.avg)} sub={r.units + ' prendas vendidas'} />
        <KpiCard label="Contado / crédito" value={pct(r.tCont, r.tot) + '% / ' + pct(r.tCred, r.tot) + '%'} sub={cop(r.tCont) + ' contado · ' + cop(r.tCred) + ' crédito'} />
      </div>

      <Card className="mb-4 gap-2.5 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-[0.22em]">{r.chartTitle}</span>
          <span className="flex flex-wrap items-center gap-3.5 text-xs text-taupe">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-char" />Contado</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-warn" />Crédito</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(r.bars.length * 14, 280) }}>
            <div className="flex h-44 items-stretch gap-1 border-b border-sand pt-2" role="img" aria-label={r.chartTitle}>
              {r.bars.map(b => (
                <div key={b.key} title={b.full + ': ' + cop(b.c + b.k) + ' · ' + b.n + (b.n === 1 ? ' venta' : ' ventas')}
                  className="flex min-w-1 flex-1 flex-col-reverse rounded-t hover:bg-cream">
                  <div className="shrink-0 bg-char" style={{ height: b.hc + '%' }} />
                  <div className="shrink-0 bg-warn" style={{ height: b.hk + '%' }} />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1">
              {r.bars.map(b => <span key={b.key} className="min-w-1 flex-1 text-center text-[10px] whitespace-nowrap text-taupe">{b.lbl}</span>)}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Por comercial</span>
          {r.byCom.map(c => (
            <div key={c.name} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
              <span className="flex min-w-0 flex-col"><strong>{c.name}</strong>
                <span className="text-xs text-taupe">{c.n} ventas · utilidad {cop(c.util)} · comisión {cop(c.comm)}</span></span>
              <span className="font-semibold text-ink tabular">{cop(c.v)}</span>
            </div>
          ))}
        </Card>
        <Card className="bg-white">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Por forma de pago</span>
          {[{ name: 'Contado', color: C.ok, v: r.tCont, sub: r.nCont + ' ventas · ' + pct(r.tCont, r.tot) + '% del total' },
            { name: 'Crédito', color: C.warn, v: r.tCred, sub: r.nCred + ' ventas · ' + pct(r.tCred, r.tot) + '% del total · recargo cobrado ' + cop(r.recargo) }].map(p => (
            <div key={p.name} className="flex items-center justify-between gap-3 border-t border-line py-2.5">
              <span className="flex min-w-0 flex-col"><span className="flex items-center gap-2"><Dot color={p.color} /><strong>{p.name}</strong></span>
                <span className="text-xs text-taupe">{p.sub}</span></span>
              <span className="font-semibold text-ink tabular">{cop(p.v)}</span>
            </div>
          ))}
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <BarList title="Por categoría" items={r.byCat} color="#3E3A38" />
        <BarList title="Por marca" items={r.byBrand} color="#57524F" />
      </div>
    </>
  )
}
