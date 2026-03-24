import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppUsers, InviteUser } from '../api/entities'
import { toast } from 'sonner'

const ROLES = [
  { value: 'admin',   label: 'Administrador', desc: 'Acceso total al sistema' },
  { value: 'gerente', label: 'Gerente',        desc: 'Sin gestión de usuarios' },
  { value: 'chef',    label: 'Chef',           desc: 'Solo órdenes y menú' },
  { value: 'mesero',  label: 'Mesero',         desc: 'Solo tomar órdenes' },
]

const roleColors = {
  admin:   { bg: '#fef3c7', text: '#92400e' },
  gerente: { bg: '#dbeafe', text: '#1e40af' },
  chef:    { bg: '#d1fae5', text: '#065f46' },
  mesero:  { bg: '#f3f4f6', text: '#374151' },
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function UserModal({ open, onClose, user }) {
  const queryClient = useQueryClient()
  const isEdit = !!user

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail]       = useState(user?.email || '')
  const [role, setRole]         = useState(user?.role || 'mesero')
  const [active, setActive]     = useState(user?.active ?? true)

  const saveMutation = useMutation({
  mutationFn: async (data) => {
    if (isEdit) {
      return AppUsers.update(user.id, data)
    } else {
      return InviteUser(data.email, data.full_name, data.role)
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['app_users'] })
    toast.success(isEdit
      ? 'Usuario actualizado'
      : `✉️ Invitación enviada — el usuario recibirá un correo para crear su contraseña`
    )
    onClose()
  },
  onError: (e) => toast.error('Error: ' + (e.message || 'No se pudo enviar la invitación')),
})

  const handleSave = () => {
    if (!fullName.trim()) return toast.error('El nombre es obligatorio')
    if (!email.trim())    return toast.error('El email es obligatorio')
    saveMutation.mutate({ full_name: fullName.trim(), email: email.trim().toLowerCase(), role, active })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Nombre */}
        <div style={fieldWrap}>
          <label style={lbl}>Nombre completo *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ej: María García" style={inp} />
        </div>

        {/* Email */}
        <div style={fieldWrap}>
          <label style={lbl}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="ejemplo@hotel.com"
            style={inp}
            disabled={isEdit} // no cambiar email de usuario existente
          />
          {isEdit && <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>El email no se puede modificar</p>}
        </div>

        {/* Rol */}
        <div style={fieldWrap}>
          <label style={lbl}>Rol *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {ROLES.map(r => (
              <div
                key={r.value}
                onClick={() => setRole(r.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, border: `2px solid ${role === r.value ? '#1d9e75' : '#e5e7eb'}`,
                  cursor: 'pointer', transition: 'border-color .15s',
                  background: role === r.value ? '#f0fdf4' : 'white',
                }}
              >
                <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${role === r.value ? '#1d9e75' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {role === r.value && <div style={{ width: 8, height: 8, borderRadius: 4, background: '#1d9e75' }} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111' }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            onClick={() => setActive(!active)}
            style={{ width: 44, height: 24, borderRadius: 12, background: active ? '#1d9e75' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 3, left: active ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </div>
          <span style={{ fontSize: 14, color: '#374151' }}>{active ? 'Usuario activo' : 'Usuario inactivo'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
             {saveMutation.isPending
               ? 'Enviando...'
             : isEdit ? 'Guardar cambios' : '📧 Crear y enviar invitación'
              }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal confirmar eliminar ─────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>¿Eliminar usuario?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          Se eliminará a <strong>{user?.full_name}</strong> del sistema. Esta acción no se puede deshacer.
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
export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen]     = useState(false)
  const [editUser, setEditUser]       = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterRole, setFilterRole]   = useState('all')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['app_users'],
    queryFn: async () => { const { data } = await AppUsers.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => AppUsers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_users'] })
      toast.success('Usuario eliminado')
      setDeleteTarget(null)
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => AppUsers.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app_users'] }),
  })

  const filtered = filterRole === 'all' ? users : users.filter(u => u.role === filterRole)

  const openNew  = () => { setEditUser(null); setModalOpen(true) }
  const openEdit = (u) => { setEditUser(u);   setModalOpen(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Usuarios</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {users.length} usuarios · {users.filter(u => u.active !== false).length} activos
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Nuevo Usuario
        </button>
      </div>

      {/* Info */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', margin: '20px 0 24px', fontSize: 13, color: '#1e40af' }}>
        💡 El email del usuario debe coincidir con el que usan para iniciar sesión. El rol controla a qué secciones tiene acceso.
      </div>

      {/* Filtros por rol */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[{ value: 'all', label: 'Todos' }, ...ROLES].map(r => (
          <button key={r.value} onClick={() => setFilterRole(r.value)} style={{
            padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
            background: filterRole === r.value ? '#1d9e75' : '#f3f4f6',
            color: filterRole === r.value ? 'white' : '#374151',
            fontWeight: filterRole === r.value ? 600 : 400,
          }}>
            {r.label} {r.value !== 'all' ? `(${users.filter(u => u.role === r.value).length})` : `(${users.length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>👥</p>
          <p style={{ margin: 0 }}>{users.length === 0 ? 'No hay usuarios registrados' : 'Sin usuarios con este rol'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(u => {
            const rc = roleColors[u.role] || roleColors.mesero
            const roleInfo = ROLES.find(r => r.value === u.role)
            return (
              <div key={u.id} style={{
                background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
                padding: '16px 20px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 16, opacity: u.active === false ? 0.6 : 1,
              }}>

                {/* Avatar + info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 22, background: rc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: rc.text, flexShrink: 0,
                  }}>
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{u.full_name || '(sin nombre)'}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{u.email}</p>
                  </div>
                </div>

                {/* Rol + acciones */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.text }}>
                    {roleInfo?.label || u.role}
                  </span>

                  {/* Toggle activo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => toggleActive.mutate({ id: u.id, active: !(u.active !== false) })}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: u.active !== false ? '#1d9e75' : '#d1d5db', position: 'relative', transition: 'background .2s' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 7, background: 'white', position: 'absolute', top: 3, left: u.active !== false ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                    </div>
                  </div>

                  <button onClick={() => openEdit(u)} title="Editar"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 15 }}>
                    ✏️
                  </button>
                  <button onClick={() => setDeleteTarget(u)} title="Eliminar"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 15 }}>
                    🗑
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <UserModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null) }}
        user={editUser}
      />

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
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