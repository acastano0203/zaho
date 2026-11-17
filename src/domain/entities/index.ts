export type PayMode = 'contado' | 'credito'
export type Freq = 'semanal' | 'quincenal' | 'mensual'

export interface Product {
  /** Modo local: id propio. Modo Supabase: "skuId:whId" (producto + bodega) */
  id: string
  /** Id del producto (SKU) en la base de datos */
  skuId?: string
  /** Id de la bodega en la base de datos */
  whId?: string
  code: string
  brand: string
  name: string
  cat: string
  size: string
  color: string
  wh: string
  stock: number
  min: number
  cost: number
  price: number
}

export interface SaleItem { pid: string; qty: number; price: number }

export interface Sale {
  id: string
  date: string
  client: string
  clientId: string | null
  phone: string
  com: string
  pay: PayMode
  /** Medio de pago de la venta de contado (a qué cuenta de caja entra el dinero) */
  met?: string
  items: SaleItem[]
}

export interface Alloc { n: number; val: number }
export interface Abono { id?: string; date: string; val: number; label: string; met?: string; alloc?: Alloc[] }
export interface Gestion { date: string; tipo: string; nota: string; promesa?: string | null }
/** Recargo por mora: porcentaje sobre lo vencido o valor fijo */
export interface RecargoMora {
  id: string
  date: string
  tipo: 'pct' | 'valor'
  /** Porcentaje aplicado (solo tipo pct) */
  pct?: number
  /** Monto vencido sobre el que se calculó */
  base: number
  val: number
  /** Cuota vencida a la que se suma */
  cuota: number
  nota: string
}

export interface Cuota { id?: string; n: number; due: string; amount: number }

export type CarteraKind = 'venta' | 'prestamo' | 'manual'

export interface CarteraEntry {
  id: string
  kind: CarteraKind
  saleId?: string
  client: string
  clientId?: string | null
  phone: string
  com: string | null
  created: string
  due: string
  total?: number
  ref?: string
  concepto?: string
  nota?: string
  met?: string
  salidaId?: string
  abonos: Abono[]
  plan: Cuota[] | null
  /** Id del plan vigente en la base de datos */
  planId?: string | null
  planStart: number
  gestiones: Gestion[]
  /** Recargos por mora cobrados al vencerse la cuenta */
  recargos?: RecargoMora[]
  /** Recargos anteriores al plan vigente (ya quedaron incluidos en sus cuotas) */
  recStart?: number
}

export type SalidaTipo = 'compra' | 'transporte' | 'operativo' | 'prestamo' | 'comerciales' | 'otro'

export interface Salida {
  id: string
  date: string
  tipo: SalidaTipo
  otro: string
  desc: string
  val: number
  met: string
  file: string
  to: string
}

export type OrderStatus = 'Enviado' | 'Confirmado' | 'Recibido'
export interface OrderLine { pid: string; qty: number }
export interface Order { id: string; date: string; sup: string; lines: OrderLine[]; status: OrderStatus; auto: boolean }

export interface Cliente { id: string; name: string; phone: string; doc: string; city: string; note: string; created: string }
export interface Comercial { id: string; name: string; phone: string; pct: number }
export interface Supplier { id: string; name: string; brands: string[]; contact: string; wa: string; auto: boolean }

export type TemplateKey = 'recordatorio' | 'vencida' | 'gracias' | 'prestamo'
export type Templates = Record<TemplateKey, string>

export interface Seq { sale: number; out: number; order: number; prod: number }

export interface AppData {
  products: Product[]
  sales: Sale[]
  cartera: CarteraEntry[]
  salidas: Salida[]
  orders: Order[]
  clientes: Cliente[]
  comerciales: Comercial[]
  suppliers: Supplier[]
  tpls: Templates
  seq: Seq
  daily: boolean
  /** Caja: cuentas de dinero, movimientos propios y arqueos */
  cuentas: CuentaDinero[]
  movCaja: MovCaja[]
  cierres: CierreCaja[]
}

/** Fila calculada de cartera */
export interface CuotaCalc extends Cuota { paid: number }
export type CarSt = 'ven' | 'pv' | 'ok' | 'pag'
export type PromSt = 'incumplida' | 'hoy' | 'pendiente' | null

export interface CarRow {
  c: CarteraEntry
  sale: Sale | null
  total: number
  paid: number
  saldo: number
  days: number
  st: CarSt
  cu: CuotaCalc[]
  hasPlan: boolean
  next: CuotaCalc | null
  refDue: string
  prom: Gestion | null
  promSt: PromSt
  pct: number
  /** Total de recargos por mora incluidos en total */
  mora: number
}

export type * from './usuarios'

/* ------------------------------------ Caja ------------------------------------ */

export type TipoCuenta = 'efectivo' | 'billetera' | 'banco'

/** Dónde está el dinero: caja física, Nequi, cuenta bancaria… */
export interface CuentaDinero {
  id: string
  nombre: string
  tipo: TipoCuenta
  /** Saldo con el que se abrió la cuenta en la app */
  saldoInicial: number
  /** Desde esta fecha cuentan los movimientos (los anteriores ya están en el saldo inicial) */
  fechaInicial: string
  /** Medios de pago cuyo dinero entra a esta cuenta (Efectivo, Nequi, Transferencia…) */
  metodos: string[]
}

export type TipoMov = 'ingreso' | 'egreso'

/** Movimientos que nacen en Caja (los de ventas, abonos y gastos salen de sus módulos) */
export interface MovCaja {
  id: string
  date: string
  cuentaId: string
  tipo: TipoMov
  origen: 'manual' | 'traslado' | 'ajuste'
  categoria: string
  concepto: string
  val: number
  /** Las dos patas de un traslado comparten este id */
  trasladoId?: string
  /** Ajuste generado por un arqueo */
  cierreId?: string
}

/** Arqueo: conteo real del dinero contra lo que dice el sistema */
export interface CierreCaja {
  id: string
  date: string
  cuentaId: string
  saldoSistema: number
  saldoContado: number
  nota: string
  /** Detalle del conteo de billetes y monedas (solo efectivo) */
  conteo?: Record<string, number>
}
