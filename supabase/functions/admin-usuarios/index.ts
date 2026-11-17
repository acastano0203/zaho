/**
 * Edge Function: admin-usuarios
 * ---------------------------------------------------------------
 * Operaciones que requieren la SERVICE ROLE KEY de Supabase y por eso
 * no pueden hacerse desde el navegador:
 *   · crear      → crea el usuario en Auth (el trigger crea su perfil con el rol)
 *   · password   → cambia la contraseña de un usuario
 *   · estado     → activa / desactiva (bloquea el inicio de sesión en Auth)
 *   · eliminar   → borra el usuario (su historial se conserva sin autor)
 *
 * Seguridad: se valida el JWT de quien llama y sus permisos con la RPC mi_sesion().
 *
 * Desplegar:  npx supabase functions deploy admin-usuarios
 * (SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase)
 */
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordError = (p: unknown) =>
  typeof p !== 'string' || p.length < 8 ? 'La contraseña debe tener al menos 8 caracteres'
    : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? 'La contraseña debe tener letras y números' : null

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ¿Quién llama y qué puede hacer?
  const { data: sesion, error: eSes } = await caller.rpc('mi_sesion')
  if (eSes || !sesion?.activo) return json({ error: 'Sesión no válida' }, 401)
  const permisos: string[] = sesion.permisos ?? []
  const puede = (p: string) => permisos.includes(p)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Cuerpo inválido' }, 400) }

  try {
    switch (body.action) {
      case 'crear': {
        if (!puede('usuarios.crear')) return json({ error: 'No tienes permiso para crear usuarios' }, 403)
        const email = String(body.email ?? '').trim().toLowerCase()
        const nombre = String(body.nombre ?? '').trim()
        if (!nombre) return json({ error: 'Escribe el nombre' }, 400)
        if (!EMAIL.test(email)) return json({ error: 'Correo inválido' }, 400)
        const pe = passwordError(body.password)
        if (pe) return json({ error: pe }, 400)

        const { data: rol } = await admin.from('roles').select('id, es_admin').eq('id', body.rol_id).single()
        if (!rol) return json({ error: 'Rol no encontrado' }, 400)
        if (rol.es_admin && !sesion.rol?.es_admin) return json({ error: 'Solo un administrador puede crear administradores' }, 403)

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: body.password as string,
          email_confirm: true,
          user_metadata: { nombre, telefono: body.telefono ?? '' },
          // app_metadata solo lo puede escribir la service key: el trigger confía en él
          app_metadata: { rol_id: rol.id, comercial_id: body.comercial_id || '' },
        })
        if (error) return json({ error: error.message.includes('already') ? 'Ya existe un usuario con ese correo' : error.message }, 400)
        return json({ id: data.user.id })
      }

      case 'password': {
        const propio = body.user_id === sesion.id
        if (!propio && !puede('usuarios.editar')) return json({ error: 'No tienes permiso para cambiar contraseñas' }, 403)
        const pe = passwordError(body.password)
        if (pe) return json({ error: pe }, 400)
        const { error } = await admin.auth.admin.updateUserById(String(body.user_id), { password: body.password as string })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'estado': {
        if (!puede('usuarios.eliminar')) return json({ error: 'No tienes permiso para activar o desactivar usuarios' }, 403)
        if (body.user_id === sesion.id) return json({ error: 'No puedes desactivarte a ti mismo' }, 400)
        const activo = !!body.activo
        // Primero el perfil: el trigger impide dejar la app sin administradores
        const { error: eP } = await admin.from('perfiles').update({ activo }).eq('id', body.user_id)
        if (eP) return json({ error: eP.message }, 400)
        const { error } = await admin.auth.admin.updateUserById(String(body.user_id), { ban_duration: activo ? 'none' : '876000h' })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'eliminar': {
        if (!puede('usuarios.eliminar')) return json({ error: 'No tienes permiso para eliminar usuarios' }, 403)
        if (body.user_id === sesion.id) return json({ error: 'No puedes eliminar tu propio usuario' }, 400)
        const { data: perfil } = await admin.from('perfiles').select('id, activo, roles(es_admin)').eq('id', body.user_id).single()
        if (!perfil) return json({ error: 'Usuario no encontrado' }, 404)
        const esAdmin = !!(perfil.roles as { es_admin?: boolean } | null)?.es_admin
        if (esAdmin && !sesion.rol?.es_admin) return json({ error: 'Solo un administrador puede eliminar administradores' }, 403)
        if (esAdmin && perfil.activo) {
          const { count } = await admin.from('perfiles').select('id, roles!inner(es_admin)', { count: 'exact', head: true })
            .eq('activo', true).eq('roles.es_admin', true)
          if ((count ?? 0) <= 1) return json({ error: 'Debe quedar al menos un administrador activo' }, 400)
        }
        // Borra la cuenta de Auth: el perfil cae en cascada y su historial queda sin autor
        const { error } = await admin.auth.admin.deleteUser(String(body.user_id))
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      default:
        return json({ error: 'Acción desconocida' }, 400)
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
