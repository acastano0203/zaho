import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Empty } from '../../../components/ui/Display'
import { Button } from '../../../components/ui/Button'
import { IconEdit, IconPlus, IconTrash, IconTruck } from '../../../components/ui/Icons'
import { cop, plural } from '../../../../shared/lib/format'
import { BrandTile, isLight } from './BrandTile'
import { useBrandActions, type useBrandsView } from '../hooks/useBrands'

type Rows = ReturnType<typeof useBrandsView>['rows']

/** Vista de marcas: una tarjeta por marca con su proveedor, inventario y ventas */
export function BrandsGallery({ rows, filtered }: { rows: Rows; filtered?: boolean }) {
  const ui = useUI()
  const { can } = useSession()
  const { remove } = useBrandActions()
  const canCreate = can('proveedores.crear') || can('inventario.crear')
  const canEdit = can('proveedores.editar') || can('inventario.editar')
  const canDelete = can('proveedores.eliminar') || can('inventario.eliminar')

  if (!rows.length && filtered) return <Empty>Ninguna marca coincide con la búsqueda.</Empty>

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ brand: b, sup, refs, units, value, low, sold30, pending }) => {
        const iconBtn = 'inline-flex h-10 w-10 items-center justify-center rounded-md md:h-8 md:w-8 ' +
          (isLight(b.color) ? 'text-ink hover:bg-white/40' : 'text-cream hover:bg-white/15')
        const stats: [string, number][] = [['Referencias', refs], ['Unidades', units], ['Vendidas 30 d', sold30]]
        return (
          <article key={b.id} className="flex min-w-0 flex-col rounded-md border border-linen bg-paper">
            <BrandTile name={b.name} color={b.color}>
              <div className="absolute top-2 right-2 flex gap-1">
                {canEdit && (
                  <button type="button" className={iconBtn} aria-label={'Editar ' + b.name} title="Editar marca"
                    onClick={() => ui.openModal({ type: 'brand', id: b.id })}><IconEdit size={15} /></button>
                )}
                {canDelete && (
                  <button type="button" className={iconBtn} aria-label={'Eliminar ' + b.name} title="Eliminar marca"
                    onClick={() => ui.openModal({ type: 'confirm', title: 'Eliminar ' + b.name, message: 'Solo se puede eliminar si no tiene productos ni proveedor asignado.', onConfirm: () => remove(b.id) })}>
                    <IconTrash size={15} />
                  </button>
                )}
              </div>
            </BrandTile>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex min-w-0 items-center gap-2 text-[13px]">
                <IconTruck size={15} />
                {sup
                  ? <span className="truncate text-ink">Surte <span className="font-semibold">{sup.name}</span></span>
                  : <button type="button" className="text-warn underline underline-offset-4" onClick={() => ui.openModal({ type: 'supplier' })}>Sin proveedor · asignar</button>}
              </div>

              <dl className="grid grid-cols-3 gap-2 border-y border-line py-3">
                {stats.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="truncate text-[10px] uppercase tracking-[0.18em] text-char">{k}</dt>
                    <dd className="font-display text-sm text-ink tabular">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] text-taupe">Inventario al costo</span>
                  <span className="font-semibold text-ink tabular">{cop(value)}</span>
                </div>
                {pending > 0 && sup && can('pedidos.crear')
                  ? <Button size="sm" onClick={() => ui.openModal({ type: 'order', sup: sup.id })}>Pedir {plural(pending, 'ref.', 'refs.')}</Button>
                  : low > 0
                    ? <span className="text-xs text-warn">{low} en stock bajo</span>
                    : <span className="text-xs text-ok">{refs ? 'Stock al día' : 'Sin productos aún'}</span>}
              </div>
            </div>
          </article>
        )
      })}

      {canCreate && !filtered && (
        <button type="button" onClick={() => ui.openModal({ type: 'brand' })}
          className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-sand-dark p-4 text-center text-taupe transition-colors hover:border-char hover:bg-mist hover:text-ink">
          <IconPlus size={22} />
          <span className="text-[13px] font-semibold">Nueva marca</span>
          <span className="text-xs">Queda disponible en inventario, ventas y proveedores</span>
        </button>
      )}
    </div>
  )
}
