import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import supabase from '@/lib/supabase'

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Return user without password hash
    const { password_hash, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('POST /api/admin/auth error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
