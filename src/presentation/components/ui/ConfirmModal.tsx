import { useUI } from '../../store/UIStore'
import { Modal, ModalActions } from './Modal'
import { Button } from './Button'

interface Props { title: string; message: string; cta?: string; onConfirm: () => boolean | void }

/** Confirmación antes de una acción destructiva. Si onConfirm devuelve false, el modal sigue abierto. */
export function ConfirmModal({ title, message, cta = 'Eliminar', onConfirm }: Props) {
  const ui = useUI()
  return (
    <Modal kicker="Confirmar" title={title} onClose={ui.closeModal}>
      <p className="text-sm leading-relaxed text-char">{message}</p>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="danger" onClick={() => { if (onConfirm() !== false) ui.closeModal() }}>{cta}</Button>
      </ModalActions>
    </Modal>
  )
}
