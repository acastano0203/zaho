import type { AppData } from '../types'
import { products } from './products'
import { sales } from './sales'
import { cartera } from './cartera'
import { salidas } from './salidas'
import { orders } from './orders'
import { clientes } from './clientes'
import { comerciales } from './comerciales'
import { suppliers } from './suppliers'
import { templates } from './templates'

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** Estado inicial de la app construido desde los archivos simulados */
export function seedData(): AppData {
  return {
    products: clone(products),
    sales: clone(sales),
    cartera: clone(cartera),
    salidas: clone(salidas),
    orders: clone(orders),
    clientes: clone(clientes),
    comerciales: clone(comerciales),
    suppliers: clone(suppliers),
    tpls: clone(templates),
    seq: { sale: 1003, out: 3, order: 103, prod: 3 },
    daily: true,
  }
}
