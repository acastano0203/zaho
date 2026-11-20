import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Button } from '../../../components/ui/Button'
import { Dot, Empty, Pill } from '../../../components/ui/Display'
import { WaIcon } from '../../../components/ui/Icons'
import { C } from '../../../../shared/lib/constants'
import { suggestQty } from '../../../../domain/rules/finance'
import type { usePedidosView } from '../hooks/usePedidos'

type G = ReturnType<typeof usePedidosView>['groups'][number]

export function SuggestedOrders({ groups }: { groups: G[] }) {
  const ui = useUI()
  const { can } = useSession()
  if (!groups.length) return <Empty>Nada por pedir: todo el inventario está sobre el stock mínimo o ya tiene pedido en camino.</Empty>
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {groups.map(({ sup, products }) => (
        <div key={sup.id} className="flex flex-col gap-2.5 rounded-md border border-linen bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{sup.name}</span>
            <Pill color={C.warn}>{products.length} {products.length === 1 ? 'referencia' : 'referencias'}</Pill>
          </div>
          <div>
            {products.map(p => (
              <div key={p.id} className="flex justify-between gap-2.5 border-t border-linen py-1.5 text-[13px]">
                <span className="flex min-w-0 items-center gap-2"><Dot color={p.stock <= 0 ? C.bad : C.warn} /><span className="truncate">{p.name} · T{p.size} · {p.color}</span></span>
                <span className="whitespace-nowrap tabular">{p.stock}/{p.min} → pedir {suggestQty(p)}</span>
              </div>
            ))}
          </div>
          {can('pedidos.crear') && <Button variant="dark" onClick={() => ui.openModal({ type: 'order', sup: sup.id })}><WaIcon size={16} />Hacer pedido</Button>}
        </div>
      ))}
    </div>
  )
}
