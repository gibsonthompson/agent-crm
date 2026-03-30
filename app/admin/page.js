'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminAuth } from './layout'
import HelpModal, { HelpButton } from './components/HelpModal'

const STATUS_LABELS = { new: 'New Lead', contacted: 'Contacted', showing_scheduled: 'Showing', offer_submitted: 'Offer Sent', under_contract: 'Under Contract', closed: 'Closed', lost: 'Lost' }
const STATUS_COLORS = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700', showing_scheduled: 'bg-purple-100 text-purple-700', offer_submitted: 'bg-indigo-100 text-indigo-700', under_contract: 'bg-emerald-100 text-emerald-700', closed: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' }

const HELP_SECTIONS = [
  { title: "Today's Schedule", body: 'Contacts with showings, closings, or appointments today. Tap to open.' },
  { title: 'Needs Attention', body: 'New leads waiting for a call, overdue follow-ups, stale offers. Thresholds configurable in Settings.' },
  { title: 'Upcoming Deadlines', body: 'Transaction milestones due in the next 7 days — inspections, appraisals, closings.' },
  { title: 'Stats', body: 'Pipeline = commission from deals under contract (not yet closed). Closed YTD = commission already received this year.' },
  { title: 'Notes', body: 'Sticky notes saved to your database. Click text to edit, hover to delete.' },
]

