import { useQuery } from '@tanstack/react-query'
import { Orders, Rooms, Reservations, DayPasses } from '../api/entities'
import { useTranslation } from '../i18n/useTranslation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts'

const COLORS = ['#1d9e75', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#ec4899']

const getTodayLocal = () => new Date().toLocaleDateString('en-CA')

const getLast7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })

const formatDay = (dateStr, lang) => {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PA', { weekday: 'short', day: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#7ab8a8' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.dataKey === 'total' || p.dataKey === 'ingresos' || p.dataKey === 'reservas' || p.dataKey === 'pasadias' || p.dataKey === 'restaurant' || p.dataKey === 'hospedaje' ? '$' : ''}{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, icon }) {
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

export default function Dashboard() {
  const { t, lang } = useTranslation()

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

  const last7    = getLast7Days()
  const todayStr = getTodayLocal()

  const todayOrders   = orders.filter(o => new Date(o.created_at).toLocaleDateString('en-CA') === todayStr)
  const activeOrders  = orders.filter(o => ['pending','preparing','served'].includes(o.status))
  const occupiedRooms = rooms.filter(r => r.status === 'occupied')
  const todaySales    = todayOrders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total || 0), 0)
  const todayPassRev  = daypasses.filter(p => p.date === todayStr && p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0)
  const checkedIn     = reservations.filter(r => r.status === 'checked_in').length

  const categoryData = (() => {
    const map = {}
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      o.items?.forEach(item => {
        const key = item.product_name || 'Other'
        if (!map[key]) map[key] = { name: key, cantidad: 0, total: 0 }
        map[key].cantidad += item.quantity || 0
        map[key].total    += item.line_total || item.quantity * item.unit_price || 0
      })
    })
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, 7)
  })()

  const salesByDay = last7.map(date => {
    const dayOrders = orders.filter(o => o.status === 'paid' && new Date(o.created_at).toLocaleDateString('en-CA') === date)
    return {
      dia:      formatDay(date, lang),
      ordenes:  dayOrders.length,
      ingresos: parseFloat(dayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)),
    }
  })

  const hospedajeByDay = last7.map(date => {
    const reservIncome = reservations.filter(r => r.check_in === date && r.status !== 'cancelled').reduce((s, r) => s + (r.total_charges || 0), 0)
    const passIncome   = daypasses.filter(p => p.date === date && p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0)
    return {
      dia:      formatDay(date, lang),
      reservas: parseFloat(reservIncome.toFixed(2)),
      pasadias: parseFloat(passIncome.toFixed(2)),
      total:    parseFloat((reservIncome + passIncome).toFixed(2)),
    }
  })

  const roomStatusData = [
    { name: t('room_available'),    value: rooms.filter(r => r.status === 'available').length },
    { name: t('room_occupied'),     value: rooms.filter(r => r.status === 'occupied').length },
    { name: t('room_cleaning'),     value: rooms.filter(r => r.status === 'cleaning').length },
    { name: t('room_reserved'),     value: rooms.filter(r => r.status === 'reserved').length },
    { name: t('room_maintenance'),  value: rooms.filter(r => r.status === 'maintenance').length },
  ].filter(d => d.value > 0)

  const consolidadoByDay = last7.map((date, i) => {
    const restaurant = salesByDay[i]?.ingresos || 0
    const hospedaje  = hospedajeByDay[i]?.total || 0
    return { dia: formatDay(date, lang), restaurant, hospedaje, total: parseFloat((restaurant + hospedaje).toFixed(2)) }
  })

  const totalConsolidado = consolidadoByDay.reduce((s, d) => s + d.total, 0)

  const statusColors = { pending: '#f59e0b', preparing: '#3b82f6', served: '#10b981', paid: '#8b5cf6', cancelled: '#ef4444' }
  const statusLabels = {
    pending:   t('status_pending'),
    preparing: t('status_preparing'),
    served:    t('status_served'),
    paid:      t('status_paid'),
    cancelled: t('status_cancelled'),
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: 'white' }}>{t('dashboard_title')}</h1>
        <p style={{ fontSize: 14, color: '#7ab8a8', margin: '4px 0 0' }}>{t('dashboard_subtitle')}</p>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label={t('dashboard_sales_today')}  value={`$${todaySales.toFixed(2)}`}               icon="💰" />
        <StatCard label={t('dashboard_passes_today')} value={`$${todayPassRev.toFixed(2)}`}             icon="🏊" />
        <StatCard label={t('dashboard_active_orders')} value={activeOrders.length}                      icon="🍽️" sub={`${todayOrders.length} ${t('dashboard_orders_today')}`} />
        <StatCard label={t('dashboard_rooms_occ')}    value={`${occupiedRooms.length}/${rooms.length}`} icon="🏨" sub={`${checkedIn} ${t('dashboard_guests')}`} />
      </div>

      {/* Gráfico 1: Restaurante */}
      <ChartSection title={t('dashboard_restaurant')} subtitle={t('dashboard_rest_sub')}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>{t('dashboard_daily_income')}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesByDay} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
                <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ingresos" name={t('restaurant_label')} fill="#1d9e75" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>{t('dashboard_top_products')}</p>
            {categoryData.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ab8a8', fontSize: 13 }}>{t('dashboard_no_data')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="cantidad" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ percent }) => percent > 0.08 ? `${Math.round(percent*100)}%` : ''} labelLine={false}>
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
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'white' }}>{t('dashboard_recent_orders')}</p>
          {orders.length === 0 ? (
            <p style={{ color: '#7ab8a8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>{t('dashboard_no_orders')}</p>
          ) : (
            <div>
              {orders.slice(0, 5).map(order => (
                <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1a333040' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a3330', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                      {order.table_number ? `M${order.table_number}` : order.room_number ? `H${order.room_number}` : '#'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'white' }}>{order.customer_name || `Mesa ${order.table_number || '-'}`}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#7ab8a8' }}>{order.items?.length || 0} {t('orders_items')} · {order.waiter_name || t('orders_unassigned')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: (statusColors[order.status] || '#f59e0b') + '20', color: statusColors[order.status] || '#f59e0b' }}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>${(order.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ChartSection>

      {/* Gráfico 2: Hospedaje */}
      <div style={{ marginTop: 20 }}>
        <ChartSection title={t('dashboard_hospedaje')} subtitle={t('dashboard_hosp_sub')}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>{t('dashboard_income_type')}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hospedajeByDay} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
                  <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
                  <Bar dataKey="reservas" name={t('reservations_label')} fill="#3b82f6" radius={[0,0,0,0]} stackId="a" />
                  <Bar dataKey="pasadias" name={t('passes_label')}       fill="#1d9e75" radius={[4,4,0,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7ab8a8' }}>{t('dashboard_room_status')}</p>
              {roomStatusData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ab8a8', fontSize: 13 }}>{t('dashboard_no_rooms')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={roomStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                      label={({ value }) => value > 0 ? value : ''} labelLine={false}>
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

      {/* Gráfico 3: Consolidado */}
      <div style={{ marginTop: 20 }}>
        <ChartSection
          title={t('dashboard_consolidated')}
          subtitle={`${t('dashboard_total_7')}: $${totalConsolidado.toFixed(2)} — ${t('dashboard_restaurant')} + ${t('dashboard_hospedaje')}`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={consolidadoByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a3330" />
              <XAxis dataKey="dia" tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7ab8a8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: '#7ab8a8' }} />
              <Line type="monotone" dataKey="restaurant" name={t('restaurant_label')} stroke="#1d9e75" strokeWidth={2} dot={{ fill: '#1d9e75', r: 4 }} />
              <Line type="monotone" dataKey="hospedaje"  name={t('hospedaje_label')}  stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              <Line type="monotone" dataKey="total"      name={t('total_label')}       stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} strokeDasharray="5 2" />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20, borderTop: '1px solid #1a3330', paddingTop: 16 }}>
            {[
              { label: t('dashboard_restaurant_7'), value: consolidadoByDay.reduce((s, d) => s + d.restaurant, 0), color: '#1d9e75', icon: '🍽️' },
              { label: t('dashboard_hospedaje_7'),  value: consolidadoByDay.reduce((s, d) => s + d.hospedaje, 0),  color: '#3b82f6', icon: '🏨' },
              { label: t('dashboard_total_7'),      value: totalConsolidado,                                        color: '#f59e0b', icon: '📊' },
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