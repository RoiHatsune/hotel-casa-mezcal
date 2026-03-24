import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Reservations, Rooms } from '../api/entities'
import { toast } from 'sonner'

// ─── Configuración ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  confirmed:   { label: 'Confirmada',   color: '#3b82f6', bg: '#dbeafe' },
  checked_in:  { label: 'Check-in',     color: '#10b981', bg: '#d1fae5' },
  checked_out: { label: 'Check-out',    color: '#8b5cf6', bg: '#ede9fe' },
  cancelled:   { label: 'Cancelada',    color: '#ef4444', bg: '#fee2e2' },
}

function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(checkOut) - new Date(checkIn)
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function ReservationModal({ open, onClose, reservation, rooms }) {
  const queryClient = useQueryClient()
  const isEdit = !!reservation

  const [roomId, setRoomId]         = useState(reservation?.room_id || '')
  const [guestName, setGuestName]   = useState(reservation?.guest_name || '')
  const [guestEmail, setGuestEmail] = useState(reservation?.guest_email || '')
  const [guestPhone, setGuestPhone] = useState(reservation?.guest_phone || '')
  const [checkIn, setCheckIn]       = useState(reservation?.check_in || '')
  const [checkOut, setCheckOut]     = useState(reservation?.check_out || '')
  const [status, setStatus]         = useState(reservation?.status || 'confirmed')
  const [notes, setNotes]           = useState(reservation?.notes || '')

  const selectedRoom = rooms.find(r => r.id === roomId)
  const nights       = nightsBetween(checkIn, checkOut)
  const roomTotal    = selectedRoom ? nights * selectedRoom.price_per_night : 0

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEdit
        ? await Reservations.update(reservation.id, data)
        : await Reservations.create(data)

      // Si hace check-in, actualizar la habitación a ocupada
      if (data.status === 'checked_in' && roomId) {
        await Rooms.update(roomId, {
          status: 'occupied',
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          check_in: data.check_in,
          check_out: data.check_out,
        })
      }
      // Si hace check-out, liberar la habitación
      if (data.status === 'checked_out' && roomId) {
        await Rooms.update(roomId, {
          status: 'cleaning',
          guest_name: null,
          guest_email: null,
          check_in: null,
          check_out: null,
          restaurant_charges: 0,
        })
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success(isEdit ? 'Reserva actualizada' : 'Reserva creada')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!roomId)          return toast.error('Selecciona una habitación')
    if (!guestName.trim()) return toast.error('El nombre del huésped es obligatorio')
    if (!checkIn)          return toast.error('Selecciona fecha de check-in')
    if (!checkOut)         return toast.error('Selecciona fecha de check-out')
    if (new Date(checkOut) <= new Date(checkIn)) return toast.error('Check-out debe ser posterior al check-in')

    const selectedRoom = rooms.find(r => r.id === roomId)
    saveMutation.mutate({
      room_id:      roomId,
      room_number:  selectedRoom?.room_number || '',
      guest_name:   guestName.trim(),
      guest_email:  guestEmail.trim() || null,
      guest_phone:  guestPhone.trim() || null,
      check_in:     checkIn,
      check_out:    checkOut,
      status,
      notes:        notes.trim() || null,
      total_charges: roomTotal,
    })
  }

  if (!open) return null

  const availableRooms = rooms.filter(r =>
    r.status === 'available' || r.status === 'reserved' || r.id === reservation?.room_id
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? 'Editar Reserva' : 'Nueva Reserva'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Habitación */}
        <div style={fieldWrap}>
          <label style={lbl}>Habitación *</label>
          <select value={roomId} onChange={e => setRoomId(e.target.value)} style={inp}>
            <option value="">Seleccionar habitación...</option>
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>
                Hab. {r.room_number} — {r.type} — ${r.price_per_night?.toFixed(2)}/noche
              </option>
            ))}
          </select>
          {rooms.length > 0 && availableRooms.length === 0 && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>No hay habitaciones disponibles</p>
          )}
        </div>

        {/* Datos del huésped */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Nombre del huésped *</label>
            <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nombre completo" style={inp} />
          </div>
          <div>
            <label style={lbl}>Teléfono</label>
            <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+507 6000-0000" style={inp} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={lbl}>Email</label>
          <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inp} />
        </div>

        {/* Fechas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Check-in *</label>
            <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Check-out *</label>
            <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} style={inp} />
          </div>
        </div>

        {/* Resumen de costo */}
        {nights > 0 && selectedRoom && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#166534' }}>
              <span>{nights} noche{nights !== 1 ? 's' : ''} × ${selectedRoom.price_per_night?.toFixed(2)}</span>
              <strong>${roomTotal.toFixed(2)}</strong>
            </div>
          </div>
        )}

        {/* Estado */}
        <div style={fieldWrap}>
          <label style={lbl}>Estado</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <div
                key={val}
                onClick={() => setStatus(val)}
                style={{
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${status === val ? cfg.color : '#e5e7eb'}`,
                  background: status === val ? cfg.bg : 'white',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 5, background: cfg.color }} />
                <span style={{ fontSize: 13, fontWeight: status === val ? 600 : 400, color: status === val ? cfg.color : '#374151' }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div style={fieldWrap}>
          <label style={lbl}>Notas / Solicitudes especiales</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alergias, preferencias, hora de llegada..." rows={2}
            style={{ ...inp, resize: 'vertical', height: 'auto' }} />
        </div>

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

// ─── Modal confirmar eliminar ─────────────────────────────────────────────────
function DeleteModal({ reservation, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>¿Eliminar reserva?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          Se eliminará la reserva de <strong>{reservation?.guest_name}</strong>.
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
export default function ReservationsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editRes, setEditRes]           = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => { const { data } = await Reservations.list(); return data || [] },
  })

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => { const { data } = await Rooms.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => Reservations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast.success('Reserva eliminada')
      setDeleteTarget(null)
    },
  })

  const quickStatus = useMutation({
    mutationFn: async ({ id, status, res }) => {
      await Reservations.update(id, { status })
      if (status === 'checked_in' && res.room_id) {
        await Rooms.update(res.room_id, {
          status: 'occupied',
          guest_name: res.guest_name,
          guest_email: res.guest_email,
          check_in: res.check_in,
          check_out: res.check_out,
        })
      }
      if (status === 'checked_out' && res.room_id) {
        await Rooms.update(res.room_id, {
          status: 'cleaning',
          guest_name: null, guest_email: null,
          check_in: null, check_out: null, restaurant_charges: 0,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Estado actualizado')
    },
  })

  const filtered = filterStatus === 'all' ? reservations : reservations.filter(r => r.status === filterStatus)
  const openNew  = () => { setEditRes(null); setModalOpen(true) }
  const openEdit = (r) => { setEditRes(r);   setModalOpen(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Reservas</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {reservations.filter(r => r.status === 'checked_in').length} huéspedes activos · {reservations.filter(r => r.status === 'confirmed').length} confirmadas
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Nueva Reserva
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterStatus('all')} style={{ ...filterBtn, background: filterStatus === 'all' ? '#1d9e75' : '#f3f4f6', color: filterStatus === 'all' ? 'white' : '#374151' }}>
          Todas ({reservations.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
          <button key={val} onClick={() => setFilterStatus(val)} style={{
            ...filterBtn,
            background: filterStatus === val ? cfg.color : '#f3f4f6',
            color: filterStatus === val ? 'white' : '#374151',
          }}>
            {cfg.label} ({reservations.filter(r => r.status === val).length})
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📅</p>
          <p style={{ margin: 0 }}>{reservations.length === 0 ? 'No hay reservas aún' : 'Sin reservas con este estado'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(res => {
            const sc     = STATUS_CONFIG[res.status] || STATUS_CONFIG.confirmed
            const nights = nightsBetween(res.check_in, res.check_out)
            const room   = rooms.find(r => r.id === res.room_id)

            return (
              <div key={res.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

                  {/* Info huésped */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: sc.color, flexShrink: 0 }}>
                      {(res.guest_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{res.guest_name}</p>
                      <p style={{ margin: '2px 0', fontSize: 13, color: '#6b7280' }}>
                        Hab. {res.room_number}
                        {room && <span style={{ marginLeft: 6, color: '#9ca3af' }}>· ${room.price_per_night?.toFixed(2)}/noche</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        📅 {res.check_in} → {res.check_out}
                        {nights > 0 && <span style={{ marginLeft: 6, fontWeight: 600, color: '#374151' }}>({nights} noche{nights !== 1 ? 's' : ''})</span>}
                      </p>
                      {res.guest_phone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>📞 {res.guest_phone}</p>}
                      {res.notes && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>💬 {res.notes}</p>}
                    </div>
                  </div>

                  {/* Estado + total */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    {res.total_charges > 0 && (
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>${res.total_charges.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas de estado + editar/eliminar */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  {res.status === 'confirmed' && (
                    <button onClick={() => quickStatus.mutate({ id: res.id, status: 'checked_in', res })}
                      style={{ ...actionBtn, background: '#d1fae5', color: '#065f46' }}>
                      ✅ Check-in
                    </button>
                  )}
                  {res.status === 'checked_in' && (
                    <button onClick={() => quickStatus.mutate({ id: res.id, status: 'checked_out', res })}
                      style={{ ...actionBtn, background: '#ede9fe', color: '#5b21b6' }}>
                      🚪 Check-out
                    </button>
                  )}
                  {res.status !== 'cancelled' && res.status !== 'checked_out' && (
                    <button onClick={() => quickStatus.mutate({ id: res.id, status: 'cancelled', res })}
                      style={{ ...actionBtn, background: '#fee2e2', color: '#991b1b' }}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={() => openEdit(res)} style={{ ...actionBtn, background: '#f3f4f6', color: '#374151' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => setDeleteTarget(res)} style={{ ...actionBtn, background: '#fff5f5', color: '#ef4444' }}>
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ReservationModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditRes(null) }}
        reservation={editRes}
        rooms={rooms}
      />

      {deleteTarget && (
        <DeleteModal
          reservation={deleteTarget}
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
const fieldWrap = { marginBottom: 16 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }
const filterBtn = { padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const actionBtn = { padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }