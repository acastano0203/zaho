import type { Product } from '../types'

const BP = 'Bodega Principal'
const LZ = 'Local ZAHO'
const P = (id: string, code: string, brand: string, name: string, cat: string, size: string, color: string, wh: string, stock: number, min: number, cost: number, price: number): Product =>
  ({ id, code, brand, name, cat, size, color, wh, stock, min, cost, price })

/** Catálogo inicial. El stock ya refleja las ventas simuladas. */
export const products: Product[] = [
  P('p1', 'ZH-J101', 'Norte Denim', 'Jean Slim Azul', 'Jeans', '8', 'Azul', LZ, 6, 3, 62000, 139900),
  P('p2', 'ZH-B101', 'Bruma', 'Blusa Satín Champaña', 'Blusas', 'M', 'Champaña', LZ, 1, 3, 42000, 99900),
  P('p3', 'ZH-V101', 'Kalia', 'Vestido Corto Verde oliva', 'Vestidos', 'XL', 'Verde oliva', BP, 0, 2, 54000, 139900),
]
