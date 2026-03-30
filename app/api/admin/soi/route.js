import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('soi_people')
      .select('*')
      .order('name')

    if (error) throw error
    return NextResponse.json({ people: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('soi_people')
      .insert({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        relationship: body.relationship || 'Past Client',
        close_date: body.close_date || null,
        birthday: body.birthday || null,
        address: body.address || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ person: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('soi_people')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ person: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Delete touches first
    await supabase.from('soi_touches').delete().eq('soi_id', id)
    const { error } = await supabase.from('soi_people').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
