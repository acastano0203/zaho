import type { AppData } from '../../../domain/entities'
import { templates } from './templates'
import { cuentasPorDefecto } from '../../../domain/rules/caja'
import { today } from '../../../shared/lib/dates'

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
    tpls: { ...templates },
    seq: { sale: 1000, out: 0, order: 100, prod: 0 },
    daily: true,
    cuentas: cuentasPorDefecto(today()),
    movCaja: [],
    cierres: [],
  }
}
