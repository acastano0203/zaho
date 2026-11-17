import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { useApp } from '../../../store/AppStore'
import { useSession } from '../../../store/SessionStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Select } from '../../../components/ui/Field'
import { Box } from '../../../components/ui/Display'
import { modoDemo, useAccessActions, useAccessData } from '../hooks/useAccess'

export function UserModal({ id }: { id?: string }) {
  const ui = useUI()
  const { sesion } = useSession()
  const { data, toast } = useApp()
  const { usuarios, roles } = useAccessData()
  const { crear, editar } = useAccessActions()
  const u = id ? usuarios.find(x => x.id === id) : null
  const demo = modoDemo()
  const soyYo = !!id && sesion?.usuario.id === id

  const [f, setF] = useState({
    nombre: u?.nombre ?? '',
    email: u?.email ?? '',
    telefono: u?.telefono ?? '',
    rolId: u?.rolId ?? roles.find(r => !r.esAdmin)?.id ?? '',
    comercialId: u?.comercialId ?? '',
    password: '',
    confirm: '',
  })
  const [busy, setBusy] = useState(false)
  const up = (patch: Partial<typeof f>) => setF({ ...f, ...patch })
  const rol = roles.find(r => r.id === f.rolId)

  async function submit() {
    if (!id && f.password !== f.confirm) return toast('Las contraseñas no coinciden')
    setBusy(true)
    const ok = id
      ? await editar(id, { nombre: f.nombre, telefono: f.telefono, rolId: f.rolId || null, comercialId: f.comercialId || null })
      : await crear({ nombre: f.nombre, email: f.email, telefono: f.telefono, password: f.password, rolId: f.rolId, comercialId: f.comercialId || null })
    setBusy(false)
    if (ok) ui.closeModal()
  }

  const mismatch = !id && !!f.confirm && f.password !== f.confirm

  return (
    <Modal kicker="Usuarios" title={id ? 'Editar usuario' : 'Crear usuario'} onClose={ui.closeModal}>
      <Field label="Nombre completo"><Input value={f.nombre} onChange={e => up({ nombre: e.target.value })} autoFocus /></Field>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Correo (usuario de acceso)">
          <Input type="email" inputMode="email" autoComplete="off" value={f.email} disabled={!!id}
            onChange={e => up({ email: e.target.value })} className={id ? 'bg-paper text-taupe' : ''} />
        </Field>
        <Field label="Teléfono"><Input inputMode="tel" value={f.telefono} onChange={e => up({ telefono: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Rol">
          <Select value={f.rolId} onChange={e => up({ rolId: e.target.value })} disabled={soyYo} title={soyYo ? 'No puedes cambiar tu propio rol' : undefined}
            options={[{ value: '', label: 'Elige un rol…' }, ...roles.map(r => ({ value: r.id, label: r.nombre }))]} />
        </Field>
        <Field label="Es comercial (opcional)">
          <Select value={f.comercialId} onChange={e => up({ comercialId: e.target.value })}
            options={[{ value: '', label: 'No' }, ...data.comerciales.map(c => ({ value: c.id, label: c.name }))]} />
        </Field>
      </div>
      {rol && <p className="-mt-1 text-xs text-taupe">{rol.esAdmin ? 'Acceso total a la aplicación.' : rol.descripcion || 'Rol personalizado.'}</p>}

      {!id && (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Contraseña"><Input type="password" autoComplete="new-password" value={f.password} onChange={e => up({ password: e.target.value })} /></Field>
            <Field label="Repite la contraseña">
              <Input type="password" autoComplete="new-password" value={f.confirm} onChange={e => up({ confirm: e.target.value })}
                className={mismatch ? 'border-bad' : ''} />
            </Field>
          </div>
          <p className="-mt-1 text-xs text-taupe">{mismatch ? <span className="text-bad">Las contraseñas no coinciden.</span> : 'Mínimo 8 caracteres, con letras y números.'}</p>
          {demo && <Box warn><p className="text-xs text-char">Modo demo: el usuario se guarda en este navegador y la contraseña no se almacena. Con Supabase se crea la cuenta real de acceso.</p></Box>}
        </>
      )}

      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" disabled={busy || mismatch} onClick={() => void submit()}>{busy ? 'Guardando…' : id ? 'Guardar' : 'Crear usuario'}</Button>
      </ModalActions>
    </Modal>
  )
}
