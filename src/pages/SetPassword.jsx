import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation, setLang, getLang } from '../i18n/useTranslation'

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [ready, setReady]       = useState(false)
  const navigate                = useNavigate()
  const { t, lang }             = useTranslation()

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
  }, [])

  const handleSetPassword = async () => {
    if (!password)            return toast.error(t('profile_new_pw'))
    if (password.length < 6)  return toast.error('Min. 6 characters')
    if (password !== confirm)  return toast.error(t('profile_pw_no_match'))

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('✅ Password created! Redirecting...')
      setTimeout(() => navigate('/'), 1500)
    }
    setLoading(false)
  }

  const handleToggleLang = () => {
    setLang(lang === 'es' ? 'en' : 'es')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1512', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Toggle idioma */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={handleToggleLang} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8,
            background: '#1a2e2b', border: '1px solid #1a3330',
            color: '#7ab8a8', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 16 }}>{lang === 'es' ? '🇺🇸' : '🇪🇸'}</span>
            {lang === 'es' ? 'English' : 'Español'}
          </button>
        </div>

        <div style={{ background: '#0f1f1c', border: '1px solid #1a3330', borderRadius: 16, padding: 32 }}>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
            {lang === 'es' ? 'Crear contraseña' : 'Create password'}
          </h1>
          <p style={{ color: '#7ab8a8', fontSize: 14, margin: '0 0 24px' }}>
            {lang === 'es' ? 'Establece tu contraseña para acceder al sistema' : 'Set your password to access the system'}
          </p>

          {!ready ? (
            <p style={{ color: '#7ab8a8', textAlign: 'center' }}>
              {lang === 'es' ? 'Verificando enlace...' : 'Verifying link...'}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: '#7ab8a8', fontSize: 13, marginBottom: 6 }}>
                  {lang === 'es' ? 'Nueva contraseña' : 'New password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={lang === 'es' ? 'Mínimo 6 caracteres' : 'At least 6 characters'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', color: '#7ab8a8', fontSize: 13, marginBottom: 6 }}>
                  {lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'}
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={lang === 'es' ? 'Repite la contraseña' : 'Repeat the password'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #1a3330', background: '#0a1512', color: 'white', fontSize: 14, boxSizing: 'border-box' }}
                />
                {confirm && confirm !== password && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{t('profile_pw_no_match')}</p>
                )}
                {confirm && confirm === password && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#1d9e75' }}>{t('profile_pw_match')}</p>
                )}
              </div>
              <button
                onClick={handleSetPassword}
                disabled={loading}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading ? '#9ca3af' : '#1d9e75', color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading
                  ? (lang === 'es' ? 'Guardando...' : 'Saving...')
                  : (lang === 'es' ? 'Crear contraseña' : 'Create password')
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}