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

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
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