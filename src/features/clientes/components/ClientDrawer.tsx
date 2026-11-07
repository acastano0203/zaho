import { useUI } from '../../../store/UIStore'
import { Drawer } from '../../../components/ui/Drawer'
import { Button, ButtonLink } from '../../../components/ui/Button'
import { Box, Pill, Stat } from '../../../components/ui/Display'
import { Label } from '../../../components/ui/Field'
import { WaIcon } from '../../../components/ui/Icons'
import { fd, fl } from '../../../lib/dates'
import { cop, phone, waLink } from '../../../lib/format'
import { saleTotal, stInfo } from '../../../lib/finance'
import { useApp } from '../../../store/AppStore'
import { itemsLabel } from '../../../lib/selectors'
import { useClientSummaries } from '../hooks/useClients'

export function ClientDrawer({ id }: { id: string }) {
  const ui = useUI()
  const { data } = useApp()
  const x = useClientSummaries().find(s => s.c.id === id)
  if (!x) return null
  const k = x.c
  const info = [k.phone ? phone(k.phone) : '', k.doc ? 'CC/NIT ' + k.doc : '', k.city].filter(Boolean).join(' · ') || 'Sin datos de contacto'
  const sales = x.sales.slice().sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <Drawer wide kicker={'Cliente desde el ' + fl(k.created)} title={k.name} onClose={ui.closeDrawer}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-taupe">{info}</span>
        <Pill color={x.st.color}>{x.st.label}</Pill>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Total comprado" value={cop(x.total)} sub="histórico" />
        <Stat label="Compras" value={x.sales.length} sub="ventas registradas" />
        <Stat label="Ticket promedio" value={cop(x.sales.length ? x.total / x.sales.length : 0)} sub="por compra" />
        <Stat label="Saldo" value={cop(x.saldo)} sub="en cartera" />
      </div>
      {k.note && <Box>{k.note}</Box>}
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" onClick={() => ui.openDrawer({ type: 'sale', clientId: k.id })}>Nueva venta</Button>
        <Button onClick={() => ui.openModal({ type: 'clientForm', id: k.id })}>Editar datos</Button>
        {k.phone && <ButtonLink href={waLink(k.phone)}><WaIcon />Escribir por WhatsApp</ButtonLink>}
      </div>

      <Label>Cuentas en cartera</Label>
      {x.open.length ? (
        <div className="rounded-md border border-linen bg-white">
          {x.open.map(r => {
            const i = stInfo(r.st, r.c.kind)
            return (
              <button key={r.c.id} type="button" onClick={() => ui.openDrawer({ type: 'cartera', cid: r.c.id, sec: 'detalle' })}
                className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-mist">
                <span className="font-semibold text-ink">{(r.c.saleId || r.c.ref) + ' · ' + cop(r.saldo)}</span>
                <Pill color={i.color}>{i.label}</Pill>
                <span className="col-span-2 text-xs text-taupe">Pagado {r.pct}% de {cop(r.total)}{r.next ? ' · próxima cuota ' + fd(r.next.due) : ''}</span>
              </button>
            )
          })}
        </div>
      ) : <span className="text-xs text-taupe">Sin cuentas pendientes.</span>}

      <Label>Compras</Label>
      {sales.length ? (
        <div className="rounded-md border border-linen bg-white">
          {sales.map(s => (
            <button key={s.id} type="button" onClick={() => ui.openDrawer({ type: 'saleDetail', id: s.id })}
              className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-mist">
              <span className="font-semibold text-ink">{s.id} · {fd(s.date)}</span>
              <span className="font-semibold text-ink tabular">{cop(saleTotal(s))}</span>
              <span className="truncate text-xs text-taupe">{itemsLabel(data, s)}</span>
              <span className="text-right text-xs text-taupe">{s.pay === 'contado' ? 'Contado' : 'Crédito'}</span>
            </button>
          ))}
        </div>
      ) : <span className="text-xs text-taupe">Todavía no tiene compras registradas.</span>}
    </Drawer>
  )
}
