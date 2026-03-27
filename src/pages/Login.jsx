import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { useTranslation, setLang, getLang } from '../i18n/useTranslation'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const navigate                = useNavigate()
  const { t, lang }             = useTranslation()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(t('login_error'))
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  const handleToggleLang = () => {
    setLang(lang === 'es' ? 'en' : 'es')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Toggle de idioma arriba a la derecha */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button
            onClick={handleToggleLang}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: '#1a2e2b', border: '1px solid #1a3330',
              color: '#7ab8a8', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <span style={{ fontSize: 16 }}>{lang === 'es' ? '🇺🇸' : '🇪🇸'}</span>
            {lang === 'es' ? 'English' : 'Español'}
          </button>
        </div>

        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">H</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Hotel Casa Mezcal</h1>
          <p className="text-gray-400 text-sm mt-1">{t('login_subtitle')}</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-1">{t('login_email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-1">{t('login_password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? t('login_loading') : t('login_btn')}
          </button>
        </form>
      </div>
    </div>
  )
}