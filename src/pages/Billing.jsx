import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Orders, Rooms } from '../api/entities'
import { toast } from 'sonner'

const PAYMENT_METHODS = [
  { value: 'cash',        label: '💵 Efectivo' },
  { value: 'card',        label: '💳 Tarjeta' },
  { value: 'room_charge', label: '🏨 Cargo a habitación' },
  { value: 'split',       label: '✂️ Dividido' },
]

const TAX_RATE = 0.07

// ─── Modal de cobro ───────────────────────────────────────────────────────────
function BillingModal({ open, onClose, order, rooms }) {
  const queryClient = useQueryClient()

  const [paymentMethod, setPayment] = useState(order?.payment_method || 'cash')
  const [splitCash, setSplitCash]   = useState('')
  const [splitCard, setSplitCard]   = useState('')
  const [tip, setTip]               = useState(order?.tip || 0)
  const [customTip, setCustomTip]   = useState('')

  const TIP_OPTIONS = [0, 10, 15, 20]

  const subtotal      = order?.subtotal || 0
  const discounts     = order?.discount_amount || 0
  const afterDiscount = subtotal - discounts
  const tax           = order?.tax || afterDiscount * TAX_RATE
  const tipAmount     = typeof tip === 'number' && tip <= 100 && tip > 0
    ? afterDiscount * (tip / 100)
    : (parseFloat(customTip) || order?.tip || 0)
  const total         = afterDiscount + tax + tipAmount

  const selectedRoom = rooms.find(r => r.id === order?.room_id)

  const payMutation = useMutation({
    mutationFn: async () => {
      // Marcar orden como pagada
      await Orders.update(order.id, {
        status: 'paid',
        payment_method: paymentMethod,
        tip: tipAmount,
        total,
      })
      // Si es cargo a habitación, sumar al room
      if (paymentMethod === 'room_charge' && order?.room_id) {
        const room = rooms.find(r => r.id === order.room_id)
        const current = room?.restaurant_charges || 0
        await Rooms.update(order.room_id, {
          restaurant_charges: current + total,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('¡Orden cobrada exitosamente!')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  if (!open || !order) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,.25)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>Cobrar Orden</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
              {order.customer_name || `Mesa ${order.table_number}`}
              {order.room_number && ` · Hab. ${order.room_number}`}
            </p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Desglose */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Detalle de la orden</p>

          {/* Ítems */}
          {order.items?.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', padding: '2px 0' }}>
              <span>
                {item.quantity}× {item.product_name}
                {item.discount_name && <span style={{ color: '#1d9e75', marginLeft: 4 }}>({item.discount_name} -{item.discount_percentage}%)</span>}
              </span>
              <span>${(item.line_total ?? item.quantity * item.unit_price).toFixed(2)}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 10, paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {discounts > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1d9e75', marginBottom: 4 }}>
                <span>Descuentos</span><span>-${discounts.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              <span>ITBMS (7%)</span><span>${tax.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
                <span>Propina</span><span>${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, color: '#111', borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 6 }}>
              <span>Total</span><span style={{ color: '#1d9e75' }}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Propina */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Propina</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 8 }}>
            {TIP_OPTIONS.map(t => (
              <button key={t} onClick={() => { setTip(t); setCustomTip('') }} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tip === t && !customTip ? '#1d9e75' : '#f3f4f6',
                color: tip === t && !customTip ? 'white' : '#374151',
              }}>
                {t === 0 ? 'Sin propina' : `${t}%`}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>O monto fijo:</span>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>$</span>
              <input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={customTip}
                onChange={e => { setCustomTip(e.target.value); setTip(null) }}
                style={{ ...inp, paddingLeft: 24 }}
              />
            </div>
          </div>
        </div>

        {/* Método de pago */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Método de pago</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
            {PAYMENT_METHODS.map(m => {
              // Solo mostrar cargo a habitación si la orden tiene habitación
              if (m.value === 'room_charge' && !order.room_id) return null
              return (
                <button key={m.value} onClick={() => setPayment(m.value)} style={{
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 500, textAlign: 'left',
                  border: `2px solid ${paymentMethod === m.value ? '#1d9e75' : '#e5e7eb'}`,
                  background: paymentMethod === m.value ? '#f0fdf4' : 'white',
                  color: paymentMethod === m.value ? '#166534' : '#374151',
                }}>
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Pago dividido */}
          {paymentMethod === 'split' && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginTop: 10 }}>
              <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Dividir pago</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ ...lbl, fontSize: 12 }}>💵 Efectivo</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>$</span>
                    <input type="number" min="0" step="0.01" value={splitCash} onChange={e => setSplitCash(e.target.value)} placeholder="0.00" style={{ ...inp, paddingLeft: 24, fontSize: 13 }} />
                  </div>
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: 12 }}>💳 Tarjeta</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>$</span>
                    <input type="number" min="0" step="0.01" value={splitCard} onChange={e => setSplitCard(e.target.value)} placeholder="0.00" style={{ ...inp, paddingLeft: 24, fontSize: 13 }} />
                  </div>
                </div>
              </div>
              {splitCash && splitCard && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: parseFloat(splitCash) + parseFloat(splitCard) === total ? '#1d9e75' : '#ef4444' }}>
                  Total dividido: ${(parseFloat(splitCash || 0) + parseFloat(splitCard || 0)).toFixed(2)}
                  {parseFloat(splitCash) + parseFloat(splitCard) !== total && ` (debe ser $${total.toFixed(2)})`}
                </p>
              )}
            </div>
          )}

          {/* Info cargo a habitación */}
          {paymentMethod === 'room_charge' && selectedRoom && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#1e40af' }}>
              🏨 Se sumará ${total.toFixed(2)} a los cargos de la Hab. {selectedRoom.room_number}
              {selectedRoom.restaurant_charges > 0 && ` (ya tiene $${selectedRoom.restaurant_charges.toFixed(2)} acumulado)`}
            </div>
          )}
        </div>

        {/* Cambio si paga en efectivo */}
        {paymentMethod === 'cash' && (
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>¿Cuánto entrega el cliente?</label>
            <CashChange total={total} />
          </div>
        )}

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={() => payMutation.mutate()} disabled={payMutation.isPending} style={{ ...saveBtn, fontSize: 15, padding: '11px 28px' }}>
            {payMutation.isPending ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Calculador de cambio ─────────────────────────────────────────────────────
function CashChange({ total }) {
  const [received, setReceived] = useState('')
  const change = parseFloat(received || 0) - total

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>$</span>
        <input
          type="number" min={total} step="0.25"
          placeholder={total.toFixed(2)}
          value={received}
          onChange={e => setReceived(e.target.value)}
          style={{ ...inp, paddingLeft: 24 }}
        />
      </div>
      {received && (
        <div style={{ background: change >= 0 ? '#f0fdf4' : '#fff5f5', borderRadius: 8, padding: '8px 14px', fontSize: 14, fontWeight: 700, color: change >= 0 ? '#166534' : '#ef4444', whiteSpace: 'nowrap' }}>
          {change >= 0 ? `Cambio: $${change.toFixed(2)}` : `Faltan: $${Math.abs(change).toFixed(2)}`}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function BillingPage() {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [filterStatus, setFilterStatus]   = useState('served')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await Orders.list(); return data || [] },
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { const { data } = await Rooms.list(); return data || [] },
  })

  const filtered = filterStatus === 'all'
    ? orders.filter(o => o.status !== 'cancelled')
    : orders.filter(o => o.status === filterStatus)

  // Estadísticas del día
  const today     = new Date().toISOString().split('T')[0]
  const paidToday = orders.filter(o => o.status === 'paid' && o.updated_at?.startsWith(today))
  const todayRevenue = paidToday.reduce((s, o) => s + (o.total || 0), 0)
  const pendingCount = orders.filter(o => ['pending','preparing','served'].includes(o.status)).length

  const statusBtns = [
    { value: 'served',   label: '🍽️ Por cobrar',  count: orders.filter(o => o.status === 'served').length },
    { value: 'pending',  label: '⏳ Pendientes',   count: orders.filter(o => o.status === 'pending').length },
    { value: 'preparing',label: '👨‍🍳 Preparando',  count: orders.filter(o => o.status === 'preparing').length },
    { value: 'paid',     label: '✅ Pagadas',       count: orders.filter(o => o.status === 'paid').length },
    { value: 'all',      label: 'Todas',            count: orders.filter(o => o.status !== 'cancelled').length },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Facturación</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>Cierre de cuentas y cobros</p>
      </div>

      {/* Resumen del día */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Ingresos hoy',     value: `$${todayRevenue.toFixed(2)}`, icon: '💰', color: '#10b981' },
          { label: 'Órdenes cobradas', value: paidToday.length,              icon: '✅', color: '#8b5cf6' },
          { label: 'Por cobrar',       value: pendingCount,                  icon: '⏳', color: '#f59e0b' },
          { label: 'Propinas hoy',     value: `$${paidToday.reduce((s,o) => s+(o.tip||0),0).toFixed(2)}`, icon: '🙏', color: '#3b82f6' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: 22 }}>{c.icon}</p>
            <p style={{ margin: '6px 0 2px', fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {statusBtns.map(b => (
          <button key={b.value} onClick={() => setFilterStatus(b.value)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            background: filterStatus === b.value ? '#1d9e75' : '#f3f4f6',
            color: filterStatus === b.value ? 'white' : '#374151',
          }}>
            {b.label} ({b.count})
          </button>
        ))}
      </div>

      {/* Lista de órdenes */}
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 36, margin: '0 0 8px' }}>🧾</p>
          <p style={{ margin: 0 }}>No hay órdenes en este estado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(order => {
            const isPaid = order.status === 'paid'
            const canCharge = order.status === 'served'
            const pm = PAYMENT_METHODS.find(m => m.value === order.payment_method)

            return (
              <div key={order.id} style={{
                background: 'white', borderRadius: 14,
                border: `1px solid ${canCharge ? '#bbf7d0' : '#e5e7eb'}`,
                padding: '16px 20px',
                boxShadow: canCharge ? '0 2px 8px rgba(29,158,117,.1)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

                  {/* Info orden */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: canCharge ? '#d1fae5' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: canCharge ? '#065f46' : '#6b7280', flexShrink: 0 }}>
                      {order.table_number ? `M${order.table_number}` : order.room_number ? `H${order.room_number}` : '#'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>
                        {order.customer_name || `Mesa ${order.table_number || '-'}`}
                      </p>
                      <p style={{ margin: '2px 0', fontSize: 13, color: '#6b7280' }}>
                        {order.items?.length || 0} ítems · {order.waiter_name || 'Sin asignar'}
                        {order.room_number && ` · Hab. ${order.room_number}`}
                      </p>
                      {/* Desglose */}
                      <div style={{ marginTop: 6 }}>
                        {order.items?.map((item, i) => (
                          <p key={i} style={{ margin: '1px 0', fontSize: 12, color: '#9ca3af' }}>
                            {item.quantity}× {item.product_name}
                            {item.discount_name && <span style={{ color: '#1d9e75' }}> (-{item.discount_percentage}%)</span>}
                            {' '}→ ${(item.line_total ?? item.quantity * item.unit_price).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Totales + acción */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ textAlign: 'right' }}>
                      {order.discount_amount > 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: '#1d9e75' }}>Dto: -${order.discount_amount.toFixed(2)}</p>
                      )}
                      {order.tax > 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>ITBMS: ${order.tax.toFixed(2)}</p>
                      )}
                      {order.tip > 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Propina: ${order.tip.toFixed(2)}</p>
                      )}
                      <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: '#111' }}>
                        ${(order.total || 0).toFixed(2)}
                      </p>
                    </div>

                    {isPaid ? (
                      <span style={{ fontSize: 12, color: '#8b5cf6', background: '#ede9fe', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                        {pm?.label || 'Pagada'} ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                      >
                        💳 Cobrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Total del filtro */}
          {filtered.filter(o => o.status === 'paid').length > 0 && filterStatus === 'paid' && (
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 13, color: '#166534' }}>{filtered.length} órdenes cobradas</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#166534' }}>
                Total: ${filtered.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal de cobro */}
      <BillingModal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        rooms={rooms}
      />
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp       = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }