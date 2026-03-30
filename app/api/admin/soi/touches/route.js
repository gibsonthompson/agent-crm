import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const soiId = searchParams.get('soi_id')

    let query = supabase.from('soi_touches').select('*').order('created_at', { ascending: false })
    if (soiId) query = query.eq('soi_id', soiId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ touches: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { soi_id, method, note } = body

    if (!soi_id || !method) {
      return NextResponse.json({ error: 'soi_id and method required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('soi_touches')
      .insert({ soi_id, method, note: note || null })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ touch: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
