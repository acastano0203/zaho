interface ChipProps { label: string; on?: boolean; onClick: () => void }

export function Chip({ label, on, onClick }: ChipProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={!!on}
      className={'h-10 md:h-8 shrink-0 rounded-md border px-3 text-xs whitespace-nowrap transition-colors ' +
        (on ? 'border-char bg-char text-cream' : 'border-stone bg-transparent text-char hover:bg-cream')}>
      {label}
    </button>
  )
}

interface ChipsProps<T extends string> { options: { value: T; label: string }[]; value?: T; onChange: (v: T) => void; scroll?: boolean }

/** Grupo de chips. En móvil puede hacer scroll horizontal. */
export function Chips<T extends string>({ options, value, onChange, scroll }: ChipsProps<T>) {
  return (
    <div className={'flex gap-1.5 ' + (scroll ? 'no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0' : 'flex-wrap')}>
      {options.map(o => <Chip key={o.value} label={o.label} on={o.value === value} onClick={() => onChange(o.value)} />)}
    </div>
  )
}
