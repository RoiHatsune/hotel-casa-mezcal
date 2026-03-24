import { useQuery } from '@tanstack/react-query'
import { Orders, Rooms, Reservations, DayPasses } from '../api/entities'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'

// ─── Colores ──────────────────────────────────────────────────────────────────
const COLORS = ['#1d9e75', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#ec4899']

const categoryLabels = {
  appetizer:   'Entradas',
  main_course: 'Platos Fuertes',
  dessert:     'Postres',
  beverage:    'Bebidas',
  cocktail:    'Cócteles',
  wine:        'Vinos',
  beer:        'Cervezas',
  licor:       'Licores',
  coffee:      'Café',
  side:        'Acompañamientos',
  special:     'Especiales',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getLast7Days = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

const formatDay = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric' })
}

const today = new Date().toDateString()

// ─── Tooltip personalizado ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#7ab8a8' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.name.includes('$') || p.dataKey === 'total' || p.dataKey === 'ingresos' ? '$' : ''}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Tarjeta de estadística ───────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#1d9e75', icon }) {
  return (
    <div style={{ background: '#0f1f1c', borderRadius: 14, border: '1px solid #1a3330', padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: '#7ab8a8' }}>{label}</p>
          <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, color: 'white' }}>{value}</p>
          {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7ab8a8' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 26 }}>{icon}</span>
      </div>
    </div>
  )
}

