import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { useSession } from '../../../store/SessionStore'
import { Drawer } from '../../../components/ui/Drawer'
import { Button } from '../../../components/ui/Button'
import { Dot, Pill, Stat } from '../../../components/ui/Display'
import { Label } from '../../../components/ui/Field'
import { IconAdjust, IconEdit, IconTransfer, IconTruck } from '../../../components/ui/Icons'
import { C, PROD_ST } from '../../../../shared/lib/constants'
import { fd, plus } from '../../../../shared/lib/dates'
import { cop, phone, plural } from '../../../../shared/lib/format'
import { productStatus, supplierOf } from '../../../../domain/rules/finance'
import { lineProduct, orderWarehouse, skuInOpenOrder, skuOf } from '../../../../domain/rules/pedidos'
import type { Product } from '../../../../domain/entities'

const ORDER_COLOR = { Enviado: C.warn, Confirmado: C.stone, Recibido: C.ok }

/** Detalle de un producto: stock por bodega, proveedor, pedidos y ventas */
export function ProductDrawer({ id }: { id: string }) {
  const { data } = useApp()
  const ui = useUI()
  const { can } = useSession()
  const p = data.products.find(x => x.id === id)
  if (!p) return null

  const sku = skuOf(p)
  const sameSku = (x: Product | undefined) => !!x && skuOf(x) === sku
  const bodegas = data.products.filter(x => skuOf(x) === sku).sort((a, b) => a.wh.localeCompare(b.wh, 'es'))
  const totalStock = bodegas.reduce((a, x) => a + x.stock, 0)
  const st = PROD_ST[productStatus(p)]
  const util = p.price - p.cost
  const sup = supplierOf(data, p)

  // Ventas de esta referencia (todas las bodegas)
  const ventas = data.sales
    .flatMap(s => s.items.filter(it => sameSku(lineProduct(data, it.pid))).map(it => ({ s, it, wh: lineProduct(data, it.pid)?.wh ?? '' })))
    .sort((a, b) => (a.s.date < b.s.date ? 1 : -1))
  const desde = plus(-30)
  const sold30 = ventas.filter(v => v.s.date >= desde).reduce((a, v) => a + v.it.qty, 0)
  const soldAll = ventas.reduce((a, v) => a + v.it.qty, 0)
  const ingresos = ventas.reduce((a, v) => a + v.it.qty * v.it.price, 0)

  // Pedidos que incluyen esta referencia
  const pedidos = data.orders
    .map(o => ({ o, qty: o.lines.filter(l => sameSku(lineProduct(data, l.pid))).reduce((a, l) => a + l.qty, 0) }))
    .filter(x => x.qty > 0)
    .sort((a, b) => (a.o.date < b.o.date ? 1 : -1))
  const enCamino = pedidos.filter(x => x.o.status !== 'Recibido')
  const puedePedir = !!sup && can('pedidos.crear') && !skuInOpenOrder(data, p)

  return (
    <Drawer wide kicker={p.code + ' · ' + p.brand + ' · ' + p.cat} title={p.name} onClose={ui.closeDrawer}
      footer={
        <>
          <span className="text-xs text-taupe">{p.wh}</span>
          <span className="flex flex-wrap justify-end gap-2">
            {can('inventario.editar') && <Button size="sm" onClick={() => ui.openModal({ type: 'adjust', pid: p.id })}><IconAdjust size={15} />Ajustar</Button>}
            {can('inventario.editar') && <Button size="sm" onClick={() => ui.openModal({ type: 'transfer', pid: p.id })}><IconTransfer size={15} />Trasladar</Button>}
            {can('inventario.editar') && <Button size="sm" variant="dark" onClick={() => ui.openModal({ type: 'product', id: p.id })}><IconEdit size={15} />Editar</Button>}
          </span>
        </>
      }>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-taupe">Talla <b className="text-ink">{p.size}</b> · Color <b className="text-ink">{p.color}</b> · {p.wh}</span>
        <Pill big color={st.color}>{st.label}</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Stock aquí" value={p.stock + ' und'} sub={'mínimo ' + p.min} />
        <Stat label="Stock total" value={totalStock + ' und'} sub={plural(bodegas.length, 'bodega', 'bodegas')} />
        <Stat label="Precio" value={cop(p.price)} sub={'costo ' + cop(p.cost)} />
        <Stat label="Utilidad" value={cop(util)} sub={p.price ? Math.round((util / p.price) * 100) + '% por unidad' : '—'} />
        <Stat label="Valor al costo" value={cop(p.stock * p.cost)} sub="de este stock" />
        <Stat label="Vendidas 30 d" value={sold30 + ' und'} sub={'histórico ' + soldAll} />
        <Stat label="Ingresos" value={cop(ingresos)} sub="en ventas" />
        <Stat label="En camino" value={enCamino.reduce((a, x) => a + x.qty, 0) + ' und'} sub={plural(enCamino.length, 'pedido', 'pedidos')} />
      </div>

      {/* Stock por bodega */}
      <div className="flex flex-col gap-2">
        <Label>Stock por bodega</Label>
        <ul className="rounded-md border border-linen bg-white">
          {bodegas.map(x => {
            const s = PROD_ST[productStatus(x)]
            return (
              <li key={x.id}>
                <button type="button" disabled={x.id === p.id} onClick={() => ui.openDrawer({ type: 'product', id: x.id })}
                  className={'flex w-full items-center justify-between gap-3 border-t border-line px-3 py-2.5 text-left first:border-t-0 ' + (x.id === p.id ? 'bg-cream' : 'hover:bg-mist')}>
                  <span className="flex min-w-0 items-center gap-2"><Dot color={s.color} /><span className="truncate text-ink">{x.wh}</span>{x.id === p.id && <span className="text-xs text-taupe">(viendo)</span>}</span>
                  <span className="text-[13px] tabular"><b className="text-ink">{x.stock}</b> <span className="text-taupe">/ mín {x.min}</span></span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Proveedor */}
      <div className="flex flex-col gap-2">
        <Label>Proveedor</Label>
        {sup ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-linen bg-paper p-3">
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{sup.name}</span>
              <span className="block text-xs text-taupe">{[sup.contact, sup.wa && phone(sup.wa), sup.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</span>
            </span>
            {puedePedir && <Button size="sm" variant="dark" onClick={() => ui.openModal({ type: 'order', sup: sup.id, firstPid: p.id })}><IconTruck size={15} />Pedir</Button>}
          </div>
        ) : <span className="text-xs text-warn">La marca {p.brand} no tiene proveedor asignado. Asígnala en Proveedores para poder pedirla.</span>}
      </div>

      {/* Pedidos */}
      <div className="flex flex-col gap-2">
        <Label>Pedidos</Label>
        {pedidos.length ? (
          <ul className="rounded-md border border-linen bg-white">
            {pedidos.slice(0, 8).map(({ o, qty }) => (
              <li key={o.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{o.id} · {qty} und</span>
                  <span className="block truncate text-xs text-taupe">{fd(o.date)} · {data.suppliers.find(s => s.id === o.sup)?.name ?? '—'} · llega a {orderWarehouse(data, o)}</span>
                </span>
                {o.status !== 'Recibido' && can('pedidos.editar')
                  ? <Button size="sm" variant="dark" onClick={() => ui.openModal({ type: 'receive', id: o.id })}>Recibir</Button>
                  : <Pill color={ORDER_COLOR[o.status]}>{o.status}</Pill>}
              </li>
            ))}
          </ul>
        ) : <span className="text-xs text-taupe">Esta referencia no se ha pedido todavía.</span>}
      </div>

      {/* Ventas */}
      <div className="flex flex-col gap-2">
        <Label>Últimas ventas</Label>
        {ventas.length ? (
          <ul className="rounded-md border border-linen bg-white">
            {ventas.slice(0, 10).map(({ s, it, wh }) => (
              <li key={s.id + it.pid}>
                <button type="button" onClick={() => ui.openDrawer({ type: 'saleDetail', id: s.id })}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-3 py-2.5 text-left first:border-t-0 hover:bg-mist">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">{s.client || 'Cliente de mostrador'}</span>
                    <span className="block truncate text-xs text-taupe">{fd(s.date)} · {s.id} · {s.pay === 'contado' ? 'Contado' : 'Crédito'}{bodegas.length > 1 ? ' · ' + wh : ''}</span>
                  </span>
                  <span className="text-right text-[13px] tabular"><b className="text-ink">{it.qty} und</b><span className="block text-xs text-taupe">{cop(it.qty * it.price)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        ) : <span className="text-xs text-taupe">Aún no se ha vendido.</span>}
        {ventas.length > 10 && <span className="text-xs text-taupe">Mostrando las 10 más recientes de {ventas.length}.</span>}
      </div>
    </Drawer>
  )
}
