import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() { try { const { data, error } = await supabase.from('agent_settings').select('*').order('key'); if (error) throw error; const settings = {}; data.forEach(r => { settings[r.key] = { value: r.value, label: r.label, description: r.description } }); return NextResponse.json({ settings, rows: data }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }

export async function PATCH(request) { try { const { key, value } = await request.json(); if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 }); const { data, error } = await supabase.from('agent_settings').update({ value: String(value) }).eq('key', key).select().single(); if (error) throw error; return NextResponse.json({ setting: data }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }

export async function PUT(request) { try { const { updates } = await request.json(); if (!updates) return NextResponse.json({ error: 'updates required' }, { status: 400 }); for (const { key, value } of updates) { await supabase.from('agent_settings').update({ value: String(value) }).eq('key', key) }; return NextResponse.json({ success: true }) } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }) } }