import { useState } from 'react'
import { useApp } from '../../../store/AppStore'
import { useUI } from '../../../store/UIStore'
import { Modal, ModalActions } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Field, Input, Label, Select } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { SHOE_SIZES, SIZES, WAREHOUSES } from '../../../../shared/lib/constants'
import { cop, num } from '../../../../shared/lib/format'
import type { Product } from '../../../../domain/entities'
import type { ProductForm } from '../services/inventoryService'
import { useInventoryActions } from '../hooks/useInventory'
import { isShoes } from '../services/categoriesService'
import { CategoryField } from './CategoryField'

export function ProductModal({ id, onCreated }: { id?: string; onCreated?: (p: Product) => void }) {
  const { data } = useApp()
  const ui = useUI()
  const { create, update } = useInventoryActions()
  const ex = id ? data.products.find(p => p.id === id) : undefined
  const [f, setF] = useState<ProductForm>(ex
    ? { code: ex.code, brand: ex.brand, name: ex.name, cat: ex.cat, size: ex.size, color: ex.color === '—' ? '' : ex.color, wh: ex.wh, stock: String(ex.stock), min: String(ex.min), cost: String(ex.cost), price: String(ex.price) }
    : { code: 'ZH-' + (data.seq.prod + 1), brand: data.brands[0]?.name ?? '', name: '', cat: data.categories[0]?.name ?? '', size: 'M', color: '', wh: 'Local ZAHO', stock: '', min: '3', cost: '', price: '' })
  const set = (k: keyof ProductForm) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const c = num(f.cost), pz = num(f.price)
  const sizes = isShoes(f.cat) ? SHOE_SIZES : SIZES
  // Al pasar a calzado (o salir de él) la talla anterior ya no aplica
  const setCat = (cat: string) => setF(prev => ({ ...prev, cat, size: isShoes(cat) === isShoes(prev.cat) ? prev.size : '' }))

  const submit = () => {
    if (ex) { if (update(ex.id, f)) ui.closeModal(); return }
    const p = create(f)
    if (!p) return
    ui.closeModal()
    onCreated?.(p)
  }

  return (
    <Modal kicker="Inventario" title={ex ? 'Modificar ' + ex.code : 'Crear producto'} onClose={ui.closeModal}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Código"><Input value={f.code} onChange={set('code')} /></Field>
        <Field label="Marca"><Select value={f.brand} onChange={set('brand')} options={data.brands.map(b => b.name)} /></Field>
      </div>
      <Field label="Nombre"><Input placeholder="Ej. Jean Skinny Negro" value={f.name} onChange={set('name')} /></Field>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <CategoryField value={f.cat} onChange={setCat} />
        <Field label="Talla">
          <Input list="zaho-tallas" placeholder={isShoes(f.cat) ? 'Ej. 38' : 'Ej. M'} maxLength={8} value={f.size}
            onChange={e => setF({ ...f, size: e.target.value.toUpperCase() })} />
          <datalist id="zaho-tallas">{sizes.map(s => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Color"><Input value={f.color} onChange={set('color')} /></Field>
        <Field label="Bodega"><Select value={f.wh} onChange={set('wh')} options={WAREHOUSES} /></Field>
        <Field label="Stock"><Input inputMode="numeric" value={f.stock} onChange={set('stock')} /></Field>
        <Field label="Stock mínimo"><Input inputMode="numeric" value={f.min} onChange={set('min')} /></Field>
        <Field label="Costo"><MoneyInput value={f.cost} onChange={v => setF({ ...f, cost: v })} /></Field>
        <Field label="Precio de venta"><MoneyInput value={f.price} onChange={v => setF({ ...f, price: v })} /></Field>
        <div className="flex flex-col gap-1.5">
          <Label>Utilidad</Label>
          <span className="font-display text-[15px] leading-[22px] text-util">{pz ? cop(pz - c) + ' · ' + Math.round(((pz - c) / pz) * 100) + '%' : '—'}</span>
        </div>
      </div>
      <ModalActions>
        <Button onClick={ui.closeModal}>Cancelar</Button>
        <Button variant="dark" onClick={submit}>{ex ? 'Guardar cambios' : 'Crear producto'}</Button>
      </ModalActions>
    </Modal>
  )
}
