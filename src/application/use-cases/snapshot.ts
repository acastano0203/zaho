import type { AppData } from '../../domain/entities'
import type { Repositories } from '../ports/repositories'

/**
 * Carga todo el estado que necesita la UI actual en una sola llamada.
 * Sirve como puente mientras los módulos migran a consultas por página/paginadas.
 */
export async function loadAppData(r: Repositories): Promise<AppData> {
  const [products, sales, cartera, salidas, orders, clientes, comerciales, suppliers, brands, categories, tpls, daily, caja] = await Promise.all([
    r.products.list(), r.sales.list(), r.cartera.list(), r.salidas.list(), r.orders.list(),
    r.clients.list(), r.comerciales.list(), r.suppliers.list(), r.brands.list(), r.categories.list(), r.settings.templates(), r.settings.dailySummary(), r.caja.snapshot(),
  ])
  // Los consecutivos los genera la base de datos; aquí solo sirven para sugerir el código de un producto nuevo.
  const seq = { sale: 0, out: 0, order: 0, prod: products.length }
  return { products, sales, cartera, salidas, orders, clientes, comerciales, suppliers, brands, categories, tpls, seq, daily, ...caja }
}
