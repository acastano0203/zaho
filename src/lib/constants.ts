import type { SalidaTipo } from '../types'

export const C = { ok: '#7A8B6F', warn: '#C29A4B', bad: '#A65A4A', stone: '#8A837C', ink: '#3E3A38' }

/** Recargo % para ventas a crédito */
export const REC = 10

export const BRANDS = ['Norte Denim', 'Bruma', 'Kalia', 'Sendero']
export const CATS = ['Jeans', 'Blusas', 'Camisetas', 'Vestidos']
export const SIZES = ['S', 'M', 'L', 'XL', '6', '8', '10', '12', '14']
export const WAREHOUSES = ['Bodega Principal', 'Local ZAHO']
export const METODOS = ['Efectivo', 'Nequi', 'Bancolombia', 'Transferencia', 'Tarjeta']
export const MOTIVOS = ['Conteo físico', 'Prenda averiada', 'Devolución de cliente', 'Pérdida']

export const TIPOS: Record<SalidaTipo, string> = {
  compra: 'Compra de inventario',
  transporte: 'Transporte / envíos',
  operativo: 'Costos operativos',
  prestamo: 'Préstamo otorgado',
  comerciales: 'Pago a comerciales',
  otro: 'Otro',
}
export const TIPO_KEYS = Object.keys(TIPOS) as SalidaTipo[]
export const SCALE = ['#2B2826', '#3E3A38', '#57524F', '#8A837C', '#B3AAA0', '#D7CFC3']

export const SWATCH: Record<string, [string, string]> = {
  Azul: ['#4A5A72', '#F3EFE9'],
  'Azul claro': ['#9AA9BC', '#2B2826'],
  Negro: ['#2B2826', '#F3EFE9'],
  Blanco: ['#FBF9F6', '#2B2826'],
  Champaña: ['#E3CFAE', '#2B2826'],
  Rayas: ['#D7CFC3', '#2B2826'],
  Arena: ['#D9C7A8', '#2B2826'],
  Terracota: ['#A65A4A', '#F3EFE9'],
  'Verde oliva': ['#7A8B6F', '#F3EFE9'],
  Gris: ['#8A837C', '#F3EFE9'],
}

export const PROD_ST = {
  ok: { label: 'Disponible', color: C.ok },
  baj: { label: 'Stock bajo', color: C.warn },
  ago: { label: 'Agotado', color: C.bad },
} as const

export const QST = {
  pag: ['Pagada', C.ok],
  ven: ['Vencida', C.bad],
  par: ['Parcial', C.warn],
  pv: ['Vence pronto', C.warn],
  pen: ['Pendiente', C.stone],
} as const

export const TPL_LABEL = {
  recordatorio: 'recordatorio antes de vencer',
  vencida: 'cobro de deuda vencida',
  gracias: 'agradecimiento por pago',
  prestamo: 'recordatorio de préstamo',
} as const