// ─── Sección con título ───────────────────────────────────────────────────────
function ChartSection({ title, subtitle, children }) {
  return (
    <div style={{ background: '#0f1f1c', borderRadius: 14, border: '1px solid #1a3330', padding: '20px 24px' }}>
      <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: 'white' }}>{title}</p>
      {subtitle && <p style={{ margin: '0 0 20px', fontSize: 12, color: '#7ab8a8' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 20 }} />}
      {children}
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await Orders.list(); return data || [] },
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { const { data } = await Rooms.list(); return data || [] },
  })

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => { const { data } = await Reservations.list(); return data || [] },
  })

  const { data: daypasses = [] } = useQuery({
    queryKey: ['day_passes'],
    queryFn: async () => { const { data } = await DayPasses.list(); return data || [] },
  })

  const last7 = getLast7Days()

  // ── Métricas generales ────────────────────────────────────────────────────
  const todayOrders    = orders.filter(o => new Date(o.created_at).toDateString() === today)
  const activeOrders   = orders.filter(o => ['pending','preparing','served'].includes(o.status))
  const occupiedRooms  = rooms.filter(r => r.status === 'occupied')
  const todaySales     = todayOrders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total || 0), 0)
  const todayPassRev   = daypasses.filter(p => p.date === new Date().toISOString().split('T')[0] && p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0)
  const checkedIn      = reservations.filter(r => r.status === 'checked_in').length

  // ── GRÁFICO 1: Órdenes por categoría (pie) ───────────────────────────────
  const categoryData = (() => {
    const map = {}
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      o.items?.forEach(item => {
        // Inferir categoría del nombre no es posible, usamos product_name agrupado
        // En su lugar agrupamos por producto más vendido
        const key = item.product_name || 'Otro'
        if (!map[key]) map[key] = { name: key, cantidad: 0, total: 0 }
        map[key].cantidad += item.quantity || 0
        map[key].total    += item.line_total || item.quantity * item.unit_price || 0
      })
    })
    return Object.values(map)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 7)
  })()

  // ── GRÁFICO 1b: Ventas por día (barras) últimos 7 días ───────────────────
  const salesByDay = last7.map(date => {
    const dayOrders = orders.filter(o =>
      o.status === 'paid' && o.created_at?.startsWith(date)
    )
    return {
      dia:      formatDay(date),
      ordenes:  dayOrders.length,
      ingresos: parseFloat(dayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)),
    }
  })

  // ── GRÁFICO 2: Hospedaje — ingresos por día (reservas + pasadías) ────────
  const hospedajeByDay = last7.map(date => {
    const reservIncome = reservations
      .filter(r => r.check_in === date && r.status !== 'cancelled')
      .reduce((s, r) => s + (r.total_charges || 0), 0)
    const passIncome = daypasses
      .filter(p => p.date === date && p.status !== 'cancelled')
      .reduce((s, p) => s + (p.total || 0), 0)
    return {
      dia:        formatDay(date),
      reservas:   parseFloat(reservIncome.toFixed(2)),
      pasadias:   parseFloat(passIncome.toFixed(2)),
      total:      parseFloat((reservIncome + passIncome).toFixed(2)),
    }
  })

  // Distribución habitaciones para pie
  const roomStatusData = [
    { name: 'Disponible',  value: rooms.filter(r => r.status === 'available').length },
    { name: 'Ocupada',     value: rooms.filter(r => r.status === 'occupied').length },
    { name: 'Limpieza',    value: rooms.filter(r => r.status === 'cleaning').length },
    { name: 'Reservada',   value: rooms.filter(r => r.status === 'reserved').length },
    { name: 'Mantenim.',   value: rooms.filter(r => r.status === 'maintenance').length },
  ].filter(d => d.value > 0)

  // ── GRÁFICO 3: Consolidado — línea de ingresos totales por día ───────────
  const consolidadoByDay = last7.map((date, i) => {
    const restaurant = salesByDay[i]?.ingresos || 0
    const hospedaje  = hospedajeByDay[i]?.total || 0
    return {
      dia:        formatDay(date),
      restaurant: restaurant,
      hospedaje:  hospedaje,
      total:      parseFloat((restaurant + hospedaje).toFixed(2)),
    }
  })

  const totalConsolidado = consolidadoByDay.reduce((s, d) => s + d.total, 0)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'white' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: '#7ab8a8', margin: '4px 0 0' }}>Resumen de actividad del restaurante y hotel</p>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Ventas hoy"          value={`$${todaySales.toFixed(2)}`}              icon="💰" />
        <StatCard label="Pasadías hoy"         value={`$${todayPassRev.toFixed(2)}`}            icon="🏊" />
        <StatCard label="Órdenes activas"      value={activeOrders.length}                      icon="🍽️" sub={`${todayOrders.length} órdenes hoy`} />
        <StatCard label="Habitaciones ocupadas" value={`${occupiedRooms.length}/${rooms.length}`} icon="🏨" sub={`${checkedIn} huéspedes activos`} />
      </div>

      {/* ── GRÁFICO 1: Restaurante ── */}
      <ChartSection title="🍽️ Restaurante" subtitle="Ingresos y órdenes de los últimos 7 días">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

          {/* Barras — ventas por día */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>Ingresos diarios ($)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesByDay} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
                <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ingresos" name="Ingresos $" fill="#1d9e75" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie — productos más vendidos */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>Top productos vendidos</p>
            {categoryData.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ab8a8', fontSize: 13 }}>
                Sin datos aún
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="cantidad" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => percent > 0.08 ? `${Math.round(percent*100)}%` : ''} labelLine={false}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} contentStyle={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 8, fontSize: 12 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Órdenes recientes */}
        <div style={{ marginTop: 20, borderTop: '1px solid #1a3330', paddingTop: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'white' }}>Órdenes recientes</p>
          {orders.length === 0 ? (
            <p style={{ color: '#7ab8a8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No hay órdenes aún</p>
          ) : (
            <div>
              {orders.slice(0, 5).map(order => {
                const statusColors = { pending: '#f59e0b', preparing: '#3b82f6', served: '#10b981', paid: '#8b5cf6', cancelled: '#ef4444' }
                const statusLabels = { pending: 'Pendiente', preparing: 'Preparando', served: 'Servida', paid: 'Pagada', cancelled: 'Cancelada' }
                return (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a333040' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a3330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                        {order.table_number ? `M${order.table_number}` : order.room_number ? `H${order.room_number}` : '#'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'white' }}>{order.customer_name || `Mesa ${order.table_number || '-'}`}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#7ab8a8' }}>{order.items?.length || 0} ítems · {order.waiter_name || 'Sin asignar'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (statusColors[order.status] || '#f59e0b') + '20', color: statusColors[order.status] || '#f59e0b' }}>
                        {statusLabels[order.status] || order.status}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>${(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ChartSection>

      {/* ── GRÁFICO 2: Hospedaje ── */}
      <div style={{ marginTop: 20 }}>
        <ChartSection title="🏨 Hospedaje & Pasadías" subtitle="Ingresos por reservas y pasadías últimos 7 días">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>

            {/* Barras apiladas — reservas vs pasadías */}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>Ingresos por tipo ($)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hospedajeByDay} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
                  <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
                  <Bar dataKey="reservas" name="Reservas $"  fill="#3b82f6" radius={[0,0,0,0]} stackId="a" />
                  <Bar dataKey="pasadias" name="Pasadías $"  fill="#1d9e75" radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie — estado de habitaciones */}
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>Estado de habitaciones</p>
              {roomStatusData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ab8a8', fontSize: 13 }}>
                  Sin habitaciones
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={roomStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ value }) => value > 0 ? value : ''} labelLine={false}>
                      {roomStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 8, fontSize: 12 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </ChartSection>
      </div>

      {/* ── GRÁFICO 3: Consolidado ── */}
      <div style={{ marginTop: 20 }}>
        <ChartSection
          title="📊 Consolidado"
          subtitle={`Total últimos 7 días: $${totalConsolidado.toFixed(2)} — Restaurante + Hospedaje + Pasadías`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={consolidadoByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
              <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
              <Line type="monotone" dataKey="restaurant" name="Restaurante $" stroke="#1d9e75" strokeWidth={2} dot={{ fill: '#1d9e75', r: 4 }} />
              <Line type="monotone" dataKey="hospedaje"  name="Hospedaje $"  stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              <Line type="monotone" dataKey="total"      name="Total $"      stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} strokeDasharray="5 2" />
            </LineChart>
          </ResponsiveContainer>

          {/* Resumen total por área */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20, borderTop: '1px solid #1a3330', paddingTop: 16 }}>
            {[
              { label: 'Restaurante (7d)',  value: consolidadoByDay.reduce((s, d) => s + d.restaurant, 0), color: '#1d9e75', icon: '🍽️' },
              { label: 'Hospedaje (7d)',    value: consolidadoByDay.reduce((s, d) => s + d.hospedaje, 0),  color: '#3b82f6', icon: '🏨' },
              { label: 'Total general (7d)', value: totalConsolidado, color: '#f59e0b', icon: '📊' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#1a3330', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 20 }}>{item.icon}</p>
                <p style={{ margin: '6px 0 2px', fontSize: 18, fontWeight: 800, color: item.color }}>${item.value.toFixed(2)}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#7ab8a8' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </ChartSection>
      </div>

    </div>
  )
}