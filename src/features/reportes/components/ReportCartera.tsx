import { useUI } from '../../../store/UIStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { Button } from '../../../components/ui/Button'
import { Bar, Card, Dot, Empty, KpiCard, Pill, Progress, Row, SubTitle } from '../../../components/ui/Display'
import { cop, pct } from '../../../lib/format'
import { carRef, daysLabel, lastFollowUp, stInfo } from '../../../lib/finance'
import type { CarRow } from '../../../types'
import type { carteraReport } from '../services/reportsService'

type R = ReturnType<typeof carteraReport>

export function ReportCartera({ r }: { r: R }) {
  const ui = useUI()
  const open = (x: CarRow) => ui.openDrawer({ type: 'cartera', cid: x.c.id, sec: 'seg' })
  const columns: Column<CarRow>[] = [
    { key: 'client', header: 'Cliente', width: 'minmax(160px,1.3fr)', primary: true,
      render: x => <button type="button" onClick={() => open(x)} className="max-w-full truncate text-left font-semibold text-ink underline decoration-sand-dark underline-offset-[3px]">{x.c.client}</button> },
    { key: 'ref', header: 'Cuenta', width: '90px', render: x => <span className="text-taupe">{carRef(x.c)}</span> },
    { key: 'saldo', header: 'Saldo', width: '110px', align: 'right', render: x => <span className="font-semibold text-ink">{cop(x.saldo)}</span> },
    { key: 'paid', header: 'Pagado', width: '130px', render: x => <span className="flex items-center gap-2"><Progress value={x.pct} /><span className="min-w-[34px] text-right text-xs">{x.pct}%</span></span> },
    { key: 'st', header: 'Estado', width: '120px', badge: true, render: x => { const i = stInfo(x.st, x.c.kind); return <Pill color={i.color}>{i.label}</Pill> } },
    { key: 'days', header: 'Días', width: '130px', render: x => daysLabel(x) },
    { key: 'last', header: 'Último seguimiento', width: 'minmax(150px,1fr)', render: x => <span className="text-taupe">{lastFollowUp(x)}</span> },
  ]

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <KpiCard label="Por cobrar" value={cop(r.openTot)} sub={r.nOpen + (r.nOpen === 1 ? ' cuenta abierta' : ' cuentas abiertas')} />
        <KpiCard label="Vencida" value={cop(r.vencTot)} valueClass="text-bad!" sub={pct(r.vencTot, r.openTot) + '% de la cartera · ' + r.nVenc + ' cuentas'} />
        <KpiCard label="Recaudo del periodo" value={cop(r.rec)} valueClass="text-util!" sub={r.nAb + (r.nAb === 1 ? ' abono' : ' abonos')} />
        <KpiCard label="Índice de recaudo" value={r.idx} sub={r.tCred ? 'recaudo sobre ventas a crédito del periodo' : 'sin ventas a crédito en el periodo'} />
      </div>
      <Card className="mb-4 bg-white">
        <span className="mb-2 text-[11px] uppercase tracking-[0.22em]">Antigüedad de la cartera</span>
        <div className="flex flex-col gap-3">
          {r.aging.map(b => (
            <div key={b.label} className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-[190px_minmax(0,1fr)_170px] sm:items-center sm:gap-3">
              <span className="flex items-center gap-2"><Dot color={b.color} />{b.label}</span>
              <Bar value={b.pct} color={b.color} />
              <span className="tabular sm:text-right"><strong>{cop(b.v)}</strong> <span className="text-xs text-taupe">· {b.n} {b.n === 1 ? 'cuenta' : 'cuentas'}</span></span>
            </div>
          ))}
        </div>
        <span className="mt-2.5 text-xs text-taupe">La antigüedad se mide con la próxima cuota pendiente de cada cuenta. Recaudo, colocación y gestiones usan el periodo elegido.</span>
      </Card>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="bg-white">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Seguimiento</span>
          {r.follow.map(([l, v]) => <Row key={l} label={l} value={v} />)}
        </Card>
        <Card className="bg-white">
          <span className="mb-1 text-[11px] uppercase tracking-[0.22em]">Colocación y préstamos</span>
          <Row label="Ventas a crédito del periodo" value={cop(r.tCred) + ' · ' + r.nCred} />
          <Row label="Recargo por crédito cobrado" value={cop(r.recargo)} />
          <Row label="Préstamos por recuperar" value={cop(r.loansTot) + ' · ' + r.nLoans} />
          <Row label="Préstamos vencidos" value={cop(r.loansVenc)} />
        </Card>
      </div>
      <SubTitle>Deudores principales</SubTitle>
      {r.debtors.length ? (
        <DataTable columns={columns} rows={r.debtors} rowKey={x => x.c.id} minWidth={1120} actionsWidth="120px"
          actions={x => <Button size="sm" onClick={() => open(x)}>Seguimiento</Button>} />
      ) : <Empty>No hay cuentas por cobrar.</Empty>}
    </>
  )
}
