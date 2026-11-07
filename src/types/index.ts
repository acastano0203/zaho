export type PayMode = 'contado' | 'credito'
export type Freq = 'semanal' | 'quincenal' | 'mensual'

export interface Product {
  id: string
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
  items: SaleItem[]
}

export interface Alloc { n: number; val: number }
export interface Abono { date: string; val: number; label: string; met?: string; alloc?: Alloc[] }
export interface Gestion { date: string; tipo: string; nota: string; promesa?: string | null }
export interface Cuota { n: number; due: string; amount: number }

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
  planStart: number
  gestiones: Gestion[]
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
}
