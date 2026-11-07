import { useEffect, type ReactNode } from 'react'
import { IconX } from './Icons'

interface Props {
  title: ReactNode
  kicker?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** Panel lateral: ocupa toda la pantalla en móvil y se ancla a la derecha en tablet/escritorio */
export function Drawer({ title, kicker, onClose, children, footer, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-60 bg-ink/30" onClick={onClose} />
      <div role="dialog" aria-modal="true"
        className={'fixed inset-y-0 right-0 z-61 flex w-full flex-col border-l border-linen bg-white ' + (wide ? 'sm:max-w-[640px]' : 'sm:max-w-[560px]')}>
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
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex items-center justify-between gap-3 border-t border-linen bg-paper px-4 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </>
  )
}
