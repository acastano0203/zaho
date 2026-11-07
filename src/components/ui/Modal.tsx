import { useEffect, type ReactNode } from 'react'
import { IconX } from './Icons'

interface Props { title: ReactNode; kicker?: ReactNode; onClose: () => void; children: ReactNode }

/** Hoja inferior en móvil, ventana centrada en tablet/escritorio */
export function Modal({ title, kicker, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-70 bg-ink/30" onClick={onClose} />
      <div role="dialog" aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-71 flex max-h-[92vh] flex-col overflow-hidden rounded-t-xl border border-linen bg-white sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[calc(100vh-48px)] sm:w-[min(560px,calc(100%-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-md">
        <div className="flex items-center justify-between gap-3 border-b border-linen bg-mist px-4 py-4 sm:px-6">
          <div className="min-w-0">
            {kicker && <span className="block truncate text-[11px] uppercase tracking-[0.22em] text-taupe">{kicker}</span>}
            <h2 className="truncate font-display text-base tracking-wide text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-sand-dark text-ink hover:bg-cream md:h-9 md:w-9">
            <IconX size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
      </div>
    </>
  )
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
}
