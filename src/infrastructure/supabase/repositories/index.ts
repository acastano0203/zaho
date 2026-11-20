import type { Repositories } from '../../../application/ports/repositories'
import { SupabaseCatalog } from './catalog'
import { SupabaseBrands } from './brands'
import { SupabaseCategories } from './categories'
import { SupabaseCaja } from './caja'
import { SupabaseOrders, SupabaseProducts } from './inventory'
import { SupabaseSales } from './sales'
import { SupabaseCartera } from './cartera'
import { SupabaseSalidas } from './salidas'
import { SupabaseClients, SupabaseComerciales, SupabaseSettings, SupabaseSuppliers } from './masters'

export function createSupabaseRepositories(): Repositories {
  const catalog = new SupabaseCatalog()
  return {
    catalog,
    caja: new SupabaseCaja(),
    products: new SupabaseProducts(catalog),
    orders: new SupabaseOrders(catalog),
    sales: new SupabaseSales(catalog),
    cartera: new SupabaseCartera(catalog),
    salidas: new SupabaseSalidas(catalog),
    clients: new SupabaseClients(),
    comerciales: new SupabaseComerciales(),
    suppliers: new SupabaseSuppliers(catalog),
    brands: new SupabaseBrands(catalog),
    categories: new SupabaseCategories(catalog),
    settings: new SupabaseSettings(),
  }
}
