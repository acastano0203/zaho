import type { ReactNode } from 'react'
import { LogoMark } from './Icons'

export function Dot({ color, className = '' }: { color: string; className?: string }) {
  return <span className={'inline-block h-2 w-2 shrink-0 rounded-full ' + className} style={{ background: color }} />
}

export function Pill({ color, children, big }: { color: string; children: ReactNode; big?: boolean }) {
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-md border border-linen bg-white px-2.5 text-xs whitespace-nowrap text-ink ' + (big ? 'h-8 text-[13px] font-semibold' : 'h-6')}>
      <Dot color={color} />{children}
    </span>
  )
}

export function Card({ children, className = '', dark }: { children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={'flex min-w-0 flex-col gap-1.5 rounded-md border p-4 ' + (dark ? 'border-char bg-char text-sand' : 'border-linen bg-paper') + ' ' + className}>
      {children}
    </div>
  )
}

export function KpiCard({ label, value, sub, valueClass = '', dark }: { label: string; value: ReactNode; sub?: ReactNode; valueClass?: string; dark?: boolean }) {
  return (
    <Card dark={dark}>
      <span className={'text-[11px] uppercase tracking-[0.22em] ' + (dark ? 'text-fog' : 'text-char')}>{label}</span>
      <span className={'font-display text-lg tabular ' + (dark ? 'text-cream' : 'text-ink') + ' ' + valueClass}>{value}</span>
      {sub && <span className={'text-[13px] ' + (dark ? 'text-sand' : 'text-taupe')}>{sub}</span>}
    </Card>
  )
}

export function Stat({ label, value, sub, plain }: { label: string; value: ReactNode; sub?: ReactNode; plain?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-linen bg-paper px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-char">{label}</span>
      <span className={'truncate text-ink tabular ' + (plain ? 'font-bold' : 'font-display text-sm')}>{value}</span>
      {sub && <span className="truncate text-xs text-taupe">{sub}</span>}
    </div>
  )
}

export function Progress({ value, lg, className = '' }: { value: number; lg?: boolean; className?: string }) {
  return (
    <span className={'block min-w-10 flex-1 overflow-hidden bg-sand ' + (lg ? 'h-3 rounded-md' : 'h-2 rounded') + ' ' + className}>
      <span className="block h-full bg-char transition-[width] duration-300" style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
    </span>
  )
}

export function Bar({ value, color = '#3E3A38' }: { value: number; color?: string }) {
  return (
    <div className="h-5 overflow-hidden rounded border border-linen bg-cream">
      <div className="h-full" style={{ width: value + '%', background: color }} />
    </div>
  )
}

export function Empty({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={'relative overflow-hidden rounded-md border border-dashed border-sand p-6 text-center text-[13px] text-taupe ' + className}>
      <LogoMark className="pointer-events-none absolute -top-8 -right-5 opacity-5" width={150} height={150} />
      {children}
    </div>
  )
}

export function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={'flex items-center justify-between gap-3 py-2.5 ' + (strong ? 'mt-1 border-t border-char pt-3 font-bold text-ink' : 'border-t border-line')}>
      <span className={strong ? '' : 'text-taupe'}>{label}</span>
      <span className="text-right font-semibold text-ink tabular">{value}</span>
    </div>
  )
}

export function Box({ children, warn, className = '' }: { children: ReactNode; warn?: boolean; className?: string }) {
  return (
    <div className={'flex flex-col gap-3 rounded-md border p-3.5 ' + (warn ? 'border-warn bg-[#FBF5EA]' : 'border-linen bg-paper') + ' ' + className}>
      {children}
    </div>
  )
}

export function Stepper({ value, onDec, onInc, small }: { value: number; onDec: () => void; onInc: () => void; small?: boolean }) {
  const btn = small ? 'h-10 w-9 md:h-8 md:w-8' : 'h-11 w-11 md:h-10 md:w-10'
  return (
    <div className="inline-flex items-center self-start rounded-md border border-stone">
      <button type="button" onClick={onDec} className={btn + ' inline-flex items-center justify-center'} aria-label="Menos">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <span className={(small ? 'min-w-7' : 'min-w-10') + ' text-center font-bold tabular'}>{value}</span>
      <button type="button" onClick={onInc} className={btn + ' inline-flex items-center justify-center'} aria-label="Más">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}

export function Switch({ on, onClick, label, dark }: { on: boolean; onClick: () => void; label: string; dark?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label}
      className={'relative h-[22px] w-10 shrink-0 rounded-full border transition-colors ' +
        (on ? 'border-char bg-char' : dark ? 'border-sand-dark bg-linen' : 'border-stone bg-linen')}>
      <span className={'absolute top-[2px] h-4 w-4 rounded-full transition-all ' + (on ? 'left-5 bg-sand' : 'left-[2px] bg-stone')} />
    </button>
  )
}

export function SubTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={'mt-7 mb-3 font-display text-sm tracking-wide text-ink ' + className}>{children}</h2>
}
