import type { Product } from '../../../../domain/entities'
import { productStatus } from '../../../../domain/rules/finance'
import { PROD_ST } from '../../../../shared/lib/constants'
import type { Cell as CsvCell } from '../../../../shared/lib/xlsx'
import type { ExportData } from '../../../lib/exportTable'

const COLUMNAS: [string, (p: Product) => CsvCell][] = [
  ['Código', p => p.code],
  ['Marca', p => p.brand],
  ['Nombre', p => p.name],
  ['Categoría', p => p.cat],
  ['Talla', p => p.size],
  ['Color', p => p.color],
  ['Bodega', p => p.wh],
  ['Stock', p => p.stock],
  ['Stock mínimo', p => p.min],
  ['Estado', p => PROD_ST[productStatus(p)].label],
  ['Costo unitario', p => p.cost],
  ['Precio de venta', p => p.price],
  ['Utilidad unitaria', p => p.price - p.cost],
  ['Utilidad %', p => (p.price ? Math.round(((p.price - p.cost) / p.price) * 100) : null)],
  ['Valor en inventario (costo)', p => p.stock * p.cost],
  ['Valor en inventario (venta)', p => p.stock * p.price],
]

/** Inventario completo para Excel/PDF (las filas que se están viendo, con sus filtros) */
export function inventoryExport(rows: Product[]): ExportData {
  const sorted = rows.slice().sort((a, b) => a.wh.localeCompare(b.wh) || a.name.localeCompare(b.name) || a.size.localeCompare(b.size))
  return { headers: COLUMNAS.map(c => c[0]), rows: sorted.map(p => COLUMNAS.map(c => c[1](p))) }
}
