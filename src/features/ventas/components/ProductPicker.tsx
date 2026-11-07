import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Button } from '../../../components/ui/Button'
import { Chips } from '../../../components/ui/Chip'
import { Dot } from '../../../components/ui/Display'
import { Input, Label } from '../../../components/ui/Field'
import { IconPlus } from '../../../components/ui/Icons'
import { BRANDS, PROD_ST, REC } from '../../../lib/constants'
import { cop, norm } from '../../../lib/format'
import { productStatus, unitPrice } from '../../../lib/finance'
import type { PayMode, Product } from '../../../types'

interface Props {
  q: string
  brand: string
  pay: PayMode
  availableOf: (pid: string) => number
  onQ: (v: string) => void
  onBrand: (v: string) => void
  onAdd: (p: Product) => void
}

export function ProductPicker({ q, brand, pay, availableOf, onQ, onBrand, onAdd }: Props) {
  const { data } = useApp()
  const ui = useUI()
  const nq = norm(q)
  const results = data.products
    .filter(p => (!nq || norm(p.name + ' ' + p.code + ' ' + p.color).includes(nq)) && (!brand || p.brand === brand))
    .sort((a, b) => Number(availableOf(b.id) > 0) - Number(availableOf(a.id) > 0))
    .slice(0, 12)

  return (
    <div className="flex flex-col gap-2">
      <Label>1 · Producto</Label>
      <Input placeholder="Buscar por nombre o código (ej. jean, ZH-B101)" value={q} onChange={e => onQ(e.target.value)} aria-label="Buscar producto" />
      <Chips scroll value={brand} onChange={onBrand} options={[{ value: '', label: 'Todas' }, ...BRANDS.map(b => ({ value: b, label: b }))]} />
      <Button size="sm" className="self-start" onClick={() => ui.openModal({ type: 'product', onCreated: p => { if (p.stock > 0) onAdd(p) } })}>
        <IconPlus size={14} />Crear producto nuevo
      </Button>
      <div className="max-h-72 overflow-y-auto rounded-md border border-linen bg-white" aria-label="Resultados">
        {results.map(p => {
          const av = availableOf(p.id)
          const up = unitPrice(p.price, pay), ut = up - p.cost
          return (
            <button key={p.id} type="button" onClick={() => onAdd(p)} aria-label={'Agregar ' + p.name + ' talla ' + p.size}
              className="grid min-h-[52px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-mist">
              <span className="truncate font-semibold text-ink">{p.name}</span>
              <span className="font-semibold text-ink tabular">{cop(up)}</span>
              <span className="truncate text-xs text-taupe">{p.brand} · Talla {p.size} · {p.color} · {p.code}</span>
              <span className="flex items-center justify-end gap-1.5 text-xs text-taupe">
                <Dot color={PROD_ST[productStatus({ ...p, stock: av })].color} />
                {av > 0 ? av + ' en ' + (p.wh === 'Local ZAHO' ? 'local' : 'bodega') : 'Agotado'}
              </span>
              <span className="col-span-2 text-xs text-util">
                Costo {cop(p.cost)} · Utilidad {cop(ut)} ({up ? Math.round((ut / up) * 100) : 0}%){pay === 'credito' ? ' · precio con recargo ' + REC + '%' : ''}
              </span>
            </button>
          )
        })}
        {results.length === 0 && <p className="p-4 text-center text-[13px] text-taupe">Ningún producto coincide.</p>}
      </div>
    </div>
  )
}
