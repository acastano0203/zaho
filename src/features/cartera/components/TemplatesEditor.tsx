import { useApp } from '../../../store/AppStore'
import { Field, TextArea } from '../../../components/ui/Field'
import { SubTitle } from '../../../components/ui/Display'
import type { TemplateKey } from '../../../types'
import { useCarteraActions } from '../hooks/useCartera'

const KEYS: [TemplateKey, string][] = [
  ['recordatorio', 'Recordatorio antes de vencer'],
  ['vencida', 'Cobro de deuda vencida'],
  ['gracias', 'Agradecimiento por pago'],
  ['prestamo', 'Recordatorio de préstamo'],
]

export function TemplatesEditor() {
  const { data } = useApp()
  const { template } = useCarteraActions()
  return (
    <section>
      <SubTitle>Plantillas guardadas</SubTitle>
      <p className="-mt-1.5 mb-3 text-[13px] text-taupe">Variables: {'{nombre}'}, {'${saldo}'}, {'{fecha}'}. Se usan al cobrar por WhatsApp.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {KEYS.map(([k, label]) => (
          <Field key={k} label={label}>
            <TextArea rows={6} value={data.tpls[k]} onChange={e => template(k, e.target.value)} />
          </Field>
        ))}
      </div>
    </section>
  )
}
