import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'

type Variant = 'outline' | 'dark' | 'ghost' | 'danger'
type Size = 'md' | 'sm' | 'icon' | 'lg'

const base = 'inline-flex items-center justify-center gap-2 rounded-md border font-medium whitespace-nowrap transition-colors disabled:opacity-50 select-none'
const variants: Record<Variant, string> = {
  outline: 'border-char bg-transparent text-ink hover:bg-cream',
  dark: 'border-char bg-char text-cream hover:bg-ink',
  ghost: 'border-transparent bg-transparent text-ink hover:border-sand',
  danger: 'border-bad bg-bad text-cream hover:bg-[#8E4C3E]',
}
const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-[13px]',
  lg: 'h-12 px-5 text-sm font-semibold',
  sm: 'h-11 md:h-8 px-3 text-xs gap-1.5',
  icon: 'h-11 w-11 md:h-8 md:w-8 p-0',
}

export const btnCls = (variant: Variant = 'outline', size: Size = 'md', extra = '') =>
  [base, variants[variant], sizes[size], extra].join(' ')

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export function Button({ variant = 'outline', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={btnCls(variant, size, className)} {...rest} />
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }
export function ButtonLink({ variant = 'outline', size = 'md', className = '', ...rest }: LinkProps) {
  return <a className={btnCls(variant, size, className)} target="_blank" rel="noopener noreferrer" {...rest} />
}
