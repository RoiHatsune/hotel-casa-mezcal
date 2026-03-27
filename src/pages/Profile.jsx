import { useState } from 'react'
import { supabase } from '../api/supabase'
import { toast } from 'sonner'
import useCurrentUser from '../hooks/useCurrentUser'
import { useTranslation } from '../i18n/useTranslation'

export default function ProfilePage() {
  const { user, appUser, role } = useCurrentUser()
  const { t } = useTranslation()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [showCurrent, setShowCurrent]         = useState(false)
  const [showNew, setShowNew]                 = useState(false)
  const [showConfirm, setShowConfirm]         = useState(false)

  const roleLabels = {
    admin:   t('role_admin'),
    gerente: t('role_gerente'),
    chef:    t('role_chef'),
    mesero:  t('role_mesero'),
  }

  const roleColors = {
    admin:   { bg: '#fef3c7', text: '#92400e' },
    gerente: { bg: '#dbeafe', text: '#1e40af' },
    chef:    { bg: '#d1fae5', text: '#065f46' },
    mesero:  { bg: '#f3f4f6', text: '#374151' },
  }

  const rc = roleColors[role] || roleColors.mesero

  const strengthLabel = (len) => {
    if (len < 6)  return t('profile_strength_1')
    if (len < 8)  return t('profile_strength_2')
    if (len < 12) return t('profile_strength_3')
    return t('profile_strength_4')
  }

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error(t('profile_current_pw'))
    if (!newPassword)      return toast.error(t('profile_new_pw'))
    if (newPassword.length < 6) return toast.error('Min 6 characters')
    if (newPassword !== confirmPassword) return toast.error(t('profile_pw_no_match'))
    if (currentPassword === newPassword) return toast.error('New password must be different')

    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { toast.error('Current password is incorrect'); setLoading(false); return }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        toast.error('Error: ' + updateError.message)
      } else {
        toast.success('✅ Password updated successfully')
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      }
    } catch (e) {
      toast.error('Unexpected error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>{t('profile_title')}</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{t('profile_subtitle')}</p>
      </div>

      {/* Info card */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: rc.text, flexShrink: 0 }}>
            {(appUser?.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#111' }}>{appUser?.full_name || '(no name)'}</p>
            <p style={{ margin: '3px 0', fontSize: 14, color: '#6b7280' }}>{user?.email}</p>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: rc.bg, color: rc.text }}>
              {roleLabels[role] || t('role_mesero')}
            </span>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{t('profile_email_lbl')}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>{user?.email}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{t('profile_role_lbl')}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>{roleLabels[role] || t('role_mesero')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '24px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' }}>{t('profile_change_pw')}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>{t('profile_change_sub')}</p>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>{t('profile_current_pw')}</label>
          <div style={{ position: 'relative' }}>
            <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} placeholder={t('profile_current_ph')}
              style={{ ...inp, paddingRight: 40 }} />
            <button onClick={() => setShowCurrent(!showCurrent)} style={eyeBtn}>{showCurrent ? '🙈' : '👁️'}</button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>{t('profile_new_pw')}</label>
          <div style={{ position: 'relative' }}>
            <input type={showNew ? 'text' : 'password'} value={newPassword}
              onChange={e => setNewPassword(e.target.value)} placeholder={t('profile_new_ph')}
              style={{ ...inp, paddingRight: 40 }} />
            <button onClick={() => setShowNew(!showNew)} style={eyeBtn}>{showNew ? '🙈' : '👁️'}</button>
          </div>
          {newPassword && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: newPassword.length >= i * 2 ? i <= 1 ? '#ef4444' : i <= 2 ? '#f59e0b' : i <= 3 ? '#3b82f6' : '#1d9e75' : '#e5e7eb' }} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{strengthLabel(newPassword.length)}</p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>{t('profile_confirm_pw')}</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} placeholder={t('profile_confirm_ph')}
              style={{ ...inp, paddingRight: 40, borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '#d1d5db' }} />
            <button onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>{showConfirm ? '🙈' : '👁️'}</button>
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>{t('profile_pw_no_match')}</p>
          )}
          {confirmPassword && confirmPassword === newPassword && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#1d9e75' }}>{t('profile_pw_match')}</p>
          )}
        </div>

        <button onClick={handleChangePassword} disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading ? '#9ca3af' : '#1d9e75', color: 'white', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? t('profile_updating') : t('profile_update_btn')}
        </button>
      </div>
    </div>
  )
}

const inp    = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl    = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }
const eyeBtn = { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }