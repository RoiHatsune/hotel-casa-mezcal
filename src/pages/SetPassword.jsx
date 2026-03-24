import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase pone el token en el hash de la URL
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
  }, [])

  const handleSetPassword = async () => {
    if (!password) return toast.error('Escribe una contraseña')
    if (password.length < 6) return toast.error('Mínimo 6 caracteres')
    if (password !== confirm) return toast.error('Las contraseñas no coinciden')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('¡Contraseña creada! Redirigiendo...')
      setTimeout(() => navigate('/'), 1500)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1512', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 16, padding: 32, width: '100%', maxWidth: 400 }}>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Crear contraseña</h1>
        <p style={{ color: '#7ab8a8', fontSize: 14, margin: '0 0 24px' }}>Establece tu contraseña para acceder al sistema</p>

        {!ready ? (
          <p style={{ color: '#7ab8a8', textAlign: 'center' }}>Verificando enlace...</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#7ab8a8', fontSize: 13, marginBottom: 6 }}>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#7ab8a8', fontSize: 13, marginBottom: 6 }}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              {loading ? 'Guardando...' : 'Crear contraseña'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}