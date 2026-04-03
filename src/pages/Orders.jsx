import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Orders, Products, Discounts, Rooms, Ingredients, InventoryMovements } from '../api/entities'
import { supabase } from '../api/supabase'
import { toast } from 'sonner'
import { useTranslation } from '../i18n/useTranslation'

const TAX_RATE = 0.07
const TIP_OPTIONS = [0, 10, 15, 20]

const nextStatus = {
  pending:   'preparing',
  preparing: 'served',
  served:    'paid',
}

async function descontarInventario(items, orderId) {
  for (const item of items) {
    const { data: recipeItems } = await supabase
      .from('recipes')
      .select('*, ingredients(*)')
      .eq('product_id', item.product_id)
    if (!recipeItems?.length) continue
    for (const r of recipeItems) {
      const ing = r.ingredients
      if (!ing) continue
      const consumed = r.quantity * item.quantity
      const newStock  = Math.max(0, ing.stock - consumed)
      await Ingredients.update(ing.id, { stock: newStock })
      await InventoryMovements.create({
        ingredient_id: ing.id,
        type:          'sale',
        quantity:      consumed,
        reference_id:  orderId || null,
        notes:         `Order: ${item.product_name} x${item.quantity}`,
      })
    }
  }
}

// ─── Items Editor ─────────────────────────────────────────────────────────────
function ItemsEditor({ items, setItems, products, discounts, tipPercent = 0 }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const categoryLabels = {
    appetizer:   t('cat_appetizer'),
    main_course: t('cat_main_course'),
    dessert:     t('cat_dessert'),
    beverage:    t('cat_beverage'),
    cocktail:    t('cat_cocktail'),
    wine:        t('cat_wine'),
    beer:        t('cat_beer'),
    licor:       t('cat_licor'),
    coffee:      t('cat_coffee'),
    side:        t('cat_side'),
    special:     t('cat_special'),
    bbq:         t('cat_bbq') || 'BBQ / Asados',
  }

  const available = products.filter(p =>
    p.available !== false &&
    (p.name?.toLowerCase().includes(search.toLowerCase()) ||
     categoryLabels[p.category]?.toLowerCase().includes(search.toLowerCase()))
  )

  const grouped = available.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id)
    if (existing) {
      setItems(items.map(i =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.unit_price * (1 - (i.discount_percentage || 0) / 100) }
          : i
      ))
    } else {
      setItems([...items, {
        product_id: product.id, product_name: product.name,
        quantity: 1, unit_price: product.price, notes: '',
        discount_id: null, discount_name: null,
        discount_percentage: 0, discount_amount: 0, line_total: product.price,
      }])
    }
  }

  const changeQty = (productId, delta) => {
    setItems(items.map(i => {
      if (i.product_id !== productId) return i
      const newQty = Math.max(1, i.quantity + delta)
      const base   = newQty * i.unit_price
      const disc   = base * (i.discount_percentage || 0) / 100
      return { ...i, quantity: newQty, discount_amount: disc, line_total: base - disc }
    }))
  }

  const removeItem = (productId) => setItems(items.filter(i => i.product_id !== productId))

  const applyDiscount = (productId, discountId) => {
    const discount = discounts.find(d => d.id === discountId)
    setItems(items.map(i => {
      if (i.product_id !== productId) return i
      const base = i.quantity * i.unit_price
      const disc = discount ? base * (discount.percentage / 100) : 0
      return {
        ...i,
        discount_id: discount?.id || null, discount_name: discount?.name || null,
        discount_percentage: discount?.percentage || 0, discount_amount: disc, line_total: base - disc,
      }
    }))
  }

  const setItemNotes = (productId, notes) =>
    setItems(items.map(i => i.product_id === productId ? { ...i, notes } : i))

  const subtotal      = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const totalDiscount = items.reduce((s, i) => s + (i.discount_amount || 0), 0)
  const afterDiscount = subtotal - totalDiscount
  const tax           = afterDiscount * TAX_RATE
  const tip           = afterDiscount * (tipPercent / 100)
  const total         = afterDiscount + tax + tip

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Left — product picker */}
      <div>
        <input
          placeholder={t('orders_search_prod')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7ab8a8', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px' }}>
                {categoryLabels[cat] || cat}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {prods.map(p => (
                  <button key={p.id} onClick={() => addItem(p)} style={{
                    textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid #1a3330', background: '#0a1512', cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1d9e75'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1a3330'}
                  >
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#1d9e75', fontWeight: 600 }}>${p.price?.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {available.length === 0 && <p style={{ color: '#7ab8a8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>{t('orders_no_results')}</p>}
        </div>
      </div>

      {/* Right — items in order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'white' }}>
          {t('orders_in_order')} ({items.length})
        </p>
        {items.length === 0 ? (
          <div style={{ border: '1px dashed #1a3330', borderRadius: 10, textAlign: 'center', padding: '40px 0', color: '#7ab8a8', fontSize: 13 }}>
            {t('orders_add_product')}
          </div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <div key={item.product_id} style={{ background: '#0a1512', border: '1px solid #1a3330', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'white', flex: 1, paddingRight: 8 }}>{item.product_name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => changeQty(item.product_id, -1)} style={btnSmall}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, minWidth: 20, textAlign: 'center', color: 'white' }}>{item.quantity}</span>
                    <button onClick={() => changeQty(item.product_id, 1)} style={btnSmall}>+</button>
                    <button onClick={() => removeItem(item.product_id)} style={{ ...btnSmall, color: '#ef4444', borderColor: '#ef444430' }}>✕</button>
                  </div>
                </div>
                <p style={{ margin: '2px 0 6px', fontSize: 12, color: '#7ab8a8' }}>${item.unit_price?.toFixed(2)} c/u</p>
                {discounts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <select
                      value={item.discount_id || ''}
                      onChange={e => applyDiscount(item.product_id, e.target.value)}
                      style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #1a3330', background: '#0f1f1c', color: '#7ab8a8', cursor: 'pointer' }}
                    >
                      <option value="">{t('orders_no_discount')}</option>
                      {discounts.map(d => (
                        <option key={d.id} value={d.id}>{d.name} -{d.percentage}%</option>
                      ))}
                    </select>
                    {item.discount_amount > 0 && (
                      <span style={{ fontSize: 11, color: '#1d9e75' }}>-${item.discount_amount.toFixed(2)}</span>
                    )}
                  </div>
                )}
                <input
                  placeholder={t('orders_notes_item')}
                  value={item.notes || ''}
                  onChange={e => setItemNotes(item.product_id, e.target.value)}
                  style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid #1a3330', background: '#0f1f1c', color: '#ccc', boxSizing: 'border-box' }}
                />
                <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: 'white', textAlign: 'right' }}>
                  ${(item.line_total ?? item.quantity * item.unit_price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid #1a3330', paddingTop: 10, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7ab8a8', marginBottom: 4 }}>
              <span>{t('orders_subtotal')}</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1d9e75', marginBottom: 4 }}>
                <span>{t('orders_discounts')}</span><span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7ab8a8', marginBottom: 4 }}>
              <span>{t('orders_itbms')}</span><span>${tax.toFixed(2)}</span>
            </div>
            {tipPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#7ab8a8', marginBottom: 4 }}>
                <span>{t('orders_tip_label')} ({tipPercent}%)</span><span>${tip.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'white', borderTop: '1px solid #1a333060', paddingTop: 8, marginTop: 4 }}>
              <span>{t('orders_total')}</span><span>${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const btnSmall = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid #1a3330',
  background: '#1a3330', color: '#7ab8a8', cursor: 'pointer', fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// ─── OrderModal ───────────────────────────────────────────────────────────────
function OrderModal({ open, onClose, order, products, discounts, rooms, currentUser }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!order

  const [tableNumber, setTableNumber]   = useState('')
  const [customerName, setCustomerName] = useState('')
  const [roomId, setRoomId]             = useState('')
  const [notes, setNotes]               = useState('')
  const [items, setItems]               = useState([])
  const [tipPercent, setTipPercent]     = useState(0)

  // ── Reset state when order changes (fix: editar no borra anterior) ──────────
  useEffect(() => {
    if (open) {
      setTableNumber(order?.table_number?.toString() || '')
      setCustomerName(order?.customer_name || '')
      setRoomId(order?.room_id || '')
      setNotes(order?.notes || '')
      setTipPercent(0)
      // Cargar los ítems existentes de la orden al editar
      setItems(order?.items ? JSON.parse(JSON.stringify(order.items)) : [])
    }
  }, [open, order])

  const occupiedRooms = rooms.filter(r => r.status === 'occupied')

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        // Al editar: solo actualiza, no descuenta inventario de nuevo
        return await Orders.update(order.id, data)
      } else {
        // Al crear: descuenta inventario
        const result = await Orders.create(data)
        if (result.data?.id) await descontarInventario(data.items, result.data.id)
        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success(isEdit ? 'Order updated' : 'Order created')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (items.length === 0) return toast.error('Add at least one product')
    const subtotal      = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
    const totalDiscount = items.reduce((s, i) => s + (i.discount_amount || 0), 0)
    const afterDiscount = subtotal - totalDiscount
    const tax           = afterDiscount * TAX_RATE
    const tip           = afterDiscount * (tipPercent / 100)
    const total         = afterDiscount + tax + tip
    const selectedRoom  = rooms.find(r => r.id === roomId)
    saveMutation.mutate({
      table_number:    tableNumber ? parseInt(tableNumber) : null,
      customer_name:   customerName || null,
      room_id:         roomId || null,
      room_number:     selectedRoom?.room_number || null,
      items, subtotal, discount_amount: totalDiscount, tax, tip, total, notes,
      waiter_name:     currentUser?.full_name || currentUser?.email || '',
      status:          order?.status || 'pending',
    })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#0f1f1c', borderRadius: 16, border: '1px solid #1a3330', width: '100%', maxWidth: 900, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'white' }}>
            {isEdit ? t('orders_modal_edit') : t('orders_modal_new')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#7ab8a8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {isEdit && (
          <div style={{ background: '#1a3330', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#7ab8a8' }}>
            ✏️ {t('orders_edit_hint') || 'Editing order — existing items are preserved. Add new products or adjust quantities.'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>{t('orders_table')}</label>
            <input type="number" placeholder="5" value={tableNumber} onChange={e => setTableNumber(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('orders_client')}</label>
            <input placeholder={t('orders_client_ph')} value={customerName} onChange={e => setCustomerName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{t('orders_room_opt')}</label>
            <select value={roomId || ''} onChange={e => setRoomId(e.target.value)} style={inputStyle}>
              <option value="">{t('orders_no_room')}</option>
              {occupiedRooms.map(r => (
                <option key={r.id} value={r.id}>Room {r.room_number} – {r.guest_name || 'Guest'}</option>
              ))}
            </select>
          </div>
        </div>

        <ItemsEditor items={items} setItems={setItems} products={products} discounts={discounts} tipPercent={tipPercent} />

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>{t('orders_tip_label')}</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {TIP_OPTIONS.map(tp => (
              <button key={tp} type="button" onClick={() => setTipPercent(tp)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tipPercent === tp ? '#1d9e75' : '#1a3330',
                color: tipPercent === tp ? 'white' : '#7ab8a8',
              }}>
                {tp === 0 ? t('orders_no_tip') : `${tp}%`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>{t('orders_notes')}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('orders_notes_ph')} rows={2}
            style={{ ...inputStyle, resize: 'vertical', height: 'auto' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #1a3330', background: 'none', color: '#7ab8a8', cursor: 'pointer', fontSize: 14 }}>
            {t('orders_cancel_btn')}
          </button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            {saveMutation.isPending ? t('orders_saving') : isEdit ? t('orders_update_btn') : t('orders_create_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: 12, color: '#7ab8a8', marginBottom: 4 }
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 13, boxSizing: 'border-box' }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [filter, setFilter]             = useState('all')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)

  const statusConfig = {
    pending:   { label: t('status_pending'),   color: '#f59e0b', bg: '#fef3c7' },
    preparing: { label: t('status_preparing'), color: '#3b82f6', bg: '#dbeafe' },
    served:    { label: t('status_served'),    color: '#10b981', bg: '#d1fae5' },
    paid:      { label: t('status_paid'),      color: '#8b5cf6', bg: '#ede9fe' },
    cancelled: { label: t('status_cancelled'), color: '#ef4444', bg: '#fee2e2' },
  }

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await Orders.list(); return data || [] },
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await Products.list(); return data || [] },
  })
  const { data: discounts = [] } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => { const { data } = await Discounts.filter({ active: true }); return data || [] },
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { const { data } = await Rooms.list(); return data || [] },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Orders.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => Orders.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orders'] }); toast.success('Deleted') },
  })

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const openNew  = () => { setEditingOrder(null); setModalOpen(true) }
  const openEdit = (order) => { setEditingOrder(order); setModalOpen(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111' }}>{t('orders_title')}</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>{t('orders_subtitle')}</p>
        </div>
        <button onClick={openNew} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {t('orders_new')}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['all', 'pending', 'preparing', 'served', 'paid', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: filter === s ? '#1d9e75' : '#f3f4f6',
            color: filter === s ? 'white' : '#374151',
          }}>
            {s === 'all' ? `${t('orders_all')} (${orders.length})` : `${statusConfig[s]?.label} (${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>{t('orders_no_orders')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(order => {
            const status        = statusConfig[order.status] || statusConfig.pending
            const totalDiscount = order.items?.reduce((s, i) => s + (i.discount_amount || 0), 0) || order.discount_amount || 0
            const hasNotes      = order.notes && order.notes.trim() !== ''
            const itemsWithNotes = order.items?.filter(i => i.notes && i.notes.trim() !== '') || []

            return (
              <div key={order.id} style={{
                background: 'white', borderRadius: 12, padding: '16px 20px',
                border: `1px solid ${order.status === 'pending' ? '#fde68a' : order.status === 'preparing' ? '#bfdbfe' : '#e5e7eb'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,.05)',
              }}>
                {/* Order header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: status.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: status.color, flexShrink: 0 }}>
                      {order.table_number ? `M${order.table_number}` : order.room_number ? `H${order.room_number}` : '#'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#111', fontSize: 15 }}>{order.customer_name || `Table ${order.table_number || '-'}`}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
                        {order.items?.length || 0} {t('orders_items')} · {order.waiter_name || t('orders_unassigned')}
                        {order.room_number && ` · Room ${order.room_number}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>${(order.total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Items detail */}
                {order.items?.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                    {order.items.map((item, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', padding: '2px 0' }}>
                          <span>
                            <strong>{item.quantity}×</strong> {item.product_name}
                            {item.discount_name && <span style={{ color: '#1d9e75', marginLeft: 6, fontSize: 12 }}>({item.discount_name} -{item.discount_percentage}%)</span>}
                          </span>
                          <span style={{ color: '#111', fontWeight: 600 }}>${(item.line_total ?? item.quantity * item.unit_price).toFixed(2)}</span>
                        </div>
                        {/* Notas del ítem — visibles para cocina */}
                        {item.notes && item.notes.trim() !== '' && (
                          <p style={{ margin: '1px 0 4px 16px', fontSize: 12, color: '#f59e0b', fontStyle: 'italic' }}>
                            📝 {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                    {totalDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1d9e75', padding: '4px 0', marginTop: 4, borderTop: '1px solid #f3f4f6' }}>
                        <span>{t('orders_discounts')}</span><span>-${totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {order.tax > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', padding: '2px 0' }}>
                        <span>{t('orders_itbms')}</span><span>${order.tax.toFixed(2)}</span>
                      </div>
                    )}
                    {order.tip > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', padding: '2px 0' }}>
                        <span>{t('orders_tip_label')}</span><span>${order.tip.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notas generales de la orden — destacadas para cocina */}
                {hasNotes && (
                  <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14 }}>📋</span>
                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 500 }}>{order.notes}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {order.status === 'pending' && (
                    <button onClick={() => openEdit(order)} style={{ ...actionBtn, background: '#f3f4f6', color: '#374151' }}>
                      ✏️ {t('orders_edit')}
                    </button>
                  )}
                  {nextStatus[order.status] && (
                    <button onClick={() => updateMutation.mutate({ id: order.id, data: { status: nextStatus[order.status] } })} style={{ ...actionBtn, background: '#1d9e75', color: 'white' }}>
                      → {statusConfig[nextStatus[order.status]]?.label}
                    </button>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'paid' && (
                    <button onClick={() => updateMutation.mutate({ id: order.id, data: { status: 'cancelled' } })} style={{ ...actionBtn, background: '#fff5f5', color: '#ef4444', border: '1px solid #fee2e2' }}>
                      {t('orders_cancel')}
                    </button>
                  )}
                  {(order.status === 'paid' || order.status === 'cancelled') && (
                    <button onClick={() => { if (confirm(t('orders_confirm_del'))) deleteMutation.mutate(order.id) }} style={{ ...actionBtn, background: '#fff5f5', color: '#ef4444', border: '1px solid #fee2e2' }}>
                      {t('orders_delete')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <OrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        order={editingOrder}
        products={products}
        discounts={discounts}
        rooms={rooms}
        currentUser={null}
      />
    </div>
  )
}

const actionBtn = { padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }