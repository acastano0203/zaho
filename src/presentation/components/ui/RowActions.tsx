import type { ReactNode } from 'react'
import { Button } from './Button'
import { IconEdit, IconTrash } from './Icons'

interface Props {
  name: string
  onEdit?: () => void
  onDelete?: () => void
  /** Acciones adicionales antes de editar/eliminar */
  children?: ReactNode
}

/** Botones estándar de fila: Modificar y Eliminar */
export function RowActions({ name, onEdit, onDelete, children }: Props) {
  return (
    <>
      {children}
      {onEdit && (
        <Button size="sm" variant="ghost" onClick={onEdit} aria-label={'Modificar ' + name} title="Modificar" className="md:w-8 md:px-0">
          <IconEdit size={15} /><span className="md:hidden">Modificar</span>
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="ghost" onClick={onDelete} aria-label={'Eliminar ' + name} title="Eliminar" className="text-bad md:w-8 md:px-0">
          <IconTrash size={15} /><span className="md:hidden">Eliminar</span>
        </Button>
      )}
    </>
  )
}
