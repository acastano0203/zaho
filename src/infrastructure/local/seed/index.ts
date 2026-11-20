import type { AppData } from '../../../domain/entities'
import { templates } from './templates'
import { cuentasPorDefecto } from '../../../domain/rules/caja'
import { today } from '../../../shared/lib/dates'
import { DEFAULT_BRANDS, DEFAULT_CATS } from '../../../shared/lib/constants'

/**
 * Estado inicial del modo local: la tienda arranca vacía.
 * Solo se incluyen las plantillas de mensajes, que son configuración y no datos.
 */
export function seedData(): AppData {
  return {
    products: [],
    sales: [],
    cartera: [],
    salidas: [],
    orders: [],
    clientes: [],
    comerciales: [],
    suppliers: [],
    categories: DEFAULT_CATS.map((name, i) => ({ id: 'c' + (i + 1), name })),
    brands: DEFAULT_BRANDS.map((b, i) => ({ id: 'b' + (i + 1), ...b })),
    tpls: { ...templates },
    seq: { sale: 1000, out: 0, order: 100, prod: 0 },
    daily: true,
    cuentas: cuentasPorDefecto(today()),
    movCaja: [],
    cierres: [],
  }
}
