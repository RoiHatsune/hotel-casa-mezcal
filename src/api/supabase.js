import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://apgqprcouwyeydbvqflk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3FwcmNvdXd5ZXlkYnZxZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjA1ODksImV4cCI6MjA4OTg5NjU4OX0.7K3Dwvn9QfcGjQdOdr46f7M9cBAGEoQoxBRavGls_QI'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,           // mantiene sesión entre recargas
      autoRefreshToken: true,         // renueva token automáticamente
      detectSessionInUrl: true,       // detecta tokens en URL (invitaciones)
      storageKey: 'hotel-casa-mezcal-auth', // clave única en localStorage
    }
  }
)