import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, CarRow } from '../../domain/entities'
import type { Repositories } from '../../application/ports/repositories'
import { loadAppData } from '../../application/use-cases/snapshot'
import { seedData } from '../../infrastructure/local/seed'
import { getRepositories, isRemote } from '../../infrastructure/container'
import { buildCarRows } from '../../domain/rules/finance'
import { subscribeUserChange } from './SessionStore'

const KEY = 'zaho-data-v3'

// Versiones anteriores guardaban datos de ejemplo: se eliminan del navegador
try { ['zaho-data-v2', 'zaho-access-v1', 'zaho-access-v2'].forEach(k => localStorage.removeItem(k)) } catch { /* sin almacenamiento */ }

/** Lo que devuelve cada service: el nuevo estado y un mensaje opcional */
export interface Result { data: AppData; msg?: string; error?: string }

/**
 * Cómo se guarda la acción en la base de datos (modo Supabase).
 * Recibe el estado antes y después del service; lo que lance se muestra como error.
 */
export type Persist = (r: Repositories, before: AppData, after: AppData) => Promise<unknown>

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AppCtx {
  data: AppData
  carRows: CarRow[]
  /**
   * Aplica un service. Devuelve true si no hubo error de validación.
   * En modo Supabase el cambio se ve al instante, se guarda con `persist`
   * y luego se recargan los datos de la base (si falla, se revierte).
   */
  commit: (fn: (d: AppData) => Result, persist?: Persist) => boolean
  toast: (msg: string) => void
  toastMsg: string
  reset: () => void
  /** Modo Supabase: estado de la carga de datos */
  sync: { status: SyncStatus; error: string; saving: boolean }
  reload: () => Promise<void>
}

const Ctx = createContext<AppCtx | null>(null)

function load(): AppData {
  if (isRemote()) return seedData()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const d = JSON.parse(raw) as AppData
      // Datos guardados antes de existir la Caja
      const s = seedData()
      return { ...d, cuentas: d.cuentas ?? s.cuentas, movCaja: d.movCaja ?? [], cierres: d.cierres ?? [], brands: d.brands ?? legacyBrands(d, s.brands), categories: d.categories ?? legacyCategories(d, s.categories) }
    }
  } catch { /* sin almacenamiento */ }
  return seedData()
}

/** Datos guardados antes de existir las marcas: las por defecto más las que ya usan productos y proveedores */
function legacyBrands(d: AppData, defaults: AppData['brands']): AppData['brands'] {
  const names = new Set(defaults.map(b => b.name))
  const extra = [...(d.products ?? []).map(p => p.brand), ...(d.suppliers ?? []).flatMap(s => s.brands)].filter(n => n && !names.has(n) && names.add(n))
  return [...defaults, ...extra.map((name, i) => ({ id: 'bl' + i, name, color: '#8A837C' }))]
}

/** Datos guardados antes de poder crear categorías: las por defecto más las que ya usan los productos */
function legacyCategories(d: AppData, defaults: AppData['categories']): AppData['categories'] {
  const names = new Set(defaults.map(c => c.name))
  const extra = (d.products ?? []).map(p => p.cat).filter(n => n && !names.has(n) && names.add(n))
  return [...defaults, ...extra.map((name, i) => ({ id: 'cl' + i, name }))]
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const remote = isRemote()
  const [data, setData] = useState<AppData>(load)
  const [toastMsg, setToastMsg] = useState('')
  const [sync, setSync] = useState<AppCtx['sync']>({ status: remote ? 'idle' : 'ready', error: '', saving: false })
  const dataRef = useRef(data)
  dataRef.current = data
  const tm = useRef<number | undefined>(undefined)
  // Cola de guardado: las acciones se envían en orden, una tras otra
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(0)
  // Cada carga lleva un número: si llega una más vieja que la última pedida, se descarta
  const loadSeq = useRef(0)

  useEffect(() => {
    if (remote) return
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignorar */ }
  }, [data, remote])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(tm.current)
    tm.current = window.setTimeout(() => setToastMsg(''), 3400)
  }, [])

  const reload = useCallback(async () => {
    if (!remote) return
    const n = ++loadSeq.current
    setSync(s => ({ ...s, status: s.status === 'ready' ? 'ready' : 'loading', error: '' }))
    try {
      const d = await loadAppData(getRepositories())
      // Si mientras tanto se encoló otra acción, se espera a la recarga que hará ella
      if (n !== loadSeq.current || pending.current > 0) return
      dataRef.current = d
      setData(d)
      setSync(s => ({ ...s, status: 'ready', error: '' }))
    } catch (e) {
      if (n !== loadSeq.current) return
      setSync(s => (s.status === 'ready' ? s : { ...s, status: 'error', error: errMsg(e) }))
      toast('No se pudieron cargar los datos: ' + errMsg(e))
    }
  }, [remote, toast])

  // Al cambiar de usuario se descarta lo cargado (puede tener otros permisos)
  useEffect(() => {
    if (!remote) return
    return subscribeUserChange(() => {
      loadSeq.current++
      const s = seedData()
      dataRef.current = s
      setData(s)
      setSync({ status: 'idle', error: '', saving: false })
    })
  }, [remote])

  const commit = useCallback((fn: (d: AppData) => Result, persist?: Persist) => {
    const before = dataRef.current
    const r = fn(before)
    if (r.error) { toast(r.error); return false }
    if (remote && !persist) { toast('Esta acción todavía no se guarda en la base de datos'); return false }
    dataRef.current = r.data
    setData(r.data)
    if (r.msg) toast(r.msg)
    if (remote && persist) {
      pending.current++
      setSync(s => ({ ...s, saving: true }))
      queue.current = queue.current.then(async () => {
        try { await persist(getRepositories(), before, r.data) }
        catch (e) { toast('No se guardó: ' + errMsg(e)) }
        finally {
          pending.current--
          if (pending.current === 0) { setSync(s => ({ ...s, saving: false })); await reload() }
        }
      })
    }
    return true
  }, [toast, remote, reload])

  const reset = useCallback(() => {
    if (remote) { void reload(); return }
    const s = seedData()
    dataRef.current = s
    setData(s)
    toast('Datos locales borrados')
  }, [toast, remote, reload])

  const carRows = useMemo(() => buildCarRows(data), [data])

  return <Ctx.Provider value={{ data, carRows, commit, toast, toastMsg, reset, sync, reload }}>{children}</Ctx.Provider>
}

export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp debe usarse dentro de AppStoreProvider')
  return c
}

/** Convierte el resultado de un caso de uso en excepción (para usarlo dentro de un Persist) */
export function must<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error)
  return r.value
}
