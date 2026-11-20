import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useSession } from '../../../store/SessionStore'
import { Button } from '../../../components/ui/Button'
import { Input, Label } from '../../../components/ui/Field'
import { IconPlus, IconX } from '../../../components/ui/Icons'
import { BRAND_COLORS } from '../../../../shared/lib/constants'
import { norm, plural } from '../../../../shared/lib/format'
import { useBrandActions } from '../hooks/useBrands'
import { isLight } from './BrandTile'

interface Props {
  value: string[]
  onChange: (brands: string[]) => void
  /** Proveedor que se está editando (sus marcas no cuentan como ocupadas) */
  supplierId?: string
}

function Swatch({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return (
    <span aria-hidden style={{ background: color }}
      className={'inline-flex shrink-0 items-center justify-center rounded font-display ' +
        (size === 'sm' ? 'h-5 w-5 text-[10px] ' : 'h-9 w-9 text-sm ') + (isLight(color) ? 'text-ink' : 'text-cream')}>
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  )
}

/** Selector de marcas: las elegidas arriba, buscador y creación en línea si no existe */
export function BrandPicker({ value, onChange, supplierId }: Props) {
  const { data } = useApp()
  const { can } = useSession()
  const { save } = useBrandActions()
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [color, setColor] = useState(BRAND_COLORS[data.brands.length % BRAND_COLORS.length])
  const canCreate = can('proveedores.crear') || can('inventario.crear')

  const ownerOf = (b: string) => data.suppliers.find(x => x.id !== supplierId && x.brands.includes(b))
  const prodsOf = (b: string) => data.products.filter(p => p.brand === b).length
  const colorOf = (b: string) => data.brands.find(x => x.name === b)?.color ?? '#8A837C'
  const toggle = (b: string) => onChange(value.includes(b) ? value.filter(x => x !== b) : [...value, b])

  const name = q.trim().replace(/\s+/g, ' ')
  const nq = norm(name)
  const list = data.brands.filter(b => !nq || norm(b.name).includes(nq))
  const exact = data.brands.find(b => norm(b.name) === nq)

  const create = () => {
    if (!name || !save({ name, color })) return
    onChange([...value, name])
    setQ('')
    setCreating(false)
    setColor(BRAND_COLORS[(data.brands.length + 1) % BRAND_COLORS.length])
  }

  const onEnter = () => {
    if (exact) { if (!ownerOf(exact.name)) toggle(exact.name); setQ('') }
    else if (name && canCreate) creating ? create() : setCreating(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Marcas que surte</Label>
        <span className="text-xs text-taupe">{value.length ? plural(value.length, 'elegida', 'elegidas') : 'Elige al menos una'}</span>
      </div>

      {/* Elegidas */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(b => (
            <span key={b} className="inline-flex h-9 items-center gap-2 rounded-md border border-char bg-char py-1 pr-1 pl-1.5 text-xs text-cream">
              <Swatch name={b} color={colorOf(b)} size="sm" />
              {b}
              <button type="button" onClick={() => toggle(b)} aria-label={'Quitar ' + b}
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white/15"><IconX size={13} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-linen">
        <div className="border-b border-linen bg-mist p-2">
          <Input type="search" placeholder={canCreate ? 'Busca o escribe una marca nueva' : 'Buscar marca'} value={q} aria-label="Buscar marca"
            onChange={e => { setQ(e.target.value); setCreating(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } }} />
        </div>

        {/* Existentes */}
        <ul className="max-h-56 overflow-y-auto">
          {list.map(b => {
            const owner = ownerOf(b.name)
            const on = value.includes(b.name)
            const n = prodsOf(b.name)
            return (
              <li key={b.id} className="border-b border-line last:border-b-0">
                <button type="button" disabled={!!owner} onClick={() => toggle(b.name)} aria-pressed={on}
                  className={'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ' + (owner ? 'opacity-55' : on ? 'bg-cream' : 'hover:bg-mist')}>
                  <Swatch name={b.name} color={b.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{b.name}</span>
                    <span className="block truncate text-xs text-taupe">
                      {owner ? 'La surte ' + owner.name : n ? plural(n, 'producto', 'productos') + ' en inventario' : 'Sin productos aún'}
                    </span>
                  </span>
                  <span aria-hidden className={'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ' +
                    (on ? 'border-char bg-char text-cream' : 'border-stone text-transparent')}>✓</span>
                </button>
              </li>
            )
          })}
          {!list.length && !name && <li className="px-3 py-4 text-center text-xs text-taupe">Aún no hay marcas. Escribe el nombre de la primera.</li>}
        </ul>

        {/* Crear la que no existe */}
        {name && !exact && (
          canCreate ? (
            creating ? (
              <div className="flex flex-col gap-3 border-t border-linen bg-paper p-3">
                <div className="flex items-center gap-3">
                  <Swatch name={name} color={color} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{name}</span>
                    <span className="block text-xs text-taupe">Marca nueva · queda disponible en inventario y ventas</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Color de la marca">
                  {BRAND_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} aria-pressed={color === c} aria-label={'Color ' + c}
                      className={'h-9 w-9 rounded-md border-2 md:h-7 md:w-7 ' + (color === c ? 'border-gold' : 'border-transparent')} style={{ background: c }} />
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button>
                  <Button size="sm" variant="dark" onClick={create}><IconPlus size={14} />Crear y agregar</Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCreating(true)}
                className="flex w-full items-center gap-3 border-t border-dashed border-sand-dark px-3 py-2.5 text-left hover:bg-mist">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-dashed border-stone text-taupe"><IconPlus size={16} /></span>
                <span className="min-w-0 text-[13px] text-ink">Crear la marca <span className="font-semibold">“{name}”</span></span>
              </button>
            )
          ) : <p className="border-t border-linen px-3 py-2.5 text-xs text-taupe">No existe “{name}”. Pide a un administrador que la cree.</p>
        )}
      </div>
    </div>
  )
}
