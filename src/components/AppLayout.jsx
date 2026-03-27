import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { supabase } from '../api/supabase'
import { toast } from 'sonner'

// ─── Configuración de seguridad ───────────────────────────────────────────────
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000  // 2 horas sin actividad → cerrar sesión
const WARNING_BEFORE_MS     = 2 * 60 * 1000        // Aviso 2 minutos antes
const SESSION_KEY           = 'hotel_session_id'   // clave para sesión única

// Genera un ID único por pestaña/sesión
const generateSessionId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`

export default function AppLayout() {
  const [collapsed, setCollapsed]     = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const navigate                      = useNavigate()

  const inactivityTimer = useRef(null)
  const warningTimer    = useRef(null)
  const sessionId       = useRef(null)

  // ── Cerrar sesión ───────────────────────────────────────────────────────────
  const handleLogout = useCallback(async (reason = 'inactivity') => {
    clearTimeout(inactivityTimer.current)
    clearTimeout(warningTimer.current)
    setShowWarning(false)

    // Limpiar sesión activa del localStorage
    localStorage.removeItem(SESSION_KEY)

    await supabase.auth.signOut()

    if (reason === 'inactivity') {
      toast.error('Sesión cerrada por inactividad. / Session closed due to inactivity.')
    } else if (reason === 'duplicate') {
      toast.error('Tu sesión fue cerrada porque iniciaste sesión en otro dispositivo.')
    }

    navigate('/login')
  }, [navigate])

  // ── Reset del timer de inactividad ─────────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    setShowWarning(false)
    clearTimeout(inactivityTimer.current)
    clearTimeout(warningTimer.current)

    // Aviso 2 minutos antes de cerrar
    warningTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)

    // Cierre automático
    inactivityTimer.current = setTimeout(() => {
      handleLogout('inactivity')
    }, INACTIVITY_TIMEOUT_MS)
  }, [handleLogout])

  // ── Sesión única — detectar si hay otra sesión activa ──────────────────────
  useEffect(() => {
    // Registrar esta sesión en localStorage
    sessionId.current = generateSessionId()
    localStorage.setItem(SESSION_KEY, sessionId.current)

    // Escuchar cambios del localStorage desde otras pestañas
    const handleStorage = (e) => {
      if (e.key === SESSION_KEY && e.newValue !== sessionId.current) {
        // Otra pestaña o dispositivo tomó la sesión
        handleLogout('duplicate')
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [handleLogout])

  // ── Detectar actividad del usuario ─────────────────────────────────────────
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => resetInactivityTimer()

    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    resetInactivityTimer() // arrancar el timer al montar

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      clearTimeout(inactivityTimer.current)
      clearTimeout(warningTimer.current)
    }
  }, [resetInactivityTimer])

  // ── Detectar cambio de estado de autenticación ─────────────────────────────
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login')
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [navigate])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <main style={{
        marginLeft: collapsed ? 64 : 240,
        transition: 'margin-left 0.3s',
        flex: 1,
        padding: '32px',
        maxWidth: 1600,
      }}>
        <Outlet />
      </main>

      {/* ── Banner de advertencia de inactividad ── */}
      {showWarning && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1e1e1e', border: '1px solid #f59e0b',
          borderRadius: 14, padding: '16px 24px', zIndex: 999,
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', gap: 16, maxWidth: 480, width: '90%',
        }}>
          <span style={{ fontSize: 24 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>
              Sesión por vencer / Session expiring
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>
              Tu sesión se cerrará en 2 minutos por inactividad.
            </p>
          </div>
          <button
            onClick={resetInactivityTimer}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#f59e0b', color: '#000', fontWeight: 700,
              cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
            }}
          >
            Continuar / Continue
          </button>
        </div>
      )}
    </div>
  )
}