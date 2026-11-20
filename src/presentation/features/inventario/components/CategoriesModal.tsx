import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Field'
import { IconEdit, IconPlus, IconTrash } from '../../../components/ui/Icons'
import { plural } from '../../../../shared/lib/format'
import { useCategoryActions } from '../hooks/useCategories'

/** Administrar categorías: crear, renombrar y eliminar (si no tienen productos) */
export function CategoriesModal() {
  const { data } = useApp()
  const ui = useUI()
  const { can } = useSession()
  const { save, remove } = useCategoryActions()
  const [nuevo, setNuevo] = useState('')
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const canCreate = can('inventario.crear') || can('inventario.editar')
  const canEdit = can('inventario.editar')
  const canDelete = can('inventario.eliminar')

  const count = (name: string) => data.products.filter(p => p.cat === name).length
  const units = (name: string) => data.products.filter(p => p.cat === name).reduce((a, p) => a + p.stock, 0)
  const add = () => { if (save({ name: nuevo })) setNuevo('') }
  const rename = () => { if (edit && save(edit)) setEdit(null) }
  const sorted = data.categories.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return (
    <Modal kicker="Inventario" title="Categorías" onClose={ui.closeModal}>
      {canCreate && (
        <div className="flex gap-2">
          <Input placeholder="Nueva categoría, ej. Zapatos" value={nuevo} maxLength={30} aria-label="Nueva categoría"
            onChange={e => setNuevo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <Button variant="dark" className="shrink-0" onClick={add}><IconPlus size={16} />Agregar</Button>
        </div>
      )}

      <ul className="rounded-md border border-linen bg-white">
        {sorted.map(c => {
          const n = count(c.name)
          if (edit?.id === c.id) return (
            <li key={c.id} className="flex gap-2 border-t border-line p-2 first:border-t-0">
              <Input autoFocus value={edit.name} maxLength={30} aria-label={'Nuevo nombre de ' + c.name}
                onChange={e => setEdit({ ...edit, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') { e.stopPropagation(); setEdit(null) } }} />
              <Button size="sm" variant="dark" className="md:h-10" onClick={rename}>Guardar</Button>
              <Button size="sm" variant="ghost" className="md:h-10" onClick={() => setEdit(null)}>Cancelar</Button>
            </li>
          )
          return (
            <li key={c.id} className="flex items-center gap-2 border-t border-line px-3 py-2 first:border-t-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{c.name}</span>
                <span className="block text-xs text-taupe">{n ? plural(n, 'producto', 'productos') + ' · ' + units(c.name) + ' und' : 'Sin productos'}</span>
              </span>
              {confirm === c.id ? (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="text-bad">¿Eliminar?</span>
                  <Button size="sm" variant="danger" onClick={() => { remove(c.id); setConfirm(null) }}>Sí</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>No</Button>
                </span>
              ) : (
                <>
                  {canEdit && <Button size="sm" variant="ghost" className="md:w-8 md:px-0" aria-label={'Renombrar ' + c.name} title="Renombrar"
                    onClick={() => setEdit({ id: c.id, name: c.name })}><IconEdit size={15} /></Button>}
                  {canDelete && <Button size="sm" variant="ghost" className="text-bad md:w-8 md:px-0" aria-label={'Eliminar ' + c.name}
                    disabled={n > 0} title={n ? 'Tiene productos: cámbialos de categoría primero' : 'Eliminar'}
                    onClick={() => setConfirm(c.id)}><IconTrash size={15} /></Button>}
                </>
              )}
            </li>
          )
        })}
        {!sorted.length && <li className="p-4 text-center text-[13px] text-taupe">Aún no hay categorías.</li>}
      </ul>
      <p className="text-xs text-taupe">Si renombras una categoría, sus productos quedan con el nombre nuevo. Solo se pueden eliminar las que no tienen productos.</p>

      <ModalActions><Button onClick={ui.closeModal}>Cerrar</Button></ModalActions>
    </Modal>
  )
}
