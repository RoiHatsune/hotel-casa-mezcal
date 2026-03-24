import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://apgqprcouwyeydbvqflk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZ3FwcmNvdXd5ZXlkYnZxZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjA1ODksImV4cCI6MjA4OTg5NjU4OX0.7K3Dwvn9QfcGjQdOdr46f7M9cBAGEoQoxBRavGls_QI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)