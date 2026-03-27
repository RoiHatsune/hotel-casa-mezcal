import { useState } from 'react'
import { supabase } from '../api/supabase'
import { toast } from 'sonner'
import useCurrentUser from '../hooks/useCurrentUser'

export default function ProfilePage() {
  const { user, appUser, role } = useCurrentUser()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)

  const roleLabels = {
    admin:   'Administrador',
    gerente: 'Gerente',
    chef:    'Chef',
    mesero:  'Mesero',
  }

  const roleColors = {
    admin:   { bg: '#fef3c7', text: '#92400e' },
    gerente: { bg: '#dbeafe', text: '#1e40af' },
    chef:    { bg: '#d1fae5', text: '#065f46' },
    mesero:  { bg: '#f3f4f6', text: '#374151' },
  }

  const rc = roleColors[role] || roleColors.mesero

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error('Ingresa tu contraseña actual')
    if (!newPassword)      return toast.error('Ingresa la nueva contraseña')
    if (newPassword.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    if (newPassword !== confirmPassword) return toast.error('Las contraseñas no coinciden')
    if (currentPassword === newPassword) return toast.error('La nueva contraseña debe ser diferente a la actual')

    setLoading(true)
    try {
      // 1. Verificar contraseña actual reautenticando
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        toast.error('La contraseña actual es incorrecta')
        setLoading(false)
        return
      }

      // 2. Actualizar la contraseña en Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        toast.error('Error al actualizar: ' + updateError.message)
      } else {
        toast.success('✅ Contraseña actualizada correctamente')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (e) {
      toast.error('Error inesperado: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Mi Perfil</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>Información de tu cuenta y seguridad</p>
      </div>

      {/* Tarjeta de info */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 30, background: rc.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: rc.text, flexShrink: 0,
          }}>
            {(appUser?.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#111' }}>
              {appUser?.full_name || '(sin nombre)'}
            </p>
            <p style={{ margin: '3px 0', fontSize: 14, color: '#6b7280' }}>{user?.email}</p>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.text }}>
              {roleLabels[role] || 'Mesero'}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Email</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Rol</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>{roleLabels[role] || 'Mesero'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cambio de contraseña */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' }}>🔑 Cambiar contraseña</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
          Por seguridad, ingresa tu contraseña actual para confirmar el cambio.
        </p>

        {/* Contraseña actual */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Contraseña actual *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Tu contraseña actual"
              style={{ ...inp, paddingRight: 40 }}
            />
            <button onClick={() => setShowCurrent(!showCurrent)} style={eyeBtn}>
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Nueva contraseña */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Nueva contraseña *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              style={{ ...inp, paddingRight: 40 }}
            />
            <button onClick={() => setShowNew(!showNew)} style={eyeBtn}>
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
          {/* Indicador de fortaleza */}
          {newPassword && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: newPassword.length >= i * 2
                      ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#3b82f6' : '#1d9e75'
                      : '#e5e7eb'
                  }} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                {newPassword.length < 6 ? 'Muy corta' : newPassword.length < 8 ? 'Aceptable' : newPassword.length < 12 ? 'Buena' : 'Excelente'}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar nueva contraseña */}
        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Confirmar nueva contraseña *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repite la nueva contraseña"
              style={{
                ...inp, paddingRight: 40,
                borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '#d1d5db'
              }}
            />
            <button onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>Las contraseñas no coinciden</p>
          )}
          {confirmPassword && confirmPassword === newPassword && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#1d9e75' }}>✓ Las contraseñas coinciden</p>
          )}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading ? '#9ca3af' : '#1d9e75', color: 'white',
            fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Actualizando...' : '🔑 Actualizar contraseña'}
        </button>
      </div>

    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp    = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl    = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }
const eyeBtn = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }