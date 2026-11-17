import { useState, type FormEvent, type ReactNode } from 'react'
import { useSession } from '../store/SessionStore'
import { Field, Input } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { LogoMark } from '../components/ui/Icons'
import { isRemote } from '../../infrastructure/container'

function PasswordInput({ value, onChange, autoComplete, invalid }: { value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative flex">
      <Input type={show ? 'text' : 'password'} autoComplete={autoComplete} value={value}
        onChange={e => onChange(e.target.value)} className="pr-20" aria-invalid={invalid} />
      <button type="button" onClick={() => setShow(!show)} aria-pressed={show}
        className="absolute inset-y-0 right-0 px-3 text-xs text-taupe hover:text-ink">
        {show ? 'Ocultar' : 'Mostrar'}
      </button>
    </span>
  )
}

function Shell({ title, sub, onSubmit, children }: { title: string; sub?: string; onSubmit: (e: FormEvent) => void; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mist px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-ink">
          <LogoMark stroke="#3E3A38" width={44} height={50} />
          <span className="font-display text-[26px] leading-none tracking-[0.3em]">ZAHO</span>
          <span className="text-[10px] font-light uppercase tracking-[0.32em] text-taupe">Inventario · Tienda multimarca</span>
        </div>
        <form onSubmit={onSubmit} noValidate
          className="flex flex-col gap-4 rounded-md border border-linen bg-white p-5 shadow-[0_1px_0_#E8E2D9] sm:p-7">
          <div>
            <h1 className="font-display text-base tracking-wide text-ink">{title}</h1>
            {sub && <p className="mt-1.5 text-[13px] text-taupe">{sub}</p>}
          </div>
          {children}
        </form>
      </div>
    </div>
  )
}

const ErrorBox = ({ error }: { error: string }) =>
  error ? <p role="alert" className="rounded-md border border-bad/40 bg-[#F8EEEB] px-3 py-2.5 text-[13px] text-bad">{error}</p> : null

/** Primer arranque (modo local sin usuarios): crear el administrador */
function SetupForm() {
  const { configurar } = useSession()
  const [f, setF] = useState({ nombre: '', email: '', password: '', confirmacion: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const up = (p: Partial<typeof f>) => setF({ ...f, ...p })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const err = await configurar(f)
    if (err) { setError(err); setBusy(false) }
  }

  return (
    <Shell title="Crear administrador" sub="Es la primera vez que se abre la app. Crea la cuenta con acceso total." onSubmit={e => void submit(e)}>
      <Field label="Nombre completo"><Input autoFocus autoComplete="name" value={f.nombre} onChange={e => up({ nombre: e.target.value })} /></Field>
      <Field label="Correo"><Input type="email" inputMode="email" autoComplete="username" value={f.email} onChange={e => up({ email: e.target.value })} /></Field>
      <Field label="Contraseña"><PasswordInput autoComplete="new-password" value={f.password} onChange={v => up({ password: v })} /></Field>
      <Field label="Repite la contraseña"><PasswordInput autoComplete="new-password" value={f.confirmacion} onChange={v => up({ confirmacion: v })} /></Field>
      <p className="-mt-1 text-xs text-taupe">Mínimo 8 caracteres, con letras y números.</p>
      <ErrorBox error={error} />
      <Button type="submit" variant="dark" size="lg" disabled={busy} className="mt-1 w-full tracking-[0.2em]">
        {busy ? 'CREANDO…' : 'CREAR Y ENTRAR'}
      </Button>
    </Shell>
  )
}

function SignInForm() {
  const { entrar } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const err = await entrar(email, password)
    if (err) { setError(err); setBusy(false) }
    // si entra, el componente se desmonta
  }

  return (
    <Shell title="Iniciar sesión" onSubmit={e => void submit(e)}>
      <Field label="Correo">
        <Input type="email" inputMode="email" autoComplete="username" autoFocus value={email}
          onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" aria-invalid={!!error} />
      </Field>
      <Field label="Contraseña">
        <PasswordInput autoComplete="current-password" value={password} onChange={setPassword} invalid={!!error} />
      </Field>
      <ErrorBox error={error} />
      <Button type="submit" variant="dark" size="lg" disabled={busy} className="mt-1 w-full tracking-[0.2em]">
        {busy ? 'INGRESANDO…' : 'INGRESAR'}
      </Button>
      <p className="text-center text-xs text-taupe">
        ¿Olvidaste tu contraseña? Pídele al administrador que la cambie.
        {!isRemote() && <><br />Modo local: los datos se guardan solo en este navegador.</>}
      </p>
    </Shell>
  )
}

export default function LoginPage() {
  const { status } = useSession()
  return status === 'setup' ? <SetupForm /> : <SignInForm />
}
