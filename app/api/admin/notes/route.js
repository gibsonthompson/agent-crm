import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() { try { const { data, error } = await supabase.from('dashboard_notes').select('*').order('position').order('created_at', { ascending: false }); if (error) throw error; return NextResponse.json({ notes: data }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }

export async function POST(request) { try { const body = await request.json(); const { data, error } = await supabase.from('dashboard_notes').insert({ text: body.text || '', color: body.color || 'yellow' }).select().single(); if (error) throw error; return NextResponse.json({ note: data }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }

export async function PATCH(request) { try { const { id, ...updates } = await request.json(); if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 }); const { data, error } = await supabase.from('dashboard_notes').update(updates).eq('id', id).select().single(); if (error) throw error; return NextResponse.json({ note: data }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }

export async function DELETE(request) { try { const { id } = await request.json(); if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 }); const { error } = await supabase.from('dashboard_notes').delete().eq('id', id); if (error) throw error; return NextResponse.json({ success: true }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }