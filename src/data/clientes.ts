import type { Cliente } from '../types'
import { plus } from '../lib/dates'

export const clientes: Cliente[] = [
  { id: 'k1', name: 'Laura Gómez', phone: '3014452210', doc: '1037654321', city: 'Envigado', note: 'Talla M en blusas, prefiere pagar por Nequi', created: plus(-60) },
  { id: 'k2', name: 'Paula Herrera', phone: '3167721098', doc: '43987654', city: 'Itagüí', note: 'Llamar después de las 5 p.m.', created: plus(-40) },
  { id: 'k3', name: 'Daniela Mejía', phone: '3001239876', doc: '1152345678', city: 'El Poblado', note: 'Compra para su tienda en Rionegro', created: plus(-20) },
]
