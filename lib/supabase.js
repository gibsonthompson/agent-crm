import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase env vars — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

// Server-side client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: { persistSession: false }
})

export default supabase
