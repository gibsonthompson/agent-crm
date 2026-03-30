import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')

    let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false })
    if (contactId) query = query.eq('contact_id', contactId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ activity: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase.from('activity_log').insert(body).select().single()
    if (error) throw error
    return NextResponse.json({ activity: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
