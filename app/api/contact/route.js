import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const userRole = searchParams.get('user_role')

    let query = supabase
      .from('contacts')
      .select('*, assigned_user:admin_users!contacts_assigned_to_fkey(id, name, username)')
      .order('created_at', { ascending: false })

    // Members only see their assigned contacts
    if (userRole === 'member' && userId) {
      query = query.eq('assigned_to', userId)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('GET /api/contact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, phone, email, service_type, message, source } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name,
        phone: phone || null,
        email: email || null,
        service_type: service_type || null,
        message: message || null,
        source: source || 'website',
        status: 'new',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('POST /api/contact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

    // Clean up undefined/empty string values
    const cleanUpdates = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value === '' ? null : value
      }
    }

    const { data, error } = await supabase
      .from('contacts')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error('PATCH /api/contact error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
