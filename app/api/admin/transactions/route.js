import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ transactions: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('transactions')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
