import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export default function useCurrentUser() {
  const [user, setUser]       = useState(null)
  const [appUser, setAppUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carga el perfil desde app_users según el email del usuario autenticado
  const loadAppUser = async (authUser) => {
    if (!authUser?.email) return
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', authUser.email)
      .single()
    setAppUser(data || null)
  }

  useEffect(() => {
    // Carga inicial
    supabase.auth.getUser().then(({ data }) => {
      const authUser = data?.user || null
      setUser(authUser)
      loadAppUser(authUser).finally(() => setLoading(false))
    })

    // Escucha cambios de sesión (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null
      setUser(authUser)
      loadAppUser(authUser)
    })

    return () => listener?.subscription?.unsubscribe()
  }, [])

  // El rol viene de app_users — nunca de user_metadata
  const role      = appUser?.role || 'mesero'
  const isAdmin   = role === 'admin'
  const isGerente = role === 'gerente' || isAdmin
  const isChef    = role === 'chef'
  const isMesero  = role === 'mesero'

  const allowedPaths = {
    admin:   ['/', '/orders', '/menu', '/billing', '/rooms', '/reservations', '/users', '/discounts', '/daypasses', '/inventory'],
    gerente: ['/', '/orders', '/menu', '/billing', '/rooms', '/reservations', '/discounts', '/daypasses', '/inventory'],
    chef:    ['/', '/orders', '/menu', '/inventory'],
    mesero:  ['/', '/orders'],
  }

  const canAccess = (path) => (allowedPaths[role] || allowedPaths.mesero).includes(path)

  // appUser tiene el perfil completo (nombre, role, etc.) desde app_users
  return { user, appUser, loading, isAdmin, isGerente, isChef, isMesero, role, canAccess }
}