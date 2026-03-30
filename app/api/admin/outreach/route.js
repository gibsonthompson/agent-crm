import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('contact_id')
    const prospectId = searchParams.get('prospect_id')

    let query = supabase.from('outreach_log').select('*').order('created_at', { ascending: false })

    if (contactId) query = query.eq('contact_id', contactId)
    if (prospectId) query = query.eq('prospect_id', prospectId)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ outreach: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase.from('outreach_log').insert(body).select().single()
    if (error) throw error
    return NextResponse.json({ outreach: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { contact_id } = await request.json()
    if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

    // Delete outreach, activity, then contact
    await supabase.from('outreach_log').delete().eq('contact_id', contact_id)
    await supabase.from('activity_log').delete().eq('contact_id', contact_id)
    await supabase.from('contacts').delete().eq('id', contact_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
