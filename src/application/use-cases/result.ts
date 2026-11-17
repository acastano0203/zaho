/** Resultado uniforme de un caso de uso: la presentación solo muestra `msg` o `error`. */
export type UseCaseResult<T = void> =
  | { ok: true; value: T; msg?: string }
  | { ok: false; error: string }

export const ok = <T>(value: T, msg?: string): UseCaseResult<T> => ({ ok: true, value, msg })
export const fail = (error: string): UseCaseResult<never> => ({ ok: false, error })

/** Ejecuta una operación de infraestructura y convierte excepciones en errores legibles */
export async function attempt<T>(fn: () => Promise<T>, msg?: string | ((v: T) => string)): Promise<UseCaseResult<T>> {
  try {
    const v = await fn()
    return ok(v, typeof msg === 'function' ? msg(v) : msg)
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
}
