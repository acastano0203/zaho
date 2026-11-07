import { useApp } from '../../../store/AppStore'
import { Card, Empty, Row, Stepper } from '../../../components/ui/Display'
import { Label } from '../../../components/ui/Field'
import { IconX } from '../../../components/ui/Icons'
import { REC } from '../../../lib/constants'
import { cop } from '../../../lib/format'
import { saleBase, saleCost, saleTotal, unitPrice } from '../../../lib/finance'
import type { PayMode, SaleItem } from '../../../types'

interface Props {
  items: SaleItem[]
  pay: PayMode
  availableOf: (pid: string) => number
  onInc: (pid: string) => void
  onDec: (pid: string) => void
  onRemove: (pid: string) => void
}

export function SaleItems({ items, pay, availableOf, onInc, onDec, onRemove }: Props) {
  const { data } = useApp()
  if (!items.length) {
    return (
      <div className="flex flex-col gap-2">
        <Label>2 · En esta venta</Label>
        <Empty>Toca un producto de la lista para agregarlo. El stock se descuenta al registrar la venta.</Empty>
      </div>
    )
  }
  const total = saleTotal({ items, pay }), base = saleBase({ items }), cost = saleCost({ items }, data.products)
  const util = total - cost

  return (
    <div className="flex flex-col gap-2">
      <Label>2 · En esta venta</Label>
      <div className="rounded-md border border-linen bg-white">
        {items.map(i => {
          const p = data.products.find(x => x.id === i.pid)!
          const up = unitPrice(i.price, pay)
          return (
            <div key={i.pid} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-2.5 border-t border-line px-3 py-2 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto_96px_32px]">
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{p.name}</div>
                <div className="text-xs text-taupe">
                  {p.brand} · T{p.size} · {p.color} · {cop(up)} c/u · quedan {availableOf(p.id)}
                  <span className="sm:hidden"> · {cop(i.qty * up)}</span>
                </div>
              </div>
              <Stepper small value={i.qty} onDec={() => onDec(i.pid)} onInc={() => onInc(i.pid)} />
              <span className="hidden text-right font-semibold text-ink tabular sm:block">{cop(i.qty * up)}</span>
              <button type="button" onClick={() => onRemove(i.pid)} aria-label={'Quitar ' + p.name}
                className="inline-flex h-10 w-8 items-center justify-center rounded-md hover:bg-cream"><IconX size={15} /></button>
            </div>
          )
        })}
      </div>
      <Card className="px-4 py-1">
        <Row label="Precio de lista" value={cop(base)} />
        {pay === 'credito' && <Row label={'Recargo por crédito (' + REC + '%)'} value={'+' + cop(total - base)} />}
        <Row label="Total a cobrar" value={cop(total)} />
        <Row label="Costo de la mercancía" value={cop(cost)} />
        <Row label="Utilidad" value={cop(util) + ' · ' + (total ? Math.round((util / total) * 100) : 0) + '%'} />
      </Card>
    </div>
  )
}
