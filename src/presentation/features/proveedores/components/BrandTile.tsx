import type { ReactNode } from 'react'

/** ¿El color es claro? (para escribir encima en oscuro o en claro) */
export function isLight(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6
}

/** Franja de color con el nombre de la marca y su inicial de fondo */
export function BrandTile({ name, color, children, tall }: { name: string; color: string; children?: ReactNode; tall?: boolean }) {
  const light = isLight(color)
  return (
    <div className={'relative overflow-hidden rounded-t-md px-4 ' + (tall ? 'h-32' : 'h-24') + (light ? ' text-ink' : ' text-cream')} style={{ background: color }}>
      <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-10 font-display text-[120px] leading-none opacity-[0.13] select-none">
        {(name.trim()[0] || '?').toUpperCase()}
      </span>
      <span className="absolute right-4 bottom-3 left-4 truncate font-display text-base tracking-[0.18em] uppercase">{name.trim() || 'Marca'}</span>
      {children}
    </div>
  )
}