export default function AdminDashboard() {
  const { user, hasPermission } = useAdminAuth()
  const [contacts, setContacts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [notes, setNotes] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNote, setEditingNote] = useState(null)

  useEffect(() => { if (user) fetchData() }, [user])

  const fetchData = async () => {
    try {
      const [cRes, tRes, nRes, sRes] = await Promise.all([
        fetch('/api/contact').then(r => r.json()),
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

  const getSetting = (key, fb) => parseFloat(settings[key]?.value) || fb

  const handleAddNote = async () => { if (!newNoteText.trim()) return; try { const r = await fetch('/api/admin/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newNoteText }) }); const d = await r.json(); if (d.note) setNotes(prev => [d.note, ...prev]) } catch (e) {}; setNewNoteText(''); setShowAddNote(false) }
  const handleDeleteNote = async (id) => { setNotes(prev => prev.filter(n => n.id !== id)); try { await fetch('/api/admin/notes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }) } catch (e) {} }
  const handleUpdateNote = async (id, text) => { setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n)); setEditingNote(null); try { await fetch('/api/admin/notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, text }) }) } catch (e) {} }

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const todayEvents = contacts.filter(s => s.scheduled_date === todayStr)
  const underContract = contacts.filter(s => s.status === 'under_contract')
  const pipelineGCI = transactions.filter(t => t.status === 'pending').reduce((s, t) => s + (parseFloat(t.net_commission) || 0), 0)
  const closedGCI = transactions.filter(t => t.status === 'closed').reduce((s, t) => s + (parseFloat(t.net_commission) || 0), 0)
  const activeDeals = transactions.filter(t => t.status === 'pending').length
  const closedDeals = transactions.filter(t => t.status === 'closed').length

  const needsAttention = contacts.filter(s => {
    if (['closed', 'lost'].includes(s.status)) return false
    if (s.next_follow_up) { const f = new Date(s.next_follow_up); f.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); if (f <= t) return true }
    if (s.status === 'new' && (Date.now() - new Date(s.created_at)) / 36e5 > getSetting('new_lead_alert_hours', 1)) return true
    if (s.status === 'offer_submitted' && (Date.now() - new Date(s.updated_at)) / 864e5 > getSetting('offer_followup_days', 2)) return true
    return false
  }).sort((a, b) => (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1))

  const upcomingMilestones = transactions.filter(t => t.status === 'pending' && t.milestones).flatMap(t => {
    const ms = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : t.milestones
    return (ms || []).filter(m => !m.completed && m.due_date).map(m => ({ ...m, transaction: t })).filter(m => { const d = new Date(m.due_date); return d >= now && d <= new Date(now.getTime() + 7 * 864e5) })
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))

  const fmtMoney = (v) => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const formatDateShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">{greeting}, {user?.name?.split(' ')[0]}</h2><p className="text-gray-500 text-xs sm:text-sm">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p></div>
        <HelpButton onClick={() => setShowHelp(true)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase">Pipeline</p><p className="text-lg font-bold text-[#e8963e]">{fmtMoney(pipelineGCI)}</p><p className="text-[10px] text-gray-400">{activeDeals} active deal{activeDeals !== 1 ? 's' : ''}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase">Closed YTD</p><p className="text-lg font-bold text-green-600">{fmtMoney(closedGCI)}</p><p className="text-[10px] text-gray-400">{closedDeals} deal{closedDeals !== 1 ? 's' : ''}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase">Under Contract</p><p className="text-lg font-bold text-emerald-600">{underContract.length}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase">Need Attention</p><p className={'text-lg font-bold ' + (needsAttention.length > 0 ? 'text-amber-600' : 'text-gray-300')}>{needsAttention.length}</p></div>
      </div>

      {/* TODAY */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#1a2e44] rounded-full" /><h3 className="text-sm font-semibold text-gray-800">Today</h3>{todayEvents.length > 0 && <span className="text-xs text-gray-400">({todayEvents.length})</span>}</div><Link href="/admin/calendar" className="text-xs text-[#1a2e44] font-medium">Calendar</Link></div>
        {todayEvents.length === 0 ? <div className="p-6 text-center"><p className="text-sm text-gray-400">Nothing scheduled today</p></div> : (
          <div className="divide-y divide-gray-100">{todayEvents.map(item => (
            <Link key={item.id} href={'/admin/contacts/' + item.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (STATUS_COLORS[item.status] || '')}>{STATUS_LABELS[item.status]}</span></div><p className="text-xs text-gray-500">{item.scheduled_time && <span className="font-medium">{item.scheduled_time}</span>}{item.scheduled_time && item.service_type && ' · '}{item.service_type}</p>{item.address && <p className="text-xs text-gray-400 mt-0.5">{item.address}</p>}</div>
              <svg className="w-4 h-4 text-gray-300 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          ))}</div>
        )}
      </div>

      {/* NEEDS ATTENTION */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /><h3 className="text-sm font-semibold text-gray-800">Needs Attention</h3><span className="text-xs text-gray-400">({needsAttention.length})</span></div>
          <div className="divide-y divide-gray-100">{needsAttention.slice(0, 5).map(item => {
            const isNew = item.status === 'new'; const hours = Math.floor((Date.now() - new Date(item.created_at)) / 36e5)
            const reason = isNew ? 'New lead — ' + hours + 'h, needs a call' : item.next_follow_up ? 'Follow-up overdue since ' + formatDateShort(item.next_follow_up) : 'Offer pending ' + Math.floor((Date.now() - new Date(item.updated_at)) / 864e5) + 'd'
            return (
              <Link key={item.id} href={'/admin/contacts/' + item.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50">
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (STATUS_COLORS[item.status] || '')}>{STATUS_LABELS[item.status]}</span></div><p className={'text-xs ' + (isNew && hours > 24 ? 'text-red-600' : 'text-amber-600')}>{reason}</p></div>
                {isNew && <button onClick={(e) => { e.preventDefault(); window.location.href = 'tel:' + item.phone }} className="ml-3 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 flex-shrink-0">Call</button>}
              </Link>
            )
          })}</div>
          {needsAttention.length > 5 && <Link href="/admin/contacts" className="block text-center text-xs text-[#1a2e44] font-medium py-3 border-t border-gray-100 hover:bg-gray-50">View all {needsAttention.length}</Link>}
        </div>
      )}

      {/* DEADLINES */}
      {upcomingMilestones.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center justify-between"><div className="flex items-center gap-2"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h3 className="text-sm font-semibold text-gray-800">This Week</h3></div><Link href="/admin/transactions" className="text-xs text-[#1a2e44] font-medium">Deals</Link></div>
          <div className="divide-y divide-gray-100">{upcomingMilestones.slice(0, 5).map((m, i) => { const du = Math.ceil((new Date(m.due_date) - now) / 864e5); return (
            <Link key={i} href="/admin/transactions" className="flex items-center justify-between p-4 sm:px-6 hover:bg-gray-50"><div><p className="font-medium text-gray-900 text-sm">{m.label}</p><p className="text-xs text-gray-500">{m.transaction.property_address}</p></div><span className={'text-xs font-medium px-2.5 py-1 rounded-full ' + (du <= 2 ? 'bg-red-100 text-red-700' : du <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>{du === 0 ? 'Today' : du === 1 ? 'Tomorrow' : du + 'd'}</span></Link>
          ) })}</div>
        </div>
      )}

      {todayEvents.length === 0 && needsAttention.length === 0 && upcomingMilestones.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-4"><div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><p className="font-semibold text-gray-800">All clear</p><p className="text-sm text-gray-500 mt-1">Nothing scheduled and no leads need attention.</p></div>
      )}

      {/* NOTES */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="px-4 sm:px-6 py-2.5 border-b border-gray-100 flex items-center justify-between"><h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h3><button onClick={() => setShowAddNote(!showAddNote)} className="text-[10px] font-medium text-[#1a2e44] hover:underline">+ Add</button></div>
        {showAddNote && <div className="px-4 sm:px-6 py-2.5 border-b border-gray-100 bg-gray-50"><div className="flex gap-2"><input type="text" value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Type a note..." style={{ fontSize: '16px' }} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" autoFocus /><button onClick={handleAddNote} disabled={!newNoteText.trim()} className="px-3 py-1.5 bg-[#1a2e44] text-white text-xs font-medium rounded-lg disabled:opacity-50">Add</button></div></div>}
        {notes.length === 0 && !showAddNote ? <div className="p-4 text-center"><p className="text-xs text-gray-300">No notes</p></div> : (
          <div className="p-3 flex flex-wrap gap-2">{notes.map(n => (
            <div key={n.id} className="relative group rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 max-w-[220px]">
              {editingNote === n.id ? <input type="text" defaultValue={n.text} autoFocus onBlur={(e) => handleUpdateNote(n.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateNote(n.id, e.target.value) }} className="w-full bg-transparent text-xs outline-none text-amber-900" /> : <p onClick={() => setEditingNote(n.id)} className="text-xs cursor-text text-amber-900">{n.text}</p>}
              <button onClick={() => handleDeleteNote(n.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          ))}</div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Link href="/admin/contacts" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5 active:bg-gray-50"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="text-[10px] font-medium text-gray-600">Contacts</span></Link>
        <Link href="/admin/pipeline" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5 active:bg-gray-50"><svg className="w-5 h-5 text-[#1a2e44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg><span className="text-[10px] font-medium text-gray-600">Pipeline</span></Link>
        <Link href="/admin/transactions" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5 active:bg-gray-50"><svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg><span className="text-[10px] font-medium text-gray-600">Deals</span></Link>
        <Link href="/admin/calendar" className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1.5 active:bg-gray-50"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span className="text-[10px] font-medium text-gray-600">Calendar</span></Link>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Dashboard Help" sections={HELP_SECTIONS} />
    </div>
  )
}