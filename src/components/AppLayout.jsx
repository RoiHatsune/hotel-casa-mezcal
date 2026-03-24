import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main style={{
        marginLeft: collapsed ? 64 : 240,
        transition: 'margin-left 0.3s',
        flex: 1, padding: '32px',
        maxWidth: 1600,
      }}>
        <Outlet />
      </main>
    </div>
  )
}