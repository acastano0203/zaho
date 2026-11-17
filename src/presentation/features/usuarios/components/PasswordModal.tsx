import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input } from '../../../components/ui/Field'
import { useAccessActions, useAccessData } from '../hooks/useAccess'

export function PasswordModal({ id }: { id: string }) {
  const ui = useUI()
  const { usuarios } = useAccessData()
  const { password } = useAccessActions()
  const u = usuarios.find(x => x.id === id)
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    const ok = await password(id, p, c)
    setBusy(false)
    if (ok) ui.closeModal()
  }

  return (
    <Modal kicker={u?.nombre ?? 'Usuario'} title="Cambiar contraseña" onClose={ui.closeModal}>
      <Field label="Nueva contraseña"><Input type="password" autoComplete="new-password" value={p} onChange={e => setP(e.target.value)} autoFocus /></Field>
      <Field label="Repite la contraseña"><Input type="password" autoComplete="new-password" value={c} onChange={e => setC(e.target.value)} /></Field>
      <p className="-mt-1 text-xs text-taupe">Mínimo 8 caracteres, con letras y números. El usuario la usará en su próximo inicio de sesión.</p>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" disabled={busy} onClick={() => void submit()}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</Button>
      </ModalActions>
    </Modal>
  )
}
