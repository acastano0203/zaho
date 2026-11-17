import { useUI } from '../../../store/UIStore'
import { useApp } from '../../../store/AppStore'
import { useSession } from '../../../store/SessionStore'
import { DataTable, type Column } from '../../../components/ui/DataTable'
import { RowActions } from '../../../components/ui/RowActions'
import { Button } from '../../../components/ui/Button'
import { Empty, Pill } from '../../../components/ui/Display'
import { IconKey, IconPower } from '../../../components/ui/Icons'
import { C } from '../../../../shared/lib/constants'
import { fd, today } from '../../../../shared/lib/dates'
import { phone } from '../../../../shared/lib/format'
import type { Usuario } from '../../../../domain/entities'
import { modoDemo, useAccessActions, useAccessData } from '../hooks/useAccess'

/** Fecha y hora LOCAL del último acceso: "hoy · 9:41 a. m." / "7 nov · 6:05 p. m." */
function lastAccess(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  return (day === today() ? 'hoy' : fd(day)) + ' · ' + time
}

export function UsersTable() {
  const ui = useUI()
  const { data } = useApp()
  const { usuarios, rolDe, loading, error } = useAccessData()
  const { estado, eliminar } = useAccessActions()
  const { sesion, can } = useSession()
  const yo = sesion?.usuario.id
  const demo = modoDemo()

  if (error) return <Empty>No se pudieron cargar los usuarios: {error}</Empty>
  if (loading && !usuarios.length) return <Empty>Cargando usuarios…</Empty>
  if (!usuarios.length) return <Empty>Aún no hay usuarios.</Empty>

  const comName = (id: string | null) => data.comerciales.find(c => c.id === id)?.name

  const columns: Column<Usuario>[] = [
    {
      key: 'name', header: 'Usuario', width: 'minmax(200px,1.5fr)', primary: true,
      render: u => (
        <span className="flex min-w-0 flex-col">
          <span className={'truncate font-semibold ' + (u.activo ? 'text-ink' : 'text-stone line-through')}>
            {u.nombre}{u.id === yo && <span className="ml-1.5 text-[11px] font-normal text-taupe">(tú)</span>}
          </span>
          <span className="truncate text-xs text-taupe">{u.email}</span>
        </span>
      ),
    },
    {
      key: 'st', header: 'Estado', width: '110px', badge: true,
      render: u => <Pill color={u.activo ? C.ok : C.stone}>{u.activo ? 'Activo' : 'Inactivo'}</Pill>,
    },
    {
      key: 'rol', header: 'Rol', width: 'minmax(130px,1fr)',
      render: u => {
        const r = rolDe(u.rolId)
        return r ? <Pill color={r.esAdmin ? C.ink : C.warn}>{r.nombre}</Pill> : <span className="text-bad">Sin rol</span>
      },
    },
    { key: 'phone', header: 'Teléfono', width: '120px', render: u => <span className="text-taupe tabular">{phone(u.telefono)}</span> },
    { key: 'com', header: 'Comercial', width: 'minmax(120px,1fr)', render: u => <span className="text-taupe">{comName(u.comercialId) ?? '—'}</span> },
    {
      key: 'last', header: 'Último acceso', width: '150px',
      render: u => <span className="text-taupe tabular">{u.ultimoAcceso ? lastAccess(u.ultimoAcceso) : 'Nunca'}</span>,
    },
  ]

  return (
    <DataTable exportar={{ title: 'Usuarios' }} columns={columns} rows={usuarios} rowKey={u => u.id} minWidth={900} actionsWidth={demo ? '124px' : '158px'}
      actions={u => (
        <RowActions name={u.nombre}
          onEdit={can('usuarios.editar') ? () => ui.openModal({ type: 'user', id: u.id }) : undefined}
          onDelete={can('usuarios.eliminar') && u.id !== yo ? () => ui.openModal({
            type: 'confirm', title: 'Eliminar a ' + u.nombre, cta: 'Eliminar usuario',
            message: 'Se borra su cuenta y ya no podrá iniciar sesión. Sus ventas, abonos y demás registros se conservan, pero quedan sin autor. Esta acción no se puede deshacer. Si solo quieres quitarle el acceso por un tiempo, mejor desactívalo.',
            onConfirm: () => { void eliminar(u.id) },
          }) : undefined}>
          {!demo && (can('usuarios.editar') || u.id === yo) && (
            <Button size="sm" variant="ghost" title="Cambiar contraseña" aria-label={'Cambiar contraseña de ' + u.nombre}
              className="md:w-8 md:px-0" onClick={() => ui.openModal({ type: 'userPassword', id: u.id })}>
              <IconKey size={15} /><span className="md:hidden">Contraseña</span>
            </Button>
          )}
          {can('usuarios.eliminar') && u.id !== yo && <Button size="sm" variant="ghost" title={u.activo ? 'Desactivar' : 'Activar'} aria-label={(u.activo ? 'Desactivar a ' : 'Activar a ') + u.nombre}
            className={'md:w-8 md:px-0 ' + (u.activo ? 'text-bad' : 'text-ok')}
            onClick={() => u.activo
              ? ui.openModal({
                type: 'confirm', title: 'Desactivar a ' + u.nombre, cta: 'Desactivar',
                message: 'No podrá iniciar sesión. Sus ventas, abonos y registros se conservan. Puedes activarlo de nuevo cuando quieras.',
                onConfirm: () => { void estado(u.id, false) },
              })
              : void estado(u.id, true)}>
            <IconPower size={15} /><span className="md:hidden">{u.activo ? 'Desactivar' : 'Activar'}</span>
          </Button>}
        </RowActions>
      )} />
  )
}
