import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export const IconPlus = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>
export const IconMinus = (p: P) => <Base {...p}><path d="M5 12h14" /></Base>
export const IconX = (p: P) => <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>
export const IconEdit = (p: P) => <Base {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /></Base>
export const IconTrash = (p: P) => <Base {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></Base>
export const IconChevron = (p: P) => <Base {...p}><path d="M6 9l6 6 6-6" /></Base>
export const IconBell = (p: P) => <Base {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></Base>
export const IconAdjust = (p: P) => <Base {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Base>
export const IconTransfer = (p: P) => <Base {...p}><path d="M4 8h14l-3-3M20 16H6l3 3" /></Base>
export const IconLoan = (p: P) => <Base {...p}><path d="M4 8h13l-3-3M20 16H7l3 3" /></Base>
export const IconReceipt = (p: P) => <Base {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></Base>
export const IconDoc = (p: P) => <Base {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></Base>
export const IconReset = (p: P) => <Base {...p}><path d="M4 4v6h6" /><path d="M20 12a8 8 0 1 1-2.3-5.7L20 9" /></Base>

/* Módulos */
export const IconBag = (p: P) => <Base {...p}><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Base>
export const IconContacts = (p: P) => <Base {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2.2" /><path d="M5.8 16c.5-1.6 1.7-2.5 3.2-2.5s2.7.9 3.2 2.5M15 10h3M15 13.5h3" /></Base>
export const IconBox = (p: P) => <Base {...p}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></Base>
export const IconWallet = (p: P) => <Base {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></Base>
export const IconTruck = (p: P) => <Base {...p}><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Base>
export const IconOut = (p: P) => <Base {...p}><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></Base>
export const IconTeam = (p: P) => <Base {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.6c2.3.3 3.9 2 4.5 4.9" /></Base>
export const IconChart = (p: P) => <Base {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16V6" /></Base>

export function WaIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path fill="#25D366" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
      <path fill="#fff" d="M8.6 7.5c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.1.2-.2.3 0 .6.4.7 1 1.4 1.7 1.9.7.5 1.2.7 1.5.8.2.1.4 0 .5-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.4.4 0 .5-.2 1.2-.6 1.5-.5.4-1.2.7-2 .6-1-.1-2.4-.6-3.9-1.9-1.6-1.4-2.6-3-2.9-4.1-.3-1.1.1-1.9.4-2.3z" />
    </svg>
  )
}

/** Trazo del logo ZAHO */
export function LogoMark({ className = '', stroke = 'currentColor', width = 30, height = 34 }: { className?: string; stroke?: string; width?: number | string; height?: number | string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 120 140" fill="none" aria-hidden="true" className={className}>
      <path d="M18 22C46 12 78 12 100 18C74 50 48 82 24 112C52 104 84 102 106 108C120 113 116 132 98 138C86 142 76 134 82 124"
        stroke={stroke} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
