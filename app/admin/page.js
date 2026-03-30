'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminAuth } from './layout'

const STATUS_LABELS = { new: 'New Lead', contacted: 'Contacted', showing_scheduled: 'Showing', offer_submitted: 'Offer Sent', under_contract: 'Under Contract', closed: 'Closed', lost: 'Lost' }
const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700', showing_scheduled: 'bg-purple-100 text-purple-700', offer_submitted: 'bg-indigo-100 text-indigo-700', under_contract: 'bg-emerald-100 text-emerald-700', closed: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' }

export default function AdminDashboard() {
  const { user, hasPermission } = useAdminAuth()
  const [contacts, setContacts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [settings, setSettings] = useState({})
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  
  useEffect(() => { if (user) fetchData() }, [user])

  // Load personal notes from localStorage
  useEffect(() => {
    try { const saved = localStorage.getItem('agent_crm_personal_notes'); if (saved) setPersonalNotes(saved) } catch (e) {}
  }, [])

  const fetchData = async () => {
    try {
      const params = user.role === 'member' ? `?user_id=${user.id}&user_role=member` : ''
      const [cRes, tRes, nRes, sRes] = await Promise.all([
        fetch('/api/contact' + params).then(r => r.json()),
        fetch('/api/admin/transactions').then(r => r.json()).catch(() => ({ transactions: [] })),
        fetch('/api/admin/notes').then(r => r.json()).catch(() => ({ notes: [] })),
        fetch('/api/admin/settings').then(r => r.json()).catch(() => ({ settings: {} })),
      ])
      if (cRes.data) setContacts(cRes.data)
      if (tRes.transactions) setTransactions(tRes.transactions)
      if (nRes.notes) setNotes(nRes.notes)
      if (sRes.settings) setSettings(sRes.settings)
    } catch (e) {} finally { setLoading(false) }
  }

  const saveNotes = () => {
    setNotesSaving(true)
    try { localStorage.setItem('agent_crm_personal_notes', personalNotes); setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000) } catch (e) {}
    finally { setNotesSaving(false) }
  }

  const getSetting = (key, fb) => parseFloat(settings[key]?.value) || fb
  const handleAddNote = async () => { if (!newNoteText.trim()) return; try { const r = await fetch('/api/admin/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text:newNoteText, color:'yellow' }) }); const d = await r.json(); if (d.note) setNotes(prev => [d.note, ...prev]) } catch(e) {}; setNewNoteText(''); setShowAddNote(false) }
  const handleDeleteNote = async (id) => { setNotes(prev => prev.filter(n => n.id !== id)); try { await fetch('/api/admin/notes', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) }) } catch(e) {} }
  const handleUpdateNote = async (id, text) => { setNotes(prev => prev.map(n => n.id === id ? {...n, text} : n)); setEditingNote(null); try { await fetch('/api/admin/notes', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, text }) }) } catch(e) {} }

  const todayStr = new Date().toISOString().split('T')[0]
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 864e5)
  const todayEvents = contacts.filter(s => s.scheduled_date === todayStr)
  const newLeads = contacts.filter(s => s.status === 'new')
  const underContract = contacts.filter(s => s.status === 'under_contract')
  const newThisWeek = contacts.filter(s => new Date(s.created_at) >= weekAgo)

  const pendingRevenue = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (parseFloat(t.net_commission) || 0), 0)
  const closedRevenue = transactions.filter(t => t.status === 'closed').reduce((sum, t) => sum + (parseFloat(t.net_commission) || 0), 0)

  const needsAttention = contacts.filter(s => {
    if (['closed', 'lost'].includes(s.status)) return false
    if (s.next_follow_up) { const f = new Date(s.next_follow_up); f.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); if (f <= t) return true }
    if (s.status === 'new' && (Date.now() - new Date(s.created_at)) / 36e5 > getSetting('new_lead_alert_hours', 1)) return true
    if (s.status === 'offer_submitted' && (Date.now() - new Date(s.updated_at)) / 864e5 > getSetting('offer_followup_days', 2)) return true
    return false
  }).sort((a, b) => { const aScore = a.status === 'new' ? 0 : a.next_follow_up ? 1 : 2; const bScore = b.status === 'new' ? 0 : b.next_follow_up ? 1 : 2; return aScore - bScore })

  const upcomingMilestones = transactions.filter(t => t.status === 'pending' && t.milestones).flatMap(t => {
    const milestones = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : t.milestones
    return (milestones || []).filter(m => !m.completed && m.due_date).map(m => ({ ...m, transaction: t })).filter(m => {
      const due = new Date(m.due_date); return due >= now && due <= new Date(now.getTime() + 7 * 864e5)
    })
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const formatPhone = (phone) => { if (!phone) return ''; const c = phone.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0,3) + ') ' + c.slice(3,6) + '-' + c.slice(6); if (c.length === 11 && c[0] === '1') return '(' + c.slice(1,4) + ') ' + c.slice(4,7) + '-' + c.slice(7); return phone }
  const formatDateShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeAgo = (d) => { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 3600) return Math.floor(s/60) + 'm ago'; if (s < 86400) return Math.floor(s/3600) + 'h ago'; return Math.floor(s/86400) + 'd ago' }
  const fmtMoney = (v) => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const getAttentionReason = (s) => {
    if (s.status === 'new') { const h = Math.floor((Date.now() - new Date(s.created_at)) / 36e5); return { text: 'New lead — ' + h + 'h old, needs a call', color: h > 24 ? 'text-red-600' : 'text-amber-600' } }
    if (s.next_follow_up) return { text: 'Follow-up overdue since ' + formatDateShort(s.next_follow_up), color: 'text-amber-600' }
    if (s.status === 'offer_submitted') { const d = Math.floor((Date.now() - new Date(s.updated_at)) / 864e5); return { text: 'Offer sent ' + d + 'd ago — awaiting response', color: 'text-indigo-600' } }
    return { text: '', color: '' }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Welcome back, {user?.name?.split(' ')[0]}</h2>
          <p className="text-gray-500 text-xs sm:text-sm">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.065 2.05-1.37 2.772-1.153.508.153.942.535 1.025 1.059.108.685-.378 1.232-.816 1.627-.39.354-.816.659-.816 1.267V13m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Help</button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {hasPermission('contacts') && <Link href="/admin/contacts" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"><div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center relative"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{newLeads.length > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-bold">{newLeads.length}</span></div>}</div><span className="text-xs font-medium text-gray-700 text-center">Contacts</span></Link>}
        {hasPermission('pipeline') && <Link href="/admin/pipeline" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"><div className="w-10 h-10 rounded-full bg-[#1a2e44]/10 flex items-center justify-center"><svg className="w-5 h-5 text-[#1a2e44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg></div><span className="text-xs font-medium text-gray-700 text-center">Pipeline</span></Link>}
        <Link href="/admin/transactions" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div><span className="text-xs font-medium text-gray-700 text-center">Deals</span></Link>
        {hasPermission('calendar') && <Link href="/admin/calendar" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors"><div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><span className="text-xs font-medium text-gray-700 text-center">Calendar</span></Link>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-blue-600">{newThisWeek.length}</p><p className="text-[10px] text-gray-500">New This Week</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-emerald-600">{underContract.length}</p><p className="text-[10px] text-gray-500">Under Contract</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-green-600">{fmtMoney(closedRevenue)}</p><p className="text-[10px] text-gray-500">Closed YTD</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-[#e8963e]">{fmtMoney(pendingRevenue)}</p><p className="text-[10px] text-gray-500">Pending GCI</p></div>
      </div>

      {/* Quick Notes */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg><h3 className="text-sm font-semibold text-gray-800">Quick Notes</h3></div>
          <button onClick={() => setShowAddNote(!showAddNote)} className="text-xs font-medium text-[#1a2e44] bg-[#1a2e44]/10 px-3 py-1.5 rounded-lg hover:bg-[#1a2e44]/20 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add</button>
        </div>
        {showAddNote && <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50"><div className="flex gap-2"><input type="text" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Type a note..." style={{ fontSize: '16px' }} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" autoFocus /><button onClick={handleAddNote} disabled={!newNoteText.trim()} className="px-4 py-2 bg-[#1a2e44] text-white text-sm font-medium rounded-lg disabled:opacity-50">Add</button></div></div>}
        {notes.length === 0 && !showAddNote ? <div className="p-6 text-center"><p className="text-xs text-gray-400">No notes yet</p></div> : (
          <div className="p-3 sm:px-5 flex flex-wrap gap-2">{notes.map(n => (
            <div key={n.id} className="relative group rounded-lg border px-3 py-2 min-w-[120px] max-w-[250px] bg-amber-50 border-amber-200">
              {editingNote === n.id ? <input type="text" defaultValue={n.text} autoFocus onBlur={(e) => handleUpdateNote(n.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateNote(n.id, e.target.value) }} className="w-full bg-transparent text-sm outline-none text-amber-900" /> : <p onClick={() => setEditingNote(n.id)} className="text-sm cursor-text text-amber-900">{n.text}</p>}
              <button onClick={() => handleDeleteNote(n.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          ))}</div>
        )}
      </div>

      {/* Today's Schedule */}
      {todayEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2"><svg className="w-4 h-4 text-[#1a2e44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><h3 className="text-sm sm:text-base font-semibold text-gray-800">Today</h3><span className="text-gray-400 text-sm">({todayEvents.length})</span></div>
            <Link href="/admin/calendar" className="text-xs text-[#1a2e44] font-medium">Full calendar</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {todayEvents.map((item) => (
              <Link key={item.id} href={'/admin/contacts/' + item.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50 active:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700')}>{STATUS_LABELS[item.status] || item.status}</span></div>
                  <p className="text-xs text-gray-500">{item.scheduled_time && item.scheduled_time + ' · '}{item.service_type}</p>
                  {item.address && <p className="text-xs text-gray-400 mt-0.5">{item.address}</p>}
                </div>
                <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-2"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h3 className="text-sm sm:text-base font-semibold text-gray-800">Upcoming Deadlines</h3><span className="text-gray-400 text-sm">({upcomingMilestones.length})</span></div>
          <div className="divide-y divide-gray-100">
            {upcomingMilestones.slice(0, 5).map((m, i) => {
              const daysUntil = Math.ceil((new Date(m.due_date) - now) / 864e5)
              return (
                <Link key={i} href={'/admin/transactions'} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50">
                  <div><p className="font-medium text-gray-900 text-sm">{m.label}</p><p className="text-xs text-gray-500">{m.transaction.property_address}</p></div>
                  <span className={'text-xs font-medium px-2 py-1 rounded-full ' + (daysUntil <= 2 ? 'bg-red-100 text-red-700' : daysUntil <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>{daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : daysUntil + 'd'}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /><h3 className="text-sm sm:text-base font-semibold text-gray-800">Needs Attention</h3><span className="text-gray-400 text-sm">({needsAttention.length})</span></div>
          <div className="divide-y divide-gray-100">
            {needsAttention.slice(0, 8).map((item) => { const reason = getAttentionReason(item); return (
              <Link key={item.id} href={'/admin/contacts/' + item.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50 active:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700')}>{STATUS_LABELS[item.status]}</span></div>
                  <p className={'text-xs ' + reason.color}>{reason.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.service_type} · {formatPhone(item.phone)}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            ) })}
          </div>
        </div>
      )}

      {/* Empty */}
      {todayEvents.length === 0 && needsAttention.length === 0 && upcomingMilestones.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
          <p className="font-semibold text-gray-800 mb-1">All clear</p>
          <p className="text-sm text-gray-500">No events today and nothing needs attention.</p>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-[#1a2e44]">Dashboard Help</h3><button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            </div>
            <div className="p-5 space-y-5">
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Quick Actions</h4><p className="text-sm text-gray-600 leading-relaxed">The buttons at the top are shortcuts to your most-used pages. Contacts shows all your leads, Pipeline is the drag-and-drop board view, Deals tracks your active transactions and commissions, and Calendar shows upcoming showings and events.</p></div>
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Stats</h4><p className="text-sm text-gray-600 leading-relaxed">Shows new leads this week, how many deals are under contract, your closed GCI (gross commission income) year-to-date, and pending GCI from deals not yet closed.</p></div>
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Quick Notes</h4><p className="text-sm text-gray-600 leading-relaxed">A personal scratchpad for anything — to-do items, call reminders, ideas. Notes are saved locally on your device. Hit Save to keep them.</p></div>
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Today{"'"}s Schedule</h4><p className="text-sm text-gray-600 leading-relaxed">Shows any contact with a scheduled date set to today — showings, consultations, closings. Tap one to open their full detail page.</p></div>
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Upcoming Deadlines</h4><p className="text-sm text-gray-600 leading-relaxed">Transaction milestones due in the next 7 days. These come from your active deals on the Transactions page — things like inspection deadlines, appraisal due dates, and closing day.</p></div>
              <div><h4 className="text-sm font-semibold text-gray-800 mb-1">Needs Attention</h4><p className="text-sm text-gray-600 leading-relaxed">Flags leads that need action: new leads sitting for over an hour, overdue follow-ups, and offers sent more than 2 days ago with no update. If everything is handled, you{"'"}ll see "All clear" instead.</p></div>
            </div>
            <div className="p-5 border-t border-gray-100"><button onClick={() => setShowHelp(false)} className="w-full py-3 bg-[#1a2e44] text-white rounded-xl font-semibold hover:bg-[#0f1d2d] transition-colors">Got it</button></div>
          </div>
        </div>
      )}
    </div>
  )
}