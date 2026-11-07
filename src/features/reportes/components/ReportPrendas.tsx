import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Empty, Progress, SubTitle } from '../../../components/ui/Display'
import { Segmented } from '../../../components/ui/Segmented'
import { cop } from '../../../lib/format'
import type { rankingReport } from '../services/reportsService'

type R = ReturnType<typeof rankingReport>
type Item = R['rank'][number]

interface Props { r: R; sort: 'unidades' | 'ventas'; onSort: (s: 'unidades' | 'ventas') => void }

export function ReportPrendas({ r, sort, onSort }: Props) {
  const columns: Column<Item>[] = [
    { key: 'n', header: '#', width: '40px', badge: true, render: x => <span className="font-display text-[13px] text-ink">{x.n}</span> },
    { key: 'name', header: 'Prenda', width: 'minmax(200px,2fr)', primary: true,
      render: x => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-ink">{x.p?.name || '—'}</span><span className="truncate text-xs font-normal text-taupe">{x.p ? 'Talla ' + x.p.size + ' · ' + x.p.color + ' · ' + x.p.code : ''}</span></span> },
    { key: 'brand', header: 'Marca', width: '110px', render: x => x.p?.brand || '—' },
    { key: 'u', header: 'Unid.', width: '64px', align: 'right', render: x => <span className="font-semibold text-ink">{x.u}</span> },
    { key: 'v', header: 'Ventas', width: '110px', align: 'right', render: x => cop(x.v) },
    { key: 'util', header: 'Utilidad', width: '110px', align: 'right', render: x => <span className="font-semibold text-util">{cop(x.v - x.c)}</span> },
    { key: 'pct', header: '%', width: '64px', align: 'right', render: x => <span className="text-util">{x.v ? Math.round(((x.v - x.c) / x.v) * 100) + '%' : '—'}</span> },
    { key: 'stock', header: 'Stock', width: '60px', align: 'right', render: x => <span className="text-taupe">{x.p?.stock ?? 0}</span> },
    { key: 'share', header: 'Participación', width: '160px',
      render: x => <span className="flex items-center gap-2"><Progress value={x.share} /><span className="min-w-[34px] text-right text-xs tabular">{x.shareL}</span></span> },
  ]
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Ordenar por" value={sort} onChange={onSort} options={[{ value: 'unidades', label: 'Por unidades' }, { value: 'ventas', label: 'Por ventas en $' }]} />
        <span className="text-xs text-taupe">{r.refs} referencias vendidas · {r.units} prendas · {cop(r.tot)}</span>
      </div>
      {r.rank.length ? <DataTable columns={columns} rows={r.rank} rowKey={x => x.pid} minWidth={1020} />
        : <Empty>Sin ventas en este periodo. El ranking aparece apenas registres la primera.</Empty>}
      {r.idle.length > 0 && (
        <>
          <SubTitle>Sin movimiento en el periodo</SubTitle>
          <div className="rounded-md border border-linen bg-white">
            {r.idle.map(p => (
              <div key={p.id} className="grid min-h-[52px] grid-cols-1 items-center gap-x-3 gap-y-0.5 border-t border-line px-3 py-2.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="font-semibold text-ink">{p.name} · T{p.size}</span>
                <span className="text-taupe tabular sm:text-right">{p.stock} und · {cop(p.stock * p.cost)} al costo</span>
                <span className="text-xs text-taupe sm:col-span-2">{p.brand} · {p.color} · {p.wh}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
