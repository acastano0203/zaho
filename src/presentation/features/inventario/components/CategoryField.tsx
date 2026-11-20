import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useSession } from '../../../store/SessionStore'
import { Button } from '../../../components/ui/Button'
import { Input, Label, Select } from '../../../components/ui/Field'
import { IconPlus } from '../../../components/ui/Icons'
import { cleanCategory } from '../services/categoriesService'
import { useCategoryActions } from '../hooks/useCategories'

/** Selector de categoría con creación en línea ("+ Nueva") */
export function CategoryField({ value, onChange }: { value: string; onChange: (cat: string) => void }) {
  const { data } = useApp()
  const { can } = useSession()
  const { save } = useCategoryActions()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const canCreate = can('inventario.crear') || can('inventario.editar')

  const create = () => {
    const n = cleanCategory(name)
    if (!save({ name: n })) return
    onChange(n)
    setName('')
    setAdding(false)
  }

  if (adding) return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label>Nueva categoría</Label>
      <div className="flex gap-1.5">
        <Input autoFocus placeholder="Ej. Zapatos" value={name} maxLength={30} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); create() } if (e.key === 'Escape') { e.stopPropagation(); setAdding(false) } }} />
        <Button variant="dark" className="shrink-0 px-3" onClick={create} aria-label="Crear categoría">Crear</Button>
      </div>
      <button type="button" className="self-start text-xs text-taupe underline underline-offset-4" onClick={() => setAdding(false)}>Cancelar</button>
    </div>
  )

  const options = data.categories.map(c => c.name)
  // Un producto viejo puede tener una categoría que ya no está en la lista
  if (value && !options.includes(value)) options.unshift(value)

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <Label>Categoría</Label>
        {canCreate && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs text-char underline-offset-4 hover:underline">
            <IconPlus size={12} />Nueva
          </button>
        )}
      </span>
      <Select aria-label="Categoría" value={value} onChange={e => onChange(e.target.value)}
        options={options.length ? options : [{ value: '', label: 'Crea una categoría' }]} />
    </div>
  )
}
