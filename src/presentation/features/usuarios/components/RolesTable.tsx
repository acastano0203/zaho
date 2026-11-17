import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { RowActions } from '../../../components/ui/RowActions'
import { Empty, Pill } from '../../../components/ui/Display'
import { C } from '../../../../shared/lib/constants'
import { plural } from '../../../../shared/lib/format'
import type { Rol } from '../../../../domain/entities'
import { MODULOS, TODOS_LOS_PERMISOS, clavePermiso } from '../../../../domain/rules/permisos'
import { useAccessActions, useAccessData } from '../hooks/useAccess'

/** Resumen corto: módulos a los que el rol tiene acceso */
const modulosDe = (r: Rol) =>
  r.esAdmin ? 'Todos los módulos' : MODULOS.filter(m => r.permisos.includes(clavePermiso(m.key, 'ver'))).map(m => m.label).join(', ') || 'Ninguno'

export function RolesTable() {
  const ui = useUI()
  const { roles, usuariosPorRol, loading, error } = useAccessData()
  const { eliminarRol } = useAccessActions()
  const { can } = useSession()

  if (error) return <Empty>No se pudieron cargar los roles: {error}</Empty>
  if (loading && !roles.length) return <Empty>Cargando roles…</Empty>

  const columns: Column<Rol>[] = [
    {
      key: 'name', header: 'Rol', width: 'minmax(180px,1.2fr)', primary: true,
      render: r => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{r.nombre}</span>
          {r.descripcion && <span className="truncate text-xs text-taupe">{r.descripcion}</span>}
        </span>
      ),
    },
    { key: 'type', header: 'Tipo', width: '110px', badge: true, render: r => <Pill color={r.esSistema ? C.ink : C.stone}>{r.esSistema ? 'Sistema' : 'Personal'}</Pill> },
    { key: 'mods', header: 'Acceso a', width: 'minmax(220px,2fr)', render: r => <span className="text-[13px] text-char">{modulosDe(r)}</span> },
    {
      key: 'perms', header: 'Permisos', width: '110px', align: 'right',
      render: r => <span className="tabular">{(r.esAdmin ? TODOS_LOS_PERMISOS.length : r.permisos.length) + ' / ' + TODOS_LOS_PERMISOS.length}</span>,
    },
    { key: 'users', header: 'Usuarios', width: '100px', align: 'right', render: r => <span className="tabular">{usuariosPorRol(r.id)}</span> },
  ]

  return (
    <DataTable exportar={{ title: 'Roles' }} columns={columns} rows={roles} rowKey={r => r.id} minWidth={860} actionsWidth="80px"
      actions={r => (
        <RowActions name={r.nombre}
          onEdit={can('usuarios.editar') ? () => ui.openModal({ type: 'role', id: r.id }) : undefined}
          onDelete={r.esSistema || !can('usuarios.eliminar') ? undefined : () => ui.openModal({
            type: 'confirm', title: 'Eliminar el rol ' + r.nombre,
            message: usuariosPorRol(r.id)
              ? 'Tiene ' + plural(usuariosPorRol(r.id), 'usuario asignado', 'usuarios asignados') + '. Cámbialos de rol antes de eliminarlo.'
              : 'Esta acción no se puede deshacer.',
            onConfirm: () => { void eliminarRol(r.id) },
          })} />
      )} />
  )
}
