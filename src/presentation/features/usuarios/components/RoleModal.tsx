import { useState } from 'react'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label } from '../../../components/ui/Field'
import { Box } from '../../../components/ui/Display'
import type { PermisoClave } from '../../../../domain/entities'
import { ACCIONES, MODULOS, clavePermiso, normalizarPermisos } from '../../../../domain/rules/permisos'
import { useAccessActions, useAccessData } from '../hooks/useAccess'

const check = 'h-5 w-5 cursor-pointer accent-[#3E3A38] disabled:cursor-not-allowed disabled:opacity-30'

export function RoleModal({ id }: { id?: string }) {
  const ui = useUI()
  const { roles } = useAccessData()
  const { guardarRol } = useAccessActions()
  const r = id ? roles.find(x => x.id === id) : null
  const [nombre, setNombre] = useState(r?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(r?.descripcion ?? '')
  const [perms, setPerms] = useState<Set<PermisoClave>>(new Set(r?.permisos ?? []))
  const [busy, setBusy] = useState(false)
  const admin = !!r?.esAdmin

  const toggle = (k: PermisoClave) => {
    const s = new Set(perms)
    if (s.has(k)) {
      s.delete(k)
      // sin "ver" no se puede hacer nada más en el módulo
      if (k.endsWith('.ver')) { const m = k.split('.')[0]; ACCIONES.forEach(a => s.delete(clavePermiso(m, a.key))) }
    } else s.add(k)
    setPerms(new Set(normalizarPermisos([...s])))
  }

  const toggleModulo = (key: string, acciones: string[]) => {
    const all = acciones.every(a => perms.has(key + '.' + a))
    const s = new Set(perms)
    acciones.forEach(a => (all ? s.delete(key + '.' + a) : s.add(key + '.' + a)))
    setPerms(s)
  }

  async function submit() {
    setBusy(true)
    const ok = await guardarRol({ id, nombre, descripcion, permisos: [...perms] })
    setBusy(false)
    if (ok) ui.closeModal()
  }

  return (
    <Modal kicker="Roles" title={id ? 'Editar rol' : 'Crear rol'} onClose={ui.closeModal}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Nombre del rol">
          <Input value={nombre} onChange={e => setNombre(e.target.value)} disabled={r?.esSistema} autoFocus={!id}
            placeholder="Ej. Bodeguero" className={r?.esSistema ? 'bg-paper text-taupe' : ''} />
        </Field>
        <Field label="Descripción"><Input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Qué hace este rol" /></Field>
      </div>

      {admin ? (
        <Box><p className="text-[13px] text-char">El rol <b>Administrador</b> tiene acceso total a todos los módulos. Sus permisos no se pueden limitar.</p></Box>
      ) : (
        <div className="flex flex-col gap-2">
          <Label>Permisos por módulo</Label>
          <div className="overflow-hidden rounded-md border border-linen">
            <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-x-1 border-b border-linen bg-paper px-3 py-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,58px)]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-taupe">Módulo</span>
              {ACCIONES.map(a => <span key={a.key} className="text-center text-[10px] uppercase tracking-[0.12em] text-taupe">{a.label}</span>)}
            </div>
            {MODULOS.map(m => {
              const n = m.acciones.filter(a => perms.has(clavePermiso(m.key, a))).length
              const ayuda = Object.entries(m.ayuda ?? {}).map(([a, t]) => ACCIONES.find(x => x.key === a)?.label + ': ' + t).join(' · ')
              return (
                <div key={m.key} className="grid grid-cols-[minmax(0,1fr)_repeat(4,44px)] items-center gap-x-1 border-b border-line px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_repeat(4,58px)]">
                  <button type="button" onClick={() => toggleModulo(m.key, m.acciones)} className="min-w-0 text-left" title="Marcar o desmarcar todo el módulo">
                    <span className={'block truncate text-[13px] ' + (n ? 'font-semibold text-ink' : 'text-char')}>{m.label}</span>
                    {ayuda && <span className="block truncate text-[11px] text-taupe">{ayuda}</span>}
                  </button>
                  {ACCIONES.map(a => {
                    const k = clavePermiso(m.key, a.key)
                    const exists = m.acciones.includes(a.key)
                    return (
                      <span key={a.key} className="flex justify-center">
                        {exists
                          ? <input type="checkbox" className={check} checked={perms.has(k)} onChange={() => toggle(k)} aria-label={a.label + ' ' + m.label} />
                          : <span className="text-stone">—</span>}
                      </span>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-taupe">Toca el nombre de un módulo para marcarlo completo. Al marcar crear, editar o eliminar se agrega “ver” automáticamente.</p>
        </div>
      )}

      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" disabled={busy} onClick={() => void submit()}>{busy ? 'Guardando…' : id ? 'Guardar' : 'Crear rol'}</Button>
      </ModalActions>
    </Modal>
  )
}
