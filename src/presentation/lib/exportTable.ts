import { isValidElement, type ReactNode } from 'react'
import { toXlsx, type Cell } from '../../shared/lib/xlsx'
import { fd, today } from '../../shared/lib/dates'
import { downloadBlob } from './download'

/** Datos listos para exportar: encabezados y filas de texto o número */
export interface ExportData { headers: string[]; rows: Cell[][] }

export type ExportFormat = 'xlsx' | 'pdf'

/**
 * Texto visible de un nodo de React (para exportar lo que muestra una celda).
 * Omite lo que solo se ve en celular (md:hidden) y separa con " · " los bloques
 * que en pantalla van uno debajo del otro (nombre y teléfono, por ejemplo).
 */
export function nodeText(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) {
    let out = '', prevEl = false
    for (const x of n) {
      const t = nodeText(x)
      if (!t) continue
      const el = isValidElement(x)
      if (out) out += prevEl && el ? ' · ' : prevEl || el ? ' ' : ''
      out += t
      prevEl = el
    }
    return out.replace(/\s+/g, ' ')
  }
  if (isValidElement(n)) {
    const p = n.props as { children?: ReactNode; className?: string }
    if (typeof p.className === 'string' && /(^|\s)md:hidden(\s|$)/.test(p.className)) return ''
    return nodeText(p.children)
  }
  return ''
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Descarga la tabla en Excel (.xlsx) o PDF. El PDF se genera con jsPDF, cargado solo cuando se usa. */
export async function exportTable(title: string, data: ExportData, format: ExportFormat) {
  const base = slug(title) + '-' + today()
  if (format === 'xlsx') {
    downloadBlob(base + '.xlsx', toXlsx(data.headers, data.rows, title))
    return
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: data.headers.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(43, 40, 38).text('ZAHO · ' + title, 36, 40)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(138, 131, 124)
    .text('Generado el ' + fd(today()) + ' · ' + data.rows.length + (data.rows.length === 1 ? ' registro' : ' registros'), 36, 56)
  autoTable(doc, {
    startY: 68,
    head: [data.headers],
    body: data.rows.map(r => r.map(v => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('es-CO') : v))),
    styles: { fontSize: data.headers.length > 8 ? 7 : 8, cellPadding: 4, overflow: 'linebreak', textColor: [62, 58, 56] },
    headStyles: { fillColor: [62, 58, 56], textColor: [251, 249, 246], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 244, 240] },
    margin: { left: 36, right: 36 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight()
      doc.setFontSize(8).setTextColor(138, 131, 124).text('Página ' + doc.getNumberOfPages(), w - 36, h - 20, { align: 'right' })
    },
  })
  doc.save(base + '.pdf')
}
