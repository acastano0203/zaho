import { cop, num } from '../../lib/format'
import { inputCls } from './Field'

interface Props { value: string; onChange: (raw: string) => void; placeholder?: string; className?: string; ariaLabel?: string }

/** Input de pesos: muestra $12.000 y guarda solo los dígitos */
export function MoneyInput({ value, onChange, placeholder = '$0', className = '', ariaLabel }: Props) {
  return (
    <input inputMode="numeric" aria-label={ariaLabel} placeholder={placeholder}
      className={inputCls + ' font-semibold ' + className}
      value={value ? cop(num(value)) : ''}
      onChange={e => onChange(String(num(e.target.value) || ''))} />
  )
}
