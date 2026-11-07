import type { Templates } from '../types'

export const templates: Templates = {
  recordatorio: 'Hola {nombre}, te escribimos de ZAHO. Tu saldo de ${saldo} vence el {fecha}. Puedes pagar por Nequi o Bancolombia. Cualquier cosa nos escribes. Gracias.',
  vencida: 'Hola {nombre}, te escribimos de ZAHO. Tu saldo de ${saldo} venció el {fecha}. ¿Nos ayudas a ponerte al día esta semana? Puedes pagar por Nequi o Bancolombia. Gracias.',
  gracias: 'Hola {nombre}, recibimos tu pago. Tu cuenta con ZAHO quedó al día. Gracias por la confianza.',
  prestamo: 'Hola {nombre}, te escribimos de ZAHO. Te recordamos que el préstamo de ${saldo} se devuelve el {fecha}. Puedes hacerlo por Nequi o Bancolombia. Gracias.',
}
