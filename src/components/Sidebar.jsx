import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import useCurrentUser from '../hooks/useCurrentUser'
import { useTranslation, setLang, getLang } from '../i18n/useTranslation'

const roleColors = {
  admin:   '#fef3c7',
  gerente: '#dbeafe',
  chef:    '#d1fae5',
  mesero:  '#f3f4f6',
}

export default function Sidebar({ collapsed, onToggle }) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { user, appUser, role, canAccess } = useCurrentUser()
  const { t, lang } = useTranslation()

  // Nav items usando traducciones
  const navItems = [
    { path: '/',             label: t('nav_dashboard'),    icon: '▦' },
    { path: '/orders',       label: t('nav_orders'),       icon: '📋' },
    { path: '/menu',         label: t('nav_menu'),         icon: '🍴' },
    { path: '/billing',      label: t('nav_billing'),      icon: '🧾' },
    { path: '/rooms',        label: t('nav_rooms'),        icon: '🏨' },
    { path: '/reservations', label: t('nav_reservations'), icon: '📅' },
    { path: '/daypasses',    label: t('nav_daypasses'),    icon: '🏊' },
    { path: '/users',        label: t('nav_users'),        icon: '👥' },
    { path: '/discounts',    label: t('nav_discounts'),    icon: '🏷️' },
    { path: '/inventory',    label: t('nav_inventory'),    icon: '📦' },
  ]

  const roleLabels = {
    admin:   t('role_admin'),
    gerente: t('role_gerente'),
    chef:    t('role_chef'),
    mesero:  t('role_mesero'),
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleToggleLang = () => {
    setLang(lang === 'es' ? 'en' : 'es')
  }

  const displayName = appUser?.full_name || user?.email || ''
  const initials    = displayName[0]?.toUpperCase() || '?'
  const avatarBg    = roleColors[role] || '#f3f4f6'

  return (
    <aside style={{
      width: collapsed ? '64px' : '240px',
      transition: 'width 0.3s',
      background: '#0f1f1c',
      borderRight: '1px solid #1a3330',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40,
    }}>

      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: '1px solid #1a3330', display: 'flex', alignItems: 'center', gap: 12, height: 64 }}>
        <img src="/images.jpg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
        {!collapsed && <span style={{ fontWeight: 600, fontSize: 14, color: 'white', whiteSpace: 'nowrap' }}>Hotel Casa Mezcal</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {navItems.filter(item => canAccess(item.path)).map(item => {
          const isActive = location.pathname === item.path
          return (
            <Link key={item.path} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8, marginBottom: 2,
              background: isActive ? '#1d9e75' : 'transparent',
              color: isActive ? 'white' : '#7ab8a8',
              textDecoration: 'none', fontSize: 14,
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid #1a3330' }}>

        {/* Avatar → perfil */}
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px', borderRadius: 10, marginBottom: 8,
            cursor: 'pointer', transition: 'background .15s',
            background: location.pathname === '/profile' ? '#1a3330' : 'transparent',
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#1a3330'}
            onMouseLeave={e => e.currentTarget.style.background = location.pathname === '/profile' ? '#1a3330' : 'transparent'}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 16, background: avatarBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#374151', flexShrink: 0,
            }}>
              {initials}
            </div>
            {!collapsed && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: 11, color: '#7ab8a8', margin: 0 }}>
                  {roleLabels[role] || t('role_mesero')}
                </p>
              </div>
            )}
          </div>
        </Link>

        {/* Toggle de idioma */}
        <button
          onClick={handleToggleLang}
          title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          style={{
            width: '100%', padding: '7px', borderRadius: 8, marginBottom: 8,
            background: '#1a3330', border: '1px solid #1a3330',
            color: '#7ab8a8', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, transition: 'background .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d9e75'}
          onMouseLeave={e => e.currentTarget.style.background = '#1a3330'}
        >
          <span style={{ fontSize: 18 }}>{lang === 'es' ? '🇺🇸' : '🇪🇸'}</span>
          {!collapsed && (
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {lang === 'es' ? 'English' : 'Español'}
            </span>
          )}
        </button>

        {/* Colapsar + Salir */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onToggle} style={{
            flex: 1, padding: '8px', borderRadius: 8, background: 'transparent',
            border: 'none', color: '#7ab8a8', cursor: 'pointer', fontSize: 16,
          }}>
            {collapsed ? '›' : '‹'}
          </button>
          {!collapsed && (
            <button onClick={handleLogout} style={{
              padding: '8px 12px', borderRadius: 8, background: 'transparent',
              border: 'none', color: '#7ab8a8', cursor: 'pointer', fontSize: 12,
            }}>
              {t('logout')}
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}