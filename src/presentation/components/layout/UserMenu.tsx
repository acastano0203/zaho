import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../store/SessionStore'
import { useUI } from '../../store/UIStore'
import { iniciales } from '../../../domain/rules/permisos'
import { IconPower } from '../ui/Icons'

/** Avatar con el usuario conectado y la opción de cerrar sesión */
export function UserMenu() {
  const { sesion, salir } = useSession()
  const ui = useUI()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (!sesion) return null

  async function logout() {
    setBusy(true)
    ui.closeModal()
    ui.closeDrawer()
    await salir()
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
        aria-label={'Cuenta de ' + sesion.usuario.nombre} title={sesion.usuario.nombre}
        className="flex h-11 items-center gap-2.5 rounded-md border border-sand-dark pl-1.5 pr-1.5 text-ink hover:bg-cream xl:pr-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-char text-[11px] font-bold tracking-wider text-cream">
          {iniciales(sesion.usuario.nombre)}
        </span>
        <span className="hidden min-w-0 flex-col text-left xl:flex">
          <span className="max-w-[140px] truncate text-[13px] font-semibold leading-tight">{sesion.usuario.nombre}</span>
          <span className="max-w-[140px] truncate text-[11px] leading-tight text-taupe">{sesion.rol.nombre}</span>
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-80 w-64 overflow-hidden rounded-md border border-linen bg-white shadow-[0_8px_24px_rgba(43,40,38,0.12)]">
          <div className="border-b border-linen bg-mist px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{sesion.usuario.nombre}</p>
            <p className="truncate text-xs text-taupe">{sesion.usuario.email}</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-char">{sesion.rol.nombre}</p>
          </div>
          <button type="button" role="menuitem" disabled={busy} onClick={() => void logout()}
            className="flex h-11 w-full items-center gap-2.5 px-4 text-left text-[13px] text-bad hover:bg-cream disabled:opacity-50">
            <IconPower size={16} />{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}
