import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Button } from '../../../components/ui/Button'
import { IconEdit, IconPlus } from '../../../components/ui/Icons'
import { cop } from '../../../../shared/lib/format'
import { fd } from '../../../../shared/lib/dates'
import type { TipoCuenta } from '../../../../domain/entities'
import { useCaja } from '../hooks/useCaja'

export const TIPO_CUENTA: Record<TipoCuenta, string> = { efectivo: 'Efectivo', billetera: 'Billetera digital', banco: 'Banco' }

/** Una tarjeta por cuenta con su saldo actual y lo que entró y salió hoy */
export function CuentasCards() {
  const ui = useUI()
  const { can } = useSession()
  const { cuentas, total, ultimoArqueo } = useCaja()

  return (
    <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {cuentas.map(({ cuenta: c, saldo, entradasHoy, salidasHoy }) => {
        const ult = ultimoArqueo(c.id)
        return (
          <div key={c.id} className="flex min-w-0 flex-col gap-1.5 rounded-md border border-linen bg-paper p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block truncate text-[11px] uppercase tracking-[0.22em] text-char">{c.nombre}</span>
                <span className="text-[11px] text-taupe">{TIPO_CUENTA[c.tipo]}{c.metodos.length ? ' · ' + c.metodos.join(', ') : ''}</span>
              </div>
              {can('caja.editar') && (
                <Button size="sm" variant="ghost" className="md:w-8 md:px-0" aria-label={'Editar ' + c.nombre} title="Editar cuenta"
                  onClick={() => ui.openModal({ type: 'cuenta', id: c.id })}><IconEdit size={15} /></Button>
              )}
            </div>
            <span className={'font-display text-lg tabular ' + (saldo < 0 ? 'text-bad' : 'text-ink')}>{cop(saldo)}</span>
            <span className="text-xs text-taupe tabular">Hoy <span className="text-util">+{cop(entradasHoy)}</span> · <span className="text-bad">−{cop(salidasHoy)}</span></span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-taupe">{ult ? 'Arqueo ' + fd(ult.date) + (ult.saldoContado === ult.saldoSistema ? ' · cuadró' : ' · con diferencia') : 'Sin arqueos'}</span>
              {can('caja.editar') && <Button size="sm" onClick={() => ui.openModal({ type: 'arqueo', cuentaId: c.id })}>Arqueo</Button>}
            </div>
          </div>
        )
      })}
      <div className="flex min-w-0 flex-col justify-between gap-2 rounded-md border border-char bg-char p-4 text-sand">
        <span className="text-[11px] uppercase tracking-[0.22em] text-fog">Total disponible</span>
        <span className="font-display text-lg text-cream tabular">{cop(total)}</span>
        {can('caja.editar') && (
          <button type="button" onClick={() => ui.openModal({ type: 'cuenta' })}
            className="inline-flex h-9 items-center gap-1.5 self-start text-xs text-sand underline underline-offset-4 hover:text-cream">
            <IconPlus size={14} />Agregar cuenta
          </button>
        )}
      </div>
    </div>
  )
}
