import { Card } from '../../../components/ui/Display'
import { cop } from '../../../lib/format'
import type { useInventoryList } from '../hooks/useInventory'

type B = ReturnType<typeof useInventoryList>['bodegas'][number]

export function WarehouseCards({ bodegas }: { bodegas: B[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {bodegas.map(b => (
        <Card key={b.name}>
          <span className="text-[11px] uppercase tracking-[0.22em]">{b.name}</span>
          <span className="font-display text-lg text-ink tabular">{b.units} und</span>
          <span className="text-taupe">{b.refs} referencias · {b.out} agotadas</span>
          <div className="mt-2.5 flex justify-between border-t border-sand pt-2.5"><span className="text-taupe">Valor al costo</span><span className="font-semibold text-ink tabular">{cop(b.cost)}</span></div>
          <div className="flex justify-between"><span className="text-taupe">Valor a precio de venta</span><span className="font-semibold text-ink tabular">{cop(b.sale)}</span></div>
        </Card>
      ))}
    </div>
  )
}
