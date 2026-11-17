/**
 * PUERTOS (capa de aplicación)
 * ---------------------------------------------------------------
 * Contratos que la aplicación necesita del mundo exterior.
 * La capa de infraestructura los implementa (Supabase, localStorage, API REST…)
 * y la presentación nunca habla con la base de datos directamente.
 *
 * Regla de dependencias:  presentation → application → domain
 *                         infrastructure → application (implementa puertos) → domain
 */
import type {
  AppData, CierreCaja, Cliente, Comercial, Cuota, CuentaDinero, Freq, MovCaja, OrderLine, PayMode, Product, SaleItem, Salida, SalidaTipo, Supplier, TemplateKey,
} from '../../domain/entities'

/* ------------------------------ Comandos ------------------------------ */

export interface PlanInput { freq: Freq; cuotas: Cuota[] }

export interface RegisterSaleCommand {
  clientId: string | null
  client: string
  phone: string
  comercialId: string | null
  pay: PayMode
  items: SaleItem[]
  /** Solo crédito */
  due?: string
  initialPayment?: number
  paymentMethod?: string
  plan?: PlanInput | null
}

export interface RegisterPaymentCommand {
  accountId: string
  amount: number
  method: string
  /** Reparto entre cuotas ya calculado por el dominio (n = número de cuota) */
  allocations: { n: number; val: number }[]
  label?: string
}

export interface RegisterLoanCommand {
  to: string
  phone: string
  amount: number
  method: string
  date: string
  due: string
  note?: string
  plan?: PlanInput | null
}

export interface ExpenseCommand {
  date: string
  tipo: Exclude<SalidaTipo, 'prestamo'>
  otro?: string
  desc: string
  amount: number
  method: string
  /** Archivo del comprobante (se sube a Storage) */
  file?: File | null
}

export interface ProductCommand {
  code: string; name: string; brand: string; cat: string; size: string; color: string
  cost: number; price: number; warehouse: string; stock: number; min: number
}

/* ---------------------------- Repositorios ---------------------------- */

export interface CatalogRepository {
  brands(): Promise<string[]>
  categories(): Promise<string[]>
  warehouses(): Promise<string[]>
  paymentMethods(): Promise<string[]>
}

export interface ProductRepository {
  list(): Promise<Product[]>
  create(cmd: ProductCommand): Promise<string>
  update(productId: string, cmd: Omit<ProductCommand, 'warehouse' | 'stock'>): Promise<void>
  remove(productId: string): Promise<void>
  adjustStock(productId: string, newStock: number, reason: string): Promise<void>
  transfer(productId: string, toWarehouse: string, qty: number): Promise<void>
}

export interface SaleRepository {
  list(): Promise<AppData['sales']>
  register(cmd: RegisterSaleCommand): Promise<string>
  cancel(saleId: string): Promise<void>
}

export interface CarteraRepository {
  list(): Promise<AppData['cartera']>
  registerPayment(cmd: RegisterPaymentCommand): Promise<string>
  applyPlan(accountId: string, plan: PlanInput, note: string): Promise<void>
  addFollowUp(accountId: string, tipo: string, nota: string, promesa?: string | null): Promise<void>
  /** Recargo por mora (solo cuentas vencidas) */
  addLateFee(accountId: string, f: { tipo: 'pct' | 'valor'; pct?: number; base: number; val: number; cuota?: number; nota: string }): Promise<void>
  removeLateFee(id: string): Promise<void>
  createManual(input: {
    clientId: string | null; client: string; phone: string; comercialId: string | null; total: number; concepto: string
    nota: string; date: string; due: string; initialPayment: number; method: string; plan?: PlanInput | null
  }): Promise<string>
  update(accountId: string, patch: { client?: string; phone?: string; nota?: string; concepto?: string; total?: number; due?: string; cuota?: { id: string; amount: number } }): Promise<void>
  remove(accountId: string): Promise<void>
}

export interface SalidaRepository {
  list(): Promise<Salida[]>
  createExpense(cmd: ExpenseCommand): Promise<string>
  registerLoan(cmd: RegisterLoanCommand): Promise<string>
  update(id: string, patch: Partial<Pick<Salida, 'tipo' | 'otro' | 'desc' | 'val' | 'date' | 'met'>>): Promise<void>
  remove(id: string): Promise<void>
}

export interface ClientRepository {
  list(): Promise<Cliente[]>
  /** `newId`: crea el cliente con ese id (generado en la app para usarlo de inmediato) */
  save(c: Omit<Cliente, 'id' | 'created'> & { id?: string; newId?: string }): Promise<string>
  remove(id: string): Promise<void>
}

export interface ComercialRepository {
  list(): Promise<Comercial[]>
  save(c: Omit<Comercial, 'id'> & { id?: string }): Promise<string>
  remove(id: string): Promise<void>
}

export interface SupplierRepository {
  list(): Promise<Supplier[]>
  save(s: Omit<Supplier, 'id'> & { id?: string }): Promise<string>
  remove(id: string): Promise<void>
}

export interface OrderRepository {
  list(): Promise<AppData['orders']>
  send(supplierId: string, lines: OrderLine[]): Promise<string>
  updateLines(orderId: string, lines: OrderLine[]): Promise<void>
  advance(orderId: string): Promise<void>
  remove(orderId: string): Promise<void>
}

export interface SettingsRepository {
  templates(): Promise<AppData['tpls']>
  updateTemplate(key: TemplateKey, text: string): Promise<void>
  dailySummary(): Promise<boolean>
  setDailySummary(on: boolean): Promise<void>
  creditSurchargePct(): Promise<number>
}

export interface CajaSnapshot { cuentas: CuentaDinero[]; movCaja: MovCaja[]; cierres: CierreCaja[] }

export interface CajaRepository {
  snapshot(): Promise<CajaSnapshot>
  /** Otros ingresos registrados en caja */
  addMovement(m: Omit<MovCaja, 'id'>): Promise<void>
  transfer(desde: string, hasta: string, val: number, date: string, concepto: string): Promise<void>
  /** Arqueo: el saldo del sistema y el ajuste los calcula la base de datos */
  count(cuentaId: string, contado: number, conteo: Record<string, number> | undefined, nota: string): Promise<void>
  removeCount(id: string): Promise<void>
  removeMovement(id: string): Promise<void>
  saveAccount(c: CuentaDinero, isNew: boolean): Promise<void>
  removeAccount(id: string): Promise<void>
}

/** Todos los repositorios juntos: es lo que inyecta el contenedor */
export interface Repositories {
  caja: CajaRepository
  catalog: CatalogRepository
  products: ProductRepository
  sales: SaleRepository
  cartera: CarteraRepository
  salidas: SalidaRepository
  clients: ClientRepository
  comerciales: ComercialRepository
  suppliers: SupplierRepository
  orders: OrderRepository
  settings: SettingsRepository
}
