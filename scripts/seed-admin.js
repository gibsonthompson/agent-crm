/**
 * Seed the first admin user.
 * 
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.js
 * 
 * Or set these in .env.local and run:
 *   node -e "require('dotenv').config({path:'.env.local'})" -e "" && node scripts/seed-admin.js
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seed() {
  const username = process.argv[2] || 'admin'
  const password = process.argv[3] || 'admin'
  const name = process.argv[4] || 'Admin'

  console.log(`Creating admin user: ${username} / ${password}`)

  const password_hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('admin_users')
    .upsert(
      { username, password_hash, name, role: 'admin', permissions: {}, is_active: true },
      { onConflict: 'username' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log('Admin user created:', data.id)
  console.log(`Login at /admin with username="${username}" password="${password}"`)
}

seed()
