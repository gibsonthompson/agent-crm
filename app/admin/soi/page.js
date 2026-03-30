'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const RELATIONSHIP_TYPES = ['Past Client', 'Family', 'Friend', 'Colleague', 'Vendor', 'Lender', 'Title Rep', 'Inspector', 'Other']
const TOUCH_METHODS = ['Call', 'Text', 'Email', 'Coffee/Lunch', 'Gift', 'Card', 'Social Media', 'Event']
const HELP_SECTIONS = [
  { title: 'What is SOI?', body: 'Sphere of Influence — past clients, family, friends, vendors, lenders. Your #1 source of repeat business and referrals.' },
  { title: 'Auto-import', body: 'Contacts that move to "Closed" will appear in a banner at the top so you can add them to your SOI with one tap.' },
  { title: 'Touch tracking', body: 'Log every interaction — call, text, email, coffee, gift, card — with the Log Touch button. Tracks how recently you contacted each person.' },
  { title: 'Overdue contacts', body: 'Anyone not touched in the configured number of days (default 90) shows as Overdue. Change the threshold in Settings.' },
  { title: 'Birthdays & Anniversaries', body: 'Alert cards show upcoming birthdays and close-date anniversaries. Lookahead period is configurable in Settings.' },
]

export default function SOIPage() {
  const { user } = useAdminAuth()
  const [people, setPeople] = useState([])
  const [contacts, setContacts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showLogTouch, setShowLogTouch] = useState(null)
  const [touchMethod, setTouchMethod] = useState('Call')
  const [touchNote, setTouchNote] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', relationship: 'Past Client', close_date: '', birthday: '', address: '', notes: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch('/api/admin/soi').then(r => r.json()),
        fetch('/api/contact').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()).catch(() => ({ settings: {} })),
      ])
      if (pRes.people) setPeople(pRes.people)
      if (cRes.data) setContacts(cRes.data)
      if (sRes.settings) setSettings(sRes.settings)
    } catch (e) {} finally { setLoading(false) }
  }

  const getSetting = (key, fallback) => parseInt(settings[key]?.value) || fallback

  // Closed contacts NOT already in SOI (by phone or email match)
  const soiPhones = new Set(people.map(p => p.phone).filter(Boolean))
  const soiEmails = new Set(people.map(p => p.email?.toLowerCase()).filter(Boolean))
  const closedNotInSOI = contacts.filter(c => {
    if (c.status !== 'closed') return false
    if (c.phone && soiPhones.has(c.phone)) return false
    if (c.email && soiEmails.has(c.email.toLowerCase())) return false
    return true
  })

  const handleAddFromContact = async (contact) => {
    setSaving(true)
    try {
      const r = await fetch('/api/admin/soi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: contact.name, email: contact.email, phone: contact.phone, relationship: 'Past Client', close_date: new Date().toISOString().split('T')[0], address: contact.address, notes: 'Auto-imported from closed contact' }) })
      if (r.ok) { fetchAll(); setSuccessMsg('Added to SOI'); setTimeout(() => setSuccessMsg(''), 2000) }
    } catch (e) {} finally { setSaving(false) }
  }

  const handleAdd = async () => {
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      const r = await fetch('/api/admin/soi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      if (r.ok) { setShowAddForm(false); setFormData({ name: '', email: '', phone: '', relationship: 'Past Client', close_date: '', birthday: '', address: '', notes: '' }); fetchAll(); setSuccessMsg('Added'); setTimeout(() => setSuccessMsg(''), 2000) }
    } catch (e) {} finally { setSaving(false) }
  }

  const handleLogTouch = async () => {
    if (!showLogTouch) return
    try {
      await fetch('/api/admin/soi', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: showLogTouch.id, last_touch: new Date().toISOString(), touch_count: (showLogTouch.touch_count || 0) + 1 }) })
      await fetch('/api/admin/soi/touches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ soi_id: showLogTouch.id, method: touchMethod, note: touchNote }) }).catch(() => {})
      setShowLogTouch(null); setTouchMethod('Call'); setTouchNote(''); fetchAll(); setSuccessMsg('Touch logged'); setTimeout(() => setSuccessMsg(''), 2000)
    } catch (e) {}
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove from SOI?')) return
    try { await fetch('/api/admin/soi', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchAll() } catch (e) {}
  }

  const overdueDays = getSetting('soi_overdue_days', 90)
  const birthdayLookahead = getSetting('soi_birthday_lookahead', 14)
  const anniversaryLookahead = getSetting('soi_anniversary_lookahead', 14)

  const daysSinceTouch = (p) => { if (!p.last_touch) return 999; return Math.floor((Date.now() - new Date(p.last_touch)) / 864e5) }

  const getTouchStatus = (p) => {
    const days = daysSinceTouch(p)
    if (days <= 30) return { label: 'Recent', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    if (days <= 60) return { label: 'Good', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' }
    if (days <= overdueDays) return { label: 'Due', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' }
    return { label: 'Overdue', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
  }

  const isUpcomingBirthday = (p) => { if (!p.birthday) return false; const b = new Date(p.birthday + 'T00:00:00'); const today = new Date(); const thisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate()); const diff = (thisYear - today) / 864e5; return diff >= 0 && diff <= birthdayLookahead }
  const isUpcomingAnniversary = (p) => { if (!p.close_date) return false; const cd = new Date(p.close_date + 'T00:00:00'); const today = new Date(); const thisYear = new Date(today.getFullYear(), cd.getMonth(), cd.getDate()); const diff = (thisYear - today) / 864e5; return diff >= 0 && diff <= anniversaryLookahead }
  const formatPhone = (phone) => { if (!phone) return ''; const c = phone.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0,3) + ') ' + c.slice(3,6) + '-' + c.slice(6); return phone }
  const fmtDate = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

  const filtered = people
    .filter(p => { if (filter === 'overdue') return daysSinceTouch(p) > overdueDays; if (filter === 'birthdays') return isUpcomingBirthday(p); if (filter === 'anniversaries') return isUpcomingAnniversary(p); if (filter !== 'all') return p.relationship === filter; return true })
    .filter(p => { if (!search) return true; const q = search.toLowerCase(); return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.phone?.includes(q) })
    .sort((a, b) => daysSinceTouch(b) - daysSinceTouch(a))

  const overdueCount = people.filter(p => daysSinceTouch(p) > overdueDays).length
  const birthdayCount = people.filter(p => isUpcomingBirthday(p)).length
  const anniversaryCount = people.filter(p => isUpcomingAnniversary(p)).length

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Sphere of Influence</h2><p className="text-gray-500 text-xs sm:text-sm">{people.length} people</p></div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[#1a2e44] rounded-xl hover:bg-[#0f1d2d]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="hidden sm:inline">Add Person</span></button>
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      {/* Auto-import banner */}
      {closedNotInSOI.length > 0 && (
        <div className="mb-4 rounded-xl p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-2">{closedNotInSOI.length} closed contact{closedNotInSOI.length !== 1 ? 's' : ''} not in your SOI</p>
          <div className="space-y-2">
            {closedNotInSOI.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                <div><p className="text-sm font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.service_type}</p></div>
                <button onClick={() => handleAddFromContact(c)} disabled={saving} className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200">Add to SOI</button>
              </div>
            ))}
            {closedNotInSOI.length > 5 && <p className="text-xs text-blue-600">...and {closedNotInSOI.length - 5} more</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <button onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'overdue' ? 'bg-red-50 ring-2 ring-red-200' : 'bg-white')}><p className="text-xs text-gray-500">Overdue</p><p className="text-xl font-bold text-red-600">{overdueCount}</p><p className="text-[10px] text-gray-400">{overdueDays}+ days</p></button>
        <button onClick={() => setFilter(filter === 'birthdays' ? 'all' : 'birthdays')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'birthdays' ? 'bg-pink-50 ring-2 ring-pink-200' : 'bg-white')}><p className="text-xs text-gray-500">Birthdays</p><p className="text-xl font-bold text-pink-600">{birthdayCount}</p><p className="text-[10px] text-gray-400">Next {birthdayLookahead}d</p></button>
        <button onClick={() => setFilter(filter === 'anniversaries' ? 'all' : 'anniversaries')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'anniversaries' ? 'bg-purple-50 ring-2 ring-purple-200' : 'bg-white')}><p className="text-xs text-gray-500">Homeiversaries</p><p className="text-xl font-bold text-purple-600">{anniversaryCount}</p><p className="text-[10px] text-gray-400">Next {anniversaryLookahead}d</p></button>
      </div>

      <div className="mb-4"><div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search SOI..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: '16px' }} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div></div>

      <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide"><div className="flex gap-2 min-w-max">{['all', 'Past Client', 'Family', 'Friend', 'Vendor', 'Lender', 'Inspector'].map(f => <button key={f} onClick={() => setFilter(f)} className={'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ' + (filter === f ? 'bg-[#1a2e44] text-white' : 'bg-white text-gray-600 border border-gray-200')}>{f === 'all' ? 'All' : f}</button>)}</div></div>

      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-4 text-sm">Add to SOI</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Name *" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <select value={formData.relationship} onChange={(e) => setFormData(p => ({ ...p, relationship: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none">{RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <div><label className="block text-xs text-gray-500 mb-1">Close Date</label><input type="date" value={formData.close_date} onChange={(e) => setFormData(p => ({ ...p, close_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Birthday</label><input type="date" value={formData.birthday} onChange={(e) => setFormData(p => ({ ...p, birthday: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !formData.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Adding...' : 'Add'}</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center"><p className="text-gray-500">No one in your SOI yet</p><button onClick={() => setShowAddForm(true)} className="mt-3 text-sm text-[#1a2e44] font-medium hover:underline">Add your first person</button></div>
        ) : (
          <div className="divide-y divide-gray-100">{filtered.map((p) => {
            const touch = getTouchStatus(p); const bday = isUpcomingBirthday(p); const anni = isUpcomingAnniversary(p)
            return (
              <div key={p.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + touch.dot} />
                      <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{p.relationship}</span>
                      <span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + touch.color}>{touch.label}</span>
                      {bday && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-100 text-pink-700">Birthday {fmtDate(p.birthday)}</span>}
                      {anni && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">Anniversary</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {p.phone && <span>{formatPhone(p.phone)}</span>}
                      {p.email && <span>{p.email}</span>}
                      {p.last_touch && <span>Last: {Math.floor((Date.now() - new Date(p.last_touch)) / 864e5)}d ago</span>}
                      {p.touch_count > 0 && <span>{p.touch_count} touches</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setShowLogTouch(p); setTouchMethod('Call'); setTouchNote('') }} className="px-2.5 py-1.5 text-[11px] font-medium text-[#1a2e44] bg-[#1a2e44]/10 rounded-lg hover:bg-[#1a2e44]/20">Log Touch</button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            )
          })}</div>
        )}
      </div>

      {showLogTouch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Log Touch</h3><p className="text-sm text-gray-500 mb-4">{showLogTouch.name}</p>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1.5">Method</label><div className="flex flex-wrap gap-1.5">{TOUCH_METHODS.map(m => <button key={m} onClick={() => setTouchMethod(m)} className={'px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' + (touchMethod === m ? 'bg-[#1a2e44] text-white' : 'bg-gray-100 text-gray-600')}>{m}</button>)}</div></div>
              <div><label className="block text-xs text-gray-500 mb-1.5">Note (optional)</label><input type="text" value={touchNote} onChange={(e) => setTouchNote(e.target.value)} placeholder="What did you talk about?" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4"><button onClick={() => setShowLogTouch(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button><button onClick={handleLogTouch} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-lg">Log Touch</button></div>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="SOI Help" sections={HELP_SECTIONS} />
    </div>
  )
}