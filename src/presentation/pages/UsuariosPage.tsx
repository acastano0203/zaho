import { useState } from 'react'
import { useUI } from '../store/UIStore'
import { useSession } from '../store/SessionStore'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Segmented } from '../components/ui/Segmented'
import { KpiCard } from '../components/ui/Display'
import { IconPlus } from '../components/ui/Icons'
import { UsersTable } from '../features/usuarios/components/UsersTable'
import { RolesTable } from '../features/usuarios/components/RolesTable'
import { modoDemo, useAccessData } from '../features/usuarios/hooks/useAccess'

type Tab = 'usuarios' | 'roles'

export default function UsuariosPage() {
  const ui = useUI()
  const { can } = useSession()
  const [tab, setTab] = useState<Tab>('usuarios')
  const { usuarios, roles, admins } = useAccessData()
  const activos = usuarios.filter(u => u.activo).length

  return (
    <>
      <PageHeader title="Usuarios" sub={modoDemo() ? 'Modo demo: los usuarios se guardan en este navegador' : 'Cuentas de acceso y permisos por rol'}
        actions={!can('usuarios.crear') ? undefined : tab === 'usuarios'
          ? <Button variant="dark" onClick={() => ui.openModal({ type: 'user' })}><IconPlus size={16} />Crear usuario</Button>
          : <Button variant="dark" onClick={() => ui.openModal({ type: 'role' })}><IconPlus size={16} />Crear rol</Button>} />

      <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <KpiCard label="Usuarios activos" value={activos} sub={usuarios.length - activos ? usuarios.length - activos + ' inactivos' : 'Todos activos'} />
        <KpiCard label="Administradores" value={admins} sub="Con acceso total" />
        <KpiCard label="Roles" value={roles.length} sub={roles.filter(r => !r.esSistema).length + ' personalizados'} />
      </div>

      <div className="mb-4">
        <Segmented label="Ver" value={tab} onChange={setTab}
          options={[{ value: 'usuarios', label: 'Usuarios (' + usuarios.length + ')' }, { value: 'roles', label: 'Roles y permisos (' + roles.length + ')' }]} />
      </div>

      {tab === 'usuarios' ? <UsersTable /> : <RolesTable />}
    </>
  )
}
