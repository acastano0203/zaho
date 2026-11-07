import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Button } from '../../../components/ui/Button'
import { Card, Row } from '../../../components/ui/Display'
import { fd, fl } from '../../../lib/dates'
import { cop, phone } from '../../../lib/format'
import { unitPrice } from '../../../lib/finance'
import { comName } from '../../../lib/selectors'
import type { CarRow } from '../../../types'

export function CarteraDetailTab({ r, goPlan, goAbono }: { r: CarRow; goPlan: () => void; goAbono: () => void }) {
  const { data } = useApp()
  const ui = useUI()
  const ab0 = r.c.abonos.find(a => a.label === 'Abono inicial')
  const planTxt = r.hasPlan ? r.cu.length + ' cuotas · ' + fd(r.cu[0].due) + ' a ' + fd(r.cu[r.cu.length - 1].due) : 'Pago único · ' + fl(r.c.due)

  let rows: [string, string][]
  if (r.sale) {
    rows = [['Venta', r.sale.id + ' · ' + fl(r.sale.date)], ['Comercial', comName(data, r.c.com)], ['Valor de la venta', cop(r.total)],
      ['Abono inicial', ab0 ? cop(ab0.val) : 'Sin abono'], ['Plan de pagos', planTxt], ['Teléfono', phone(r.c.phone)]]
  } else if (r.c.kind === 'prestamo') {
    rows = [['Valor prestado', cop(r.total)], ['Entregado el', fl(r.c.created)], ['Cómo se entregó', r.c.met || '—'],
      ['Salida registrada', r.c.salidaId || r.c.ref || '—'], ['Plan de devolución', planTxt], ['Nota', r.c.nota || '—'], ['WhatsApp', phone(r.c.phone)]]
  } else {
    rows = [['Concepto', r.c.concepto || r.c.ref || '—'], ['Registrada el', fl(r.c.created)], ['Valor total', cop(r.total)],
      ['Abono inicial', ab0 ? cop(ab0.val) : 'Sin abono'], ['Comercial', comName(data, r.c.com)], ['Plan de pagos', planTxt], ['Nota', r.c.nota || '—'], ['WhatsApp', phone(r.c.phone)]]
  }

  return (
    <>
      {r.sale && (
        <div className="rounded-md border border-linen bg-white">
          {r.sale.items.map(it => {
            const p = data.products.find(x => x.id === it.pid)
            const up = unitPrice(it.price, r.sale!.pay)
            return (
              <div key={it.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">{p?.name || '—'}</div>
                  <div className="text-xs text-taupe">{p ? p.brand + ' · Talla ' + p.size + ' · ' + p.color + ' · ' + it.qty + ' × ' + cop(up) : ''}</div>
                </div>
                <span className="font-semibold text-ink tabular">{cop(it.qty * up)}</span>
              </div>
            )
          })}
        </div>
      )}
      <Card className="bg-cream px-4 py-1">
        {rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}
      </Card>
      <div className="flex flex-wrap gap-2">
        {r.sale && <Button onClick={() => ui.openDrawer({ type: 'sale', editId: r.sale!.id })}>Editar venta</Button>}
        <Button onClick={goPlan}>Ver plan de pagos</Button>
        {r.saldo > 0 && <Button variant="dark" onClick={goAbono}>Registrar abono</Button>}
      </div>
    </>
  )
}
