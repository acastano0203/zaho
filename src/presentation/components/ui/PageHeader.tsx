import type { ReactNode } from 'react'

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-lg tracking-wider text-ink md:text-[22px]">{title}</h1>
        {sub && <p className="mt-1.5 text-[13px] text-taupe">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
