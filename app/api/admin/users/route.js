import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, name, phone, role, permissions, is_active, last_login, created_at')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ users: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { username, name, phone, password, role, permissions } = await request.json()

    if (!username || !name || !password) {
      return NextResponse.json({ error: 'Username, name, and password are required' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    // Check duplicate username
    const { data: existing } = await supabase.from('admin_users').select('id').eq('username', username.toLowerCase().trim()).single()
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const password_hash = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('admin_users')
      .insert({ username: username.toLowerCase().trim(), password_hash, name, phone: phone || null, role: role || 'member', permissions: permissions || {} })
      .select('id, username, name, phone, role, permissions, is_active, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, password, ...updates } = body

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    if (password && password.length >= 4) {
      updates.password_hash = await bcrypt.hash(password, 10)
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', id)
      .select('id, username, name, phone, role, permissions, is_active, last_login, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ user: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    // Unassign contacts
    await supabase.from('contacts').update({ assigned_to: null }).eq('assigned_to', id)

    const { error } = await supabase.from('admin_users').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
