import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select } from '../../../components/ui/Field'
import { IconAdjust } from '../../../components/ui/Icons'
import { BRANDS, CATS, SIZES, WAREHOUSES } from '../../../lib/constants'
import { emptyFilters, type InvFilters } from '../hooks/useInventory'

const all = (label: string, xs: string[]) => [{ value: '', label }, ...xs.map(x => ({ value: x, label: x }))]

export function InventoryFilters({ value, onChange }: { value: InvFilters; onChange: (f: InvFilters) => void }) {
  const [open, setOpen] = useState(false)
  const set = (k: keyof InvFilters) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value })
  const active = Object.entries(value).filter(([k, v]) => k !== 'q' && v).length

  return (
    <div className="mb-3.5 flex flex-col gap-2.5">
      <div className="flex gap-2">
        <Field label="Buscar" className="flex-1"><Input placeholder="Nombre o código" value={value.q} onChange={set('q')} /></Field>
        <Button className="self-end lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
          <IconAdjust size={16} />Filtros{active ? ' · ' + active : ''}
        </Button>
      </div>
      <div className={(open ? 'grid' : 'hidden') + ' grid-cols-2 items-end gap-2.5 sm:grid-cols-3 lg:grid lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]'}>
        <Field label="Marca"><Select value={value.brand} onChange={set('brand')} options={all('Todas', BRANDS)} /></Field>
        <Field label="Bodega"><Select value={value.wh} onChange={set('wh')} options={all('Todas', WAREHOUSES)} /></Field>
        <Field label="Categoría"><Select value={value.cat} onChange={set('cat')} options={all('Todas', CATS)} /></Field>
        <Field label="Talla"><Select value={value.size} onChange={set('size')} options={all('Todas', SIZES)} /></Field>
        <Field label="Estado">
          <Select value={value.st} onChange={set('st')} options={[{ value: '', label: 'Todos' }, { value: 'ok', label: 'Disponible' }, { value: 'baj', label: 'Stock bajo' }, { value: 'ago', label: 'Agotado' }]} />
        </Field>
        <Button variant="ghost" onClick={() => onChange(emptyFilters)}>Limpiar</Button>
      </div>
    </div>
  )
}
