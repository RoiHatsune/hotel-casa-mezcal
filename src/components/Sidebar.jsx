import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import useCurrentUser from '../hooks/useCurrentUser'
import { useState } from 'react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '▦' },
  { path: '/orders', label: 'Órdenes', icon: '📋' },
  { path: '/menu', label: 'Menú', icon: '🍴' },
  { path: '/billing', label: 'Facturación', icon: '🧾' },
  { path: '/rooms', label: 'Habitaciones', icon: '🏨' },
  { path: '/reservations', label: 'Reservas', icon: '📅' },
  { path: '/daypasses', label: 'Pasadías', icon: '🏊' },
  { path: '/users', label: 'Usuarios', icon: '👥' },
  { path: '/discounts', label: 'Descuentos', icon: '🏷️' },
  { path: '/inventory', label: 'Inventario', icon: '📦' }
]

const roleLabels = {
  admin: 'Administrador',
  gerente: 'Gerente',
  chef: 'Chef',
  mesero: 'Mesero',
}

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role, canAccess } = useCurrentUser()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

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
        <img src="/images.jpg" alt="Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />        {!collapsed && <span style={{ fontWeight: 600, fontSize: 14, color: 'white', whiteSpace: 'nowrap' }}>Hotel Casa Mezcal</span>}
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
        {!collapsed && user && (
          <div style={{ padding: '4px 8px', marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'white', margin: 0 }}>{user.email}</p>
            <p style={{ fontSize: 11, color: '#7ab8a8', margin: 0 }}>{roleLabels[role] || 'Mesero'}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onToggle} style={{
            flex: 1, padding: '8px', borderRadius: 8, background: 'transparent',
            border: 'none', color: '#7ab8a8', cursor: 'pointer', fontSize: 16,
          }}>{collapsed ? '›' : '‹'}</button>
          {!collapsed && (
            <button onClick={handleLogout} style={{
              padding: '8px 12px', borderRadius: 8, background: 'transparent',
              border: 'none', color: '#7ab8a8', cursor: 'pointer', fontSize: 12,
            }}>Salir</button>
          )}
        </div>
      </div>
    </aside>
  )
}