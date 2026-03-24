import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AppLayout from './components/AppLayout'
import './index.css'
import OrdersPage from './pages/Orders'
import MenuPage from './pages/Menu'
import DiscountsPage from './pages/Discounts'
import UsersPage from './pages/Users'
import RoomsPage from './pages/Rooms'
import ReservationsPage from './pages/Reservations'
import DayPassesPage from './pages/DayPasses'
import BillingPage from './pages/Billing'
import InventoryPage from './pages/Inventory'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from './api/supabase'

const queryClient = new QueryClient()

function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a1512', color: '#7ab8a8', fontSize: 14 }}>
      Cargando...
    </div>
  )

  return session ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/discounts" element={<DiscountsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/rooms" element={<RoomsPage />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/daypasses" element={<DayPassesPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>
)