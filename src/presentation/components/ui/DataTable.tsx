import type { KeyboardEvent, ReactNode } from 'react'
import type { Cell } from '../../../shared/lib/xlsx'
import { nodeText, type ExportData } from '../../lib/exportTable'
import { ExportButtons } from './ExportButtons'

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
  /** Valor al exportar a Excel/PDF (por defecto, el texto que muestra la celda) */
  exportValue?: (row: T) => Cell
  /** No incluir la columna al exportar */
  noExport?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  actions?: (row: T) => ReactNode
  actionsWidth?: string
  minWidth?: number
  /** Botones Excel y PDF sobre la tabla. `data` reemplaza las columnas visibles por otras (más completas). */
  exportar?: { title: string; data?: () => ExportData }
  /** Doble clic (o Enter) sobre la fila: abrir su detalle */
  onRowOpen?: (row: T) => void
  /** Casillas para seleccionar filas */
  selection?: {
    selected: ReadonlySet<string>
    onChange: (next: Set<string>) => void
    /** Filas que se pueden marcar (por defecto, todas) */
    canSelect?: (row: T) => boolean
    label?: (row: T) => string
  }
}

function Check({ checked, indeterminate, disabled, onChange, label }: { checked: boolean; indeterminate?: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <input type="checkbox" aria-label={label} title={label} checked={checked} disabled={disabled}
      ref={el => { if (el) el.indeterminate = !!indeterminate }}
      onChange={onChange} onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}
      className="size-4 cursor-pointer accent-ink disabled:cursor-not-allowed disabled:opacity-30" />
  )
}

/** Tabla en escritorio/tablet y tarjetas apiladas en móvil */
/** Columnas visibles convertidas a texto/números para exportar */
function tableData<T>(columns: Column<T>[], rows: T[]): ExportData {
  const cols = columns.filter(c => !c.noExport)
  return {
    headers: cols.map(c => nodeText(c.header)),
    rows: rows.map(r => cols.map(c => {
      if (c.exportValue) return c.exportValue(r)
      const t = nodeText(c.render(r)).replace(/\s+/g, ' ').trim()
      return t === '—' ? '' : t
    })),
  }
}

export function DataTable<T>({ columns, rows, rowKey, actions, actionsWidth = '150px', minWidth = 800, onRowOpen, selection, exportar }: Props<T>) {
  // Acciones: al menos `actionsWidth`, y crece si los botones no caben (así no se salen del fondo de la fila)
  const tracks = (selection ? ['28px'] : []).concat(columns.map(c => c.width), actions ? ['minmax(' + actionsWidth + ', max-content)'] : []).join(' ')
  const selectable = selection ? rows.filter(r => selection.canSelect?.(r) ?? true).map(rowKey) : []
  const nSel = selectable.filter(k => selection?.selected.has(k)).length
  const toggle = (k: string) => {
    if (!selection) return
    const next = new Set(selection.selected)
    if (next.has(k)) next.delete(k); else next.add(k)
    selection.onChange(next)
  }
  const toggleAll = () => selection?.onChange(nSel === selectable.length ? new Set() : new Set(selectable))
  const rowCheck = (r: T) => {
    if (!selection) return null
    const k = rowKey(r), ok = selection.canSelect?.(r) ?? true
    return <Check checked={selection.selected.has(k)} disabled={!ok} onChange={() => toggle(k)} label={(ok ? 'Seleccionar ' : 'No seleccionable: ') + (selection.label?.(r) ?? k)} />
  }
  const openProps = (r: T) => onRowOpen ? {
    onDoubleClick: () => onRowOpen(r),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowOpen(r) },
    tabIndex: 0, title: 'Doble clic para ver el detalle',
  } : {}
  const primary = columns.find(c => c.primary)
  const badge = columns.find(c => c.badge)
  const rest = columns.filter(c => !c.primary && !c.badge && !c.hideMobile)

  return (
    <>
      {exportar && rows.length > 0 && (
        <div className="mb-2 flex justify-end">
          <ExportButtons title={exportar.title} data={exportar.data ?? (() => tableData(columns, rows))} />
        </div>
      )}
      {/* Escritorio y tablet */}
      <div className="hidden overflow-x-auto rounded-md border border-linen bg-white md:block">
        {/* Una sola grilla para toda la tabla; cada fila usa subgrid, así todas comparten el ancho de columnas */}
        <div className="grid gap-x-3.5" style={{ minWidth, gridTemplateColumns: tracks }}>
          <div className="col-span-full grid min-h-10 grid-cols-subgrid items-center border-b border-linen bg-paper px-3.5">
            {selection && (
              <span className="flex items-center">
                <Check checked={selectable.length > 0 && nSel === selectable.length} indeterminate={nSel > 0 && nSel < selectable.length}
                  disabled={!selectable.length} onChange={toggleAll} label="Seleccionar todas" />
              </span>
            )}
            {columns.map(c => (
              <span key={c.key} className={'truncate text-[11px] font-medium uppercase tracking-[0.2em] text-char ' + (c.align === 'right' ? 'text-right' : '')}>{c.header}</span>
            ))}
            {actions && <span />}
          </div>
          {rows.map(r => (
            <div key={rowKey(r)} {...openProps(r)}
              className={'col-span-full grid min-h-11 grid-cols-subgrid items-center border-t border-line px-3.5 py-1.5 [&:nth-child(2)]:border-t-0 even:bg-paper ' +
                (onRowOpen ? 'cursor-pointer select-none hover:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ' : '') +
                (selection?.selected.has(rowKey(r)) ? '!bg-[#FBF5EA]' : '')}>
              {selection && <span className="flex items-center">{rowCheck(r)}</span>}
              {columns.map(c => (
                <span key={c.key} className={'min-w-0 truncate ' + (c.align === 'right' ? 'text-right tabular' : '')}>{c.render(r)}</span>
              ))}
              {actions && <span className="flex items-center justify-end gap-1.5" onDoubleClick={e => e.stopPropagation()}>{actions(r)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Móvil */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {rows.map(r => (
          <div key={rowKey(r)} {...openProps(r)} className={'rounded-md border border-linen p-3.5 ' + (selection?.selected.has(rowKey(r)) ? 'bg-[#FBF5EA]' : 'bg-white')}>
            <div className="flex items-start justify-between gap-3">
              {selection && <div className="flex h-6 items-center">{rowCheck(r)}</div>}
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
