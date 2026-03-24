import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Rooms } from '../api/entities'
import { toast } from 'sonner'

// ─── Configuración ────────────────────────────────────────────────────────────
const ROOM_TYPES = [
  { value: 'single',      label: 'Sencilla' },
  { value: 'double',      label: 'Doble' },
  { value: 'suite',       label: 'Suite' },
  { value: 'deluxe',      label: 'Deluxe' },
  { value: 'presidential',label: 'Presidencial' },
]

const STATUS_CONFIG = {
  available:   { label: 'Disponible',  color: '#10b981', bg: '#d1fae5' },
  occupied:    { label: 'Ocupada',     color: '#3b82f6', bg: '#dbeafe' },
  cleaning:    { label: 'Limpieza',    color: '#f59e0b', bg: '#fef3c7' },
  reserved:    { label: 'Reservada',   color: '#8b5cf6', bg: '#ede9fe' },
  maintenance: { label: 'Mantenim.',   color: '#ef4444', bg: '#fee2e2' },
}

const STATUS_ICONS = {
  available:   '✅',
  occupied:    '🛏️',
  cleaning:    '🧹',
  reserved:    '📅',
  maintenance: '🔧',
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function RoomModal({ open, onClose, room }) {
  const queryClient = useQueryClient()
  const isEdit = !!room

  const [roomNumber, setRoomNumber]   = useState(room?.room_number || '')
  const [type, setType]               = useState(room?.type || 'double')
  const [floor, setFloor]             = useState(room?.floor?.toString() || '')
  const [pricePerNight, setPrice]     = useState(room?.price_per_night?.toString() || '')
  const [status, setStatus]           = useState(room?.status || 'available')
  const [guestName, setGuestName]     = useState(room?.guest_name || '')
  const [guestEmail, setGuestEmail]   = useState(room?.guest_email || '')
  const [checkIn, setCheckIn]         = useState(room?.check_in || '')
  const [checkOut, setCheckOut]       = useState(room?.check_out || '')

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? Rooms.update(room.id, data) : Rooms.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success(isEdit ? 'Habitación actualizada' : 'Habitación creada')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!roomNumber.trim()) return toast.error('El número de habitación es obligatorio')
    if (!pricePerNight || isNaN(parseFloat(pricePerNight))) return toast.error('El precio por noche es obligatorio')
    saveMutation.mutate({
      room_number: roomNumber.trim(),
      type,
      floor: floor ? parseInt(floor) : null,
      price_per_night: parseFloat(pricePerNight),
      status,
      guest_name:  status === 'occupied' ? guestName  : null,
      guest_email: status === 'occupied' ? guestEmail : null,
      check_in:    status === 'occupied' ? checkIn    : null,
      check_out:   status === 'occupied' ? checkOut   : null,
    })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? `Editar Hab. ${room.room_number}` : 'Nueva Habitación'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Número + tipo + piso */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Número *</label>
            <input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="101" style={inp} />
          </div>
          <div>
            <label style={lbl}>Tipo</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inp}>
              {ROOM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Piso</label>
            <input type="number" value={floor} onChange={e => setFloor(e.target.value)} placeholder="1" style={inp} />
          </div>
        </div>

        {/* Precio + estado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Precio por noche *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>$</span>
              <input type="number" min="0" step="0.01" value={pricePerNight} onChange={e => setPrice(e.target.value)} placeholder="0.00" style={{ ...inp, paddingLeft: 24 }} />
            </div>
          </div>
          <div>
            <label style={lbl}>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datos del huésped — solo si está ocupada */}
        {status === 'occupied' && (
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#374151' }}>🛏️ Datos del huésped</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre del huésped" style={inp} />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Check-in</label>
                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Check-out</label>
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal cambio rápido de estado ────────────────────────────────────────────
function QuickStatusModal({ room, onClose }) {
  const queryClient = useQueryClient()
  const updateMutation = useMutation({
    mutationFn: (status) => Rooms.update(room.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Estado actualizado')
      onClose()
    },
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 340, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Cambiar estado — Hab. {room.room_number}</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <button
              key={val}
              onClick={() => updateMutation.mutate(val)}
              disabled={room.status === val}
              style={{
                padding: '10px 14px', borderRadius: 10, border: `2px solid ${room.status === val ? cfg.color : '#e5e7eb'}`,
                background: room.status === val ? cfg.bg : 'white', cursor: room.status === val ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500,
                color: room.status === val ? cfg.color : '#374151',
              }}
            >
              <span>{STATUS_ICONS[val]}</span>
              <span>{cfg.label}</span>
              {room.status === val && <span style={{ marginLeft: 'auto', fontSize: 12 }}>✓ Actual</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Modal confirmar eliminar ─────────────────────────────────────────────────
function DeleteModal({ room, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>¿Eliminar habitación?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          Se eliminará la habitación <strong>{room?.room_number}</strong>. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...saveBtn, background: '#ef4444' }}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RoomsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen]         = useState(false)
  const [editRoom, setEditRoom]           = useState(null)
  const [deleteTarget, setDeleteTarget]   = useState(null)
  const [quickStatus, setQuickStatus]     = useState(null)
  const [filterStatus, setFilterStatus]   = useState('all')

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { const { data } = await Rooms.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => Rooms.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Habitación eliminada')
      setDeleteTarget(null)
    },
  })

  const filtered = filterStatus === 'all' ? rooms : rooms.filter(r => r.status === filterStatus)

  const openNew  = () => { setEditRoom(null); setModalOpen(true) }
  const openEdit = (r) => { setEditRoom(r);   setModalOpen(true) }

  // Resumen por estado
  const summary = Object.keys(STATUS_CONFIG).reduce((acc, s) => {
    acc[s] = rooms.filter(r => r.status === s).length
    return acc
  }, {})

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Habitaciones</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{rooms.length} habitaciones en total</p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Nueva Habitación
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
          <div key={val} style={{ background: 'white', borderRadius: 12, border: `1px solid ${cfg.color}30`, padding: '12px 16px', cursor: 'pointer', transition: 'box-shadow .2s' }}
            onClick={() => setFilterStatus(filterStatus === val ? 'all' : val)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: cfg.color }}>{summary[val]}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('all')} style={{ ...filterBtn, background: filterStatus === 'all' ? '#1d9e75' : '#f3f4f6', color: filterStatus === 'all' ? 'white' : '#374151' }}>
          Todas ({rooms.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            ...filterBtn,
            background: filterStatus === val ? cfg.color : '#f3f4f6',
            color: filterStatus === val ? 'white' : '#374151',
          }}>
            {STATUS_ICONS[val]} {cfg.label} ({summary[val]})
          </button>
        ))}
      </div>

      {/* Grid de habitaciones */}
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏨</p>
          <p style={{ margin: 0 }}>{rooms.length === 0 ? 'No hay habitaciones. ¡Agrega la primera!' : 'Sin habitaciones con este estado'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(room => {
            const sc = STATUS_CONFIG[room.status] || STATUS_CONFIG.available
            const typeLabel = ROOM_TYPES.find(t => t.value === room.type)?.label || room.type

            // Calcular noches si está ocupada
            let nights = null
            if (room.check_in && room.check_out) {
              const diff = new Date(room.check_out) - new Date(room.check_in)
              nights = Math.ceil(diff / (1000 * 60 * 60 * 24))
            }

            return (
              <div key={room.id} style={{ background: 'white', borderRadius: 14, border: `1px solid ${sc.color}40`, padding: '18px 20px', position: 'relative' }}>

                {/* Número + badge estado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111' }}>#{room.room_number}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{typeLabel}{room.floor ? ` · Piso ${room.floor}` : ''}</p>
                  </div>
                  <button
                    onClick={() => setQuickStatus(room)}
                    style={{ padding: '4px 10px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {STATUS_ICONS[room.status]} {sc.label}
                  </button>
                </div>

                {/* Precio */}
                <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1d9e75' }}>
                  ${room.price_per_night?.toFixed(2)}<span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>/noche</span>
                </p>

                {/* Info huésped si está ocupada */}
                {room.status === 'occupied' && room.guest_name && (
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#0c4a6e' }}>👤 {room.guest_name}</p>
                    {room.check_in && room.check_out && (
                      <p style={{ margin: '3px 0 0', color: '#0369a1', fontSize: 12 }}>
                        {room.check_in} → {room.check_out}
                        {nights && <span style={{ marginLeft: 6, fontWeight: 600 }}>({nights} noches · ${(nights * room.price_per_night).toFixed(2)})</span>}
                      </p>
                    )}
                    {room.restaurant_charges > 0 && (
                      <p style={{ margin: '3px 0 0', color: '#0369a1', fontSize: 12 }}>
                        🍽️ Cargos restaurante: <strong>${room.restaurant_charges?.toFixed(2)}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(room)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13 }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => setDeleteTarget(room)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 14 }}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      <RoomModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRoom(null) }}
        room={editRoom}
      />

      {quickStatus && (
        <QuickStatusModal
          room={quickStatus}
          onClose={() => setQuickStatus(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          room={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp       = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const filterBtn = { padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }