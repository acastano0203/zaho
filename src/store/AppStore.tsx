import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, CarRow } from '../types'
import { seedData } from '../data'
import { buildCarRows } from '../lib/finance'

const KEY = 'zaho-data-v2'

/** Lo que devuelve cada service: el nuevo estado y un mensaje opcional */
export interface Result { data: AppData; msg?: string; error?: string }

interface AppCtx {
  data: AppData
  carRows: CarRow[]
  /** Aplica un service. Devuelve true si no hubo error. */
  commit: (fn: (d: AppData) => Result) => boolean
  toast: (msg: string) => void
  toastMsg: string
  reset: () => void
}

const Ctx = createContext<AppCtx | null>(null)

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as AppData
  } catch { /* sin almacenamiento */ }
  return seedData()
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)
  const [toastMsg, setToastMsg] = useState('')
  const dataRef = useRef(data)
  dataRef.current = data
  const tm = useRef<number | undefined>(undefined)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignorar */ }
  }, [data])

  const toast = useCallback((msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(tm.current)
    tm.current = window.setTimeout(() => setToastMsg(''), 3400)
  }, [])

  const commit = useCallback((fn: (d: AppData) => Result) => {
    const r = fn(dataRef.current)
    if (r.error) { toast(r.error); return false }
    dataRef.current = r.data
    setData(r.data)
    if (r.msg) toast(r.msg)
    return true
  }, [toast])

  const reset = useCallback(() => {
    const s = seedData()
    dataRef.current = s
    setData(s)
    toast('Datos de ejemplo restablecidos')
  }, [toast])

  const carRows = useMemo(() => buildCarRows(data), [data])

  return <Ctx.Provider value={{ data, carRows, commit, toast, toastMsg, reset }}>{children}</Ctx.Provider>
}

export function useApp() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp debe usarse dentro de AppStoreProvider')
  return c
}
