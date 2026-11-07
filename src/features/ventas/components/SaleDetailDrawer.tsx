import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Drawer } from '../../../components/ui/Drawer'
import { Button } from '../../../components/ui/Button'
import { Box, Card, Dot, Pill, Progress, Row, Stat } from '../../../components/ui/Display'
import { Label } from '../../../components/ui/Field'
import { C, QST, REC } from '../../../lib/constants'
import { fd, fl, wd } from '../../../lib/dates'
import { cap, cop, phone } from '../../../lib/format'
import { cuotaStatus, saleBase, saleCost, saleTotal, unitPrice } from '../../../lib/finance'
import { comName, saleStatus } from '../../../lib/selectors'

export function SaleDetailDrawer({ id }: { id: string }) {
  const { data, carRows } = useApp()
  const ui = useUI()
  const s = data.sales.find(x => x.id === id)
  if (!s) return null
  const r = carRows.find(x => x.c.saleId === s.id)
  const tot = saleTotal(s), cost = saleCost(s, data.products), base = saleBase(s)
  const units = s.items.reduce((a, i) => a + i.qty, 0)
  const credit = s.pay === 'credito'
  const st = saleStatus(s, r)
  const ab0 = r?.c.abonos.find(a => a.label === 'Abono inicial')

  return (
    <Drawer wide kicker={cap(wd(s.date)) + ' ' + fl(s.date)} title={'Venta ' + s.id} onClose={ui.closeDrawer}>
      <div className="flex flex-wrap items-center gap-2">
        <Pill big color={credit ? C.warn : C.ok}>{credit ? 'Venta a crédito' : 'Venta de contado'}</Pill>
        <Pill color={st.color}>{st.label}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total" value={cop(tot)} sub={units + ' unidades'} />
        <Stat label="Forma de pago" value={credit ? 'Crédito' : 'Contado'} sub={credit ? (r ? (r.hasPlan ? r.cu.length + ' cuotas' : 'pago único') : 'sin cuenta') : 'pagada completa'} />
        <Stat plain label="Cliente" value={s.client || 'Cliente mostrador'} sub={s.phone ? phone(s.phone) : s.clientId ? 'Sin teléfono' : 'Sin registrar'} />
        <Stat plain label="Comercial" value={comName(data, s.com)} sub="vendedor" />
      </div>

      <Label>Productos</Label>
      <div className="rounded-md border border-linen bg-white">
        {s.items.map(i => {
          const p = data.products.find(x => x.id === i.pid)
          const up = unitPrice(i.price, s.pay)
          return (
            <div key={i.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-line px-3 py-2 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <div className="min-w-0">
                <div className="font-semibold text-ink">{p?.name || '—'}</div>
                <div className="text-xs text-taupe">{p ? p.brand + ' · Talla ' + p.size + ' · ' + p.color + ' · ' + p.code : ''}</div>
              </div>
              <span className="hidden text-taupe tabular sm:block">{i.qty} × {cop(up)}</span>
              <span className="text-right font-semibold text-ink tabular">{cop(i.qty * up)}<span className="block text-xs font-normal text-taupe sm:hidden">{i.qty} × {cop(up)}</span></span>
            </div>
          )
        })}
      </div>
      <Card className="px-4 py-1">
        {credit && <Row label="Precio de lista" value={cop(base)} />}
        {credit && <Row label={'Recargo por crédito (' + REC + '%)'} value={'+' + cop(tot - base)} />}
        <Row label="Total de la venta" value={cop(tot)} />
        <Row label="Costo de la mercancía" value={cop(cost)} />
        <Row label="Utilidad en pesos" value={cop(tot - cost)} />
        <Row label="Utilidad en porcentaje" value={tot ? Math.round(((tot - cost) / tot) * 100) + '%' : '—'} />
      </Card>

      {!credit && <Box className="flex-row items-center"><Dot color={C.ok} /><span>Pagada completa de contado el {fl(s.date)}.</span></Box>}

      {credit && r && (
        <>
          <Label>Crédito</Label>
          <Box warn>
            <div className="flex justify-between gap-3"><Label>Pagado · {r.pct}%</Label><span className="text-taupe tabular">{cop(r.paid)} de {cop(tot)}</span></div>
            <Progress lg value={r.pct} />
            <div>
              <Row label="Abono inicial" value={ab0 ? cop(ab0.val) : 'Sin abono'} />
              <Row label="Total abonado" value={cop(r.paid)} />
              <Row label="Saldo pendiente" value={cop(r.saldo)} />
              <Row label="Plan de pagos" value={r.hasPlan ? r.cu.length + ' cuotas · hasta el ' + fl(r.cu[r.cu.length - 1].due) : 'Pago único · ' + fl(r.c.due)} />
              <Row label="Próxima cuota" value={r.next ? cop(r.next.amount - r.next.paid) + ' · ' + fl(r.next.due) : 'Ninguna, cuenta saldada'} />
            </div>
          </Box>
          {r.hasPlan && (
            <div className="rounded-md border border-linen bg-white">
              {r.cu.map(q => {
                const qs = cuotaStatus(q)
                return (
                  <div key={q.n} className="grid min-h-[52px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                    <span className={'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold ' + (qs === 'pag' ? 'border-ok bg-ok text-cream' : 'border-stone')}>{q.n}</span>
                    <span><strong className="tabular">{cop(q.amount)}</strong> <span className="text-taupe">· {fd(q.due)}</span></span>
                    <Pill color={QST[qs][1]}>{QST[qs][0]}</Pill>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {credit && !r && <span className="text-xs text-taupe">Esta venta a crédito no tiene cuenta en Cartera.</span>}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => ui.openDrawer({ type: 'sale', editId: s.id })}>Editar venta</Button>
        {r && <Button variant="dark" onClick={() => ui.openDrawer({ type: 'cartera', cid: r.c.id, sec: 'plan' })}>Ver en Cartera</Button>}
        {s.clientId && <Button onClick={() => ui.openDrawer({ type: 'client', id: s.clientId! })}>Ver cliente</Button>}
      </div>
    </Drawer>
  )
}
