import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const inputCls = 'h-11 md:h-10 w-full min-w-0 rounded-md border border-sand-dark bg-white px-3 text-base md:text-sm text-ink placeholder:text-stone'

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={'text-[11px] font-normal uppercase tracking-[0.22em] text-char ' + className}>{children}</span>
}

export function Field({ label, children, className = '' }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={'flex min-w-0 flex-col gap-1.5 ' + className}>
      <Label>{label}</Label>
      {children}
    </label>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputCls + ' ' + className} {...rest} />
}

export function TextArea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputCls + ' h-auto py-2.5 leading-normal resize-y ' + className} {...rest} />
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }
export function Select({ options, className = '', ...rest }: SelectProps) {
  return (
    <select className={inputCls + ' pr-8 ' + className} {...rest}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
