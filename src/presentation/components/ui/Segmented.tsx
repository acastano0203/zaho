interface Props<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
  full?: boolean
}

export function Segmented<T extends string>({ options, value, onChange, label, full }: Props<T>) {
  return (
    <div role="group" aria-label={label}
      className={'no-scrollbar inline-flex max-w-full overflow-x-auto rounded-md border border-char ' + (full ? 'w-full sm:w-auto' : 'self-start')}>
      {options.map(o => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={o.value === value}
          className={'h-11 md:h-[38px] flex-1 px-3 sm:px-4 text-[13px] whitespace-nowrap transition-colors sm:flex-none ' +
            (o.value === value ? 'bg-char text-cream' : 'bg-transparent text-ink hover:bg-cream')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
