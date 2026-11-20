import { useMemo, useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { Chips } from '../../../components/ui/Chip'
import { Input } from '../../../components/ui/Field'
import { IconMinus, IconPlus } from '../../../components/ui/Icons'
import { norm, plural } from '../../../../shared/lib/format'
import { inWarehouse, lineProduct, skuInOpenOrder, skuOf } from '../../../../domain/rules/pedidos'
import type { OrderLine, Product, Supplier } from '../../../../domain/entities'

/** Cantidad con − / + y escritura directa */
export function QtyField({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const btn = 'inline-flex h-10 w-9 shrink-0 items-center justify-center text-ink disabled:opacity-30 md:h-8 md:w-8'
  return (
    <div className={'inline-flex items-center rounded-md border ' + (value > 0 ? 'border-char bg-white' : 'border-sand-dark')}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={'Menos ' + label}><IconMinus size={14} /></button>
      <input inputMode="numeric" aria-label={'Cantidad de ' + label} value={value || ''} placeholder="0"
        onChange={e => onChange(Math.min(9999, Number(e.target.value.replace(/\D/g, '')) || 0))}
        onFocus={e => e.target.select()}
        className={'h-10 w-11 min-w-0 bg-transparent text-center text-base tabular outline-none placeholder:text-stone md:h-8 md:text-sm ' + (value > 0 ? 'font-bold text-ink' : 'text-taupe')} />
      <button type="button" className={btn} onClick={() => onChange(value + 1)} aria-label={'Más ' + label}><IconPlus size={14} /></button>
    </div>
  )
}

interface Props {
  supplier: Supplier
  /** Bodega a la que llega el pedido */
  wh: string
  lines: OrderLine[]
  onChange: (lines: OrderLine[]) => void
  /** Pedido que se está editando (sus productos no cuentan como "en otro pedido") */
  orderId?: string
}

interface Ref { sku: string; base: Product; here?: Product; total: number }

/** Una fila por referencia de las marcas del proveedor, con la cantidad a pedir */
export function OrderProductList({ supplier, wh, lines, onChange, orderId }: Props) {
  const { data } = useApp()
  const [brand, setBrand] = useState('')
  const [q, setQ] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const refs = useMemo<Ref[]>(() => {
    const m = new Map<string, Ref>()
    for (const p of data.products) {
      if (!supplier.brands.includes(p.brand)) continue
      const k = skuOf(p)
      const r = m.get(k) ?? { sku: k, base: p, total: 0 }
      r.total += p.stock
      m.set(k, r)
    }
    return [...m.values()].map(r => ({ ...r, here: inWarehouse(data, r.base, wh) }))
  }, [data, supplier.brands, wh])

  const lowOf = (r: Ref) => (r.here ? r.here.stock < r.here.min : r.total < r.base.min)
  const lineOf = (r: Ref) => lines.find(l => { const p = lineProduct(data, l.pid); return !!p && skuOf(p) === r.sku })
  const setQty = (r: Ref, qty: number) => {
    const rest = lines.filter(l => l !== lineOf(r))
    onChange(qty > 0 ? [...rest, { pid: (r.here ?? r.base).id, qty }] : rest)
  }

  const sorted = refs.slice().sort((a, b) => Number(lowOf(b)) - Number(lowOf(a)) ||
    a.base.brand.localeCompare(b.base.brand, 'es') || a.base.name.localeCompare(b.base.name, 'es') || a.base.size.localeCompare(b.base.size, 'es', { numeric: true }))
  const nq = norm(q)
  const list = sorted.filter(r => (!brand || r.base.brand === brand) && (!onlyLow || lowOf(r) || !!lineOf(r)) &&
    (!nq || norm(r.base.name + ' ' + r.base.code + ' ' + r.base.color + ' ' + r.base.size).includes(nq)))
  const nLow = refs.filter(lowOf).length
  const units = lines.reduce((a, l) => a + l.qty, 0)

  if (!refs.length) return (
    <p className="rounded-md border border-dashed border-sand p-4 text-center text-[13px] text-taupe">
      {supplier.name} surte {supplier.brands.join(', ')}, pero aún no hay productos de {supplier.brands.length === 1 ? 'esa marca' : 'esas marcas'} en inventario. Créalos en Inventario para poder pedirlos.
    </p>
  )

  const row = (r: Ref) => {
    const qty = lineOf(r)?.qty ?? 0
    const p = r.base
    const stock = r.here?.stock ?? 0
    const min = r.here?.min ?? p.min
    const busy = skuInOpenOrder(data, p, orderId)
    return (
      <li key={r.sku} className={'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2 first:border-t-0 ' + (qty > 0 ? 'bg-cream' : '')}>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{p.name} <span className="font-normal text-taupe">· T{p.size} · {p.color}</span></div>
          <div className="truncate text-xs text-taupe">
            {supplier.brands.length > 1 && p.brand + ' · '}{p.code} ·{' '}
            <span className={stock <= 0 ? 'font-semibold text-bad' : stock < min ? 'font-semibold text-warn' : ''}>en {wh || 'bodega'}: {stock} / mín {min}</span>
            {r.total !== stock && <span> · total {r.total}</span>}
            {busy && <span className="text-stone"> · ya está en otro pedido</span>}
          </div>
        </div>
        <QtyField value={qty} onChange={n => setQty(r, n)} label={p.name + ' talla ' + p.size} />
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {supplier.brands.length > 1 && (
        <Chips value={brand} onChange={setBrand} options={[{ value: '', label: 'Todas' }, ...supplier.brands.map(b => ({ value: b, label: b }))]} />
      )}
      <div className="flex gap-2">
        <Input type="search" placeholder="Buscar producto, código, color o talla" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar producto" />
        {nLow > 0 && (
          <button type="button" onClick={() => setOnlyLow(!onlyLow)} aria-pressed={onlyLow}
            className={'h-11 shrink-0 rounded-md border px-3 text-xs whitespace-nowrap md:h-10 ' + (onlyLow ? 'border-char bg-char text-cream' : 'border-stone text-char hover:bg-cream')}>
            Bajo mínimo · {nLow}
          </button>
        )}
      </div>

      <ul className="max-h-[42vh] overflow-y-auto rounded-md border border-linen bg-white">
        {list.map(row)}
        {!list.length && <li className="p-4 text-center text-[13px] text-taupe">Ningún producto coincide.</li>}
      </ul>

      <div className="flex items-center justify-between text-[13px]">
        <span className="text-taupe">{plural(refs.length, 'referencia', 'referencias')} de {supplier.brands.join(', ')}</span>
        <span className={units ? 'font-semibold text-ink' : 'text-taupe'}>
          {units ? plural(lines.length, 'referencia', 'referencias') + ' · ' + units + ' und' : 'Nada por pedir aún'}
        </span>
      </div>
    </div>
  )
}
