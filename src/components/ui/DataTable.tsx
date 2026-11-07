import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: ReactNode
  /** Pista de la grilla en escritorio, ej. '120px' o 'minmax(150px,1.2fr)' */
  width: string
  render: (row: T) => ReactNode
  align?: 'right'
  /** Título de la tarjeta en móvil */
  primary?: boolean
  /** Se muestra arriba a la derecha de la tarjeta en móvil */
  badge?: boolean
  /** Ocultar en la tarjeta móvil */
  hideMobile?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  actions?: (row: T) => ReactNode
  actionsWidth?: string
  minWidth?: number
}

/** Tabla en escritorio/tablet y tarjetas apiladas en móvil */
export function DataTable<T>({ columns, rows, rowKey, actions, actionsWidth = '150px', minWidth = 800 }: Props<T>) {
  const tracks = columns.map(c => c.width).concat(actions ? [actionsWidth] : []).join(' ')
  const primary = columns.find(c => c.primary)
  const badge = columns.find(c => c.badge)
  const rest = columns.filter(c => !c.primary && !c.badge && !c.hideMobile)

  return (
    <>
      {/* Escritorio y tablet */}
      <div className="hidden overflow-x-auto rounded-md border border-linen bg-white md:block">
        <div style={{ minWidth }}>
          <div className="grid min-h-10 items-center gap-x-3.5 border-b border-linen bg-paper px-3.5" style={{ gridTemplateColumns: tracks }}>
            {columns.map(c => (
              <span key={c.key} className={'truncate text-[11px] font-medium uppercase tracking-[0.2em] text-char ' + (c.align === 'right' ? 'text-right' : '')}>{c.header}</span>
            ))}
            {actions && <span />}
          </div>
          {rows.map(r => (
            <div key={rowKey(r)} className="grid min-h-11 items-center gap-x-3.5 border-t border-line px-3.5 py-1.5 first:border-t-0 even:bg-paper"
              style={{ gridTemplateColumns: tracks }}>
              {columns.map(c => (
                <span key={c.key} className={'min-w-0 truncate ' + (c.align === 'right' ? 'text-right tabular' : '')}>{c.render(r)}</span>
              ))}
              {actions && <span className="flex min-w-0 gap-1.5">{actions(r)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Móvil */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.map(r => (
          <div key={rowKey(r)} className="rounded-md border border-linen bg-white p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{primary ? primary.render(r) : null}</div>
              {badge && <div className="shrink-0">{badge.render(r)}</div>}
            </div>
            {rest.length > 0 && (
              <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                {rest.map(c => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-[0.16em] text-taupe">{c.header}</dt>
                    <dd className="mt-0.5 min-w-0 break-words text-sm text-ink tabular">{c.render(r)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">{actions(r)}</div>}
          </div>
        ))}
      </div>
    </>
  )
}
