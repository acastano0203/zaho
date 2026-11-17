import { useMemo } from 'react'
import { useApp } from '../../../store/AppStore'
import { libroCaja, resumenCuentas } from '../../../../domain/rules/caja'
import { today } from '../../../../shared/lib/dates'
import { num } from '../../../../shared/lib/format'
import {
  eliminarArqueo, eliminarCuenta, eliminarMovimiento, guardarCuenta, registrarArqueo, registrarIngreso, registrarTraslado,
  type ArqueoForm, type CuentaForm, type IngresoForm, type TrasladoForm,
} from '../services/cajaService'

/** Libro de caja completo y resumen por cuenta */
export function useCaja() {
  const { data } = useApp()
  return useMemo(() => {
    const T = today()
    const lineas = libroCaja(data)
    const cuentas = resumenCuentas(data, lineas, T)
    const total = cuentas.reduce((a, c) => a + c.saldo, 0)
    const entradasHoy = cuentas.reduce((a, c) => a + c.entradasHoy, 0)
    const salidasHoy = cuentas.reduce((a, c) => a + c.salidasHoy, 0)
    const ultimoArqueo = (cuentaId: string) => data.cierres.filter(x => x.cuentaId === cuentaId).sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    return { lineas, cuentas, total, entradasHoy, salidasHoy, ultimoArqueo, cierres: data.cierres, todas: data.cuentas }
  }, [data])
}

/** Lo que el service agregó a una lista (para guardarlo en la base) */
const added = <T extends { id: string }>(before: T[], after: T[]) => after.filter(x => !before.some(y => y.id === x.id))

export function useCajaActions() {
  const { commit } = useApp()
  return {
    ingreso: (f: IngresoForm) => commit(d => registrarIngreso(d, f), async (r, before, after) => {
      for (const m of added(before.movCaja, after.movCaja)) await r.caja.addMovement(m)
    }),
    traslado: (f: TrasladoForm) => commit(d => registrarTraslado(d, f),
      r => r.caja.transfer(f.desde, f.hasta, num(f.val), f.date, f.concepto.trim())),
    arqueo: (f: ArqueoForm) => commit(d => registrarArqueo(d, f), async (r, before, after) => {
      const c = added(before.cierres, after.cierres)[0]
      if (c) await r.caja.count(c.cuentaId, c.saldoContado, c.conteo, c.nota)
    }),
    eliminarArqueo: (id: string) => commit(d => eliminarArqueo(d, id), r => r.caja.removeCount(id)),
    eliminarMovimiento: (id: string) => commit(d => eliminarMovimiento(d, id), async (r, before) => {
      const m = before.movCaja.find(x => x.id === id)
      if (m?.cierreId) await r.caja.removeCount(m.cierreId)
      else await r.caja.removeMovement(id)
    }),
    guardarCuenta: (f: CuentaForm) => commit(d => guardarCuenta(d, f), async (r, before, after) => {
      const nueva = added(before.cuentas, after.cuentas)[0]
      const c = nueva ?? after.cuentas.find(x => x.id === f.id)
      if (c) await r.caja.saveAccount(c, !!nueva)
    }),
    eliminarCuenta: (id: string) => commit(d => eliminarCuenta(d, id), r => r.caja.removeAccount(id)),
  }
}
