'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const RELATIONSHIP_TYPES = ['Past Client', 'Family', 'Friend', 'Colleague', 'Vendor', 'Lender', 'Title Rep', 'Inspector', 'Other']

const HELP_SECTIONS = [
  { title: 'What is this?', body: 'Your personal rolodex — past clients, family, friends, vendors, and anyone who might send you referrals or repeat business.' },
  { title: 'Auto-import', body: 'When a contact closes, a banner appears so you can add them here with one tap.' },
  { title: 'Birthdays', body: 'Add a birthday and the app will flag it when it is coming up so you can send a card or a text.' },
  { title: 'Homeiversaries', body: 'Add a close date and the app flags the anniversary each year. Great excuse to check in.' },
  { title: 'Last contacted', body: 'Tap "Mark Contacted" to update the date. People you have not reached out to recently float to the top.' },
]

export default function PeoplePage() {
  const { user } = useAdminAuth()
  const [people, setPeople] = useState([])
  const [contacts, setContacts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
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

  const getSetting = (key, fb) => parseInt(settings[key]?.value) || fb

  // Closed contacts not yet in SOI
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
      const r = await fetch('/api/admin/soi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: contact.name, email: contact.email, phone: contact.phone, relationship: 'Past Client', close_date: new Date().toISOString().split('T')[0], address: contact.address, notes: '' }) })
      if (r.ok) { fetchAll(); setSuccessMsg('Added'); setTimeout(() => setSuccessMsg(''), 2000) }
    } catch (e) {} finally { setSaving(false) }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await fetch('/api/admin/soi', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...formData }) })
      } else {
        await fetch('/api/admin/soi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      }
      setShowAddForm(false); setEditing(null); setFormData({ name: '', email: '', phone: '', relationship: 'Past Client', close_date: '', birthday: '', address: '', notes: '' })
      fetchAll(); setSuccessMsg(editing ? 'Updated' : 'Added'); setTimeout(() => setSuccessMsg(''), 2000)
    } catch (e) {} finally { setSaving(false) }
  }

  const handleEdit = (p) => {
    setEditing(p.id); setShowAddForm(true)
    setFormData({ name: p.name || '', email: p.email || '', phone: p.phone || '', relationship: p.relationship || 'Past Client', close_date: p.close_date || '', birthday: p.birthday || '', address: p.address || '', notes: p.notes || '' })
  }

  const handleMarkContacted = async (p) => {
    setPeople(prev => prev.map(x => x.id === p.id ? { ...x, last_touch: new Date().toISOString() } : x))
    try { await fetch('/api/admin/soi', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, last_touch: new Date().toISOString() }) }) } catch (e) {}
    setSuccessMsg('Updated'); setTimeout(() => setSuccessMsg(''), 1500)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this person?')) return
    try { await fetch('/api/admin/soi', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchAll() } catch (e) {}
  }

  const overdueDays = getSetting('soi_overdue_days', 90)
  const birthdayLookahead = getSetting('soi_birthday_lookahead', 14)
  const anniversaryLookahead = getSetting('soi_anniversary_lookahead', 14)

  const daysSinceLast = (p) => { if (!p.last_touch) return 999; return Math.floor((Date.now() - new Date(p.last_touch)) / 864e5) }
  const isOverdue = (p) => daysSinceLast(p) > overdueDays

  const isUpcomingBirthday = (p) => { if (!p.birthday) return false; const b = new Date(p.birthday + 'T00:00:00'); const today = new Date(); const thisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate()); const diff = (thisYear - today) / 864e5; return diff >= 0 && diff <= birthdayLookahead }
  const isUpcomingAnniversary = (p) => { if (!p.close_date) return false; const cd = new Date(p.close_date + 'T00:00:00'); const today = new Date(); const thisYear = new Date(today.getFullYear(), cd.getMonth(), cd.getDate()); const diff = (thisYear - today) / 864e5; return diff >= 0 && diff <= anniversaryLookahead }

  const formatPhone = (phone) => { if (!phone) return ''; const c = phone.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0, 3) + ') ' + c.slice(3, 6) + '-' + c.slice(6); return phone }
  const fmtDate = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  const fmtDateFull = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

  const filtered = people
    .filter(p => { if (filter === 'overdue') return isOverdue(p); if (filter === 'birthdays') return isUpcomingBirthday(p); if (filter === 'anniversaries') return isUpcomingAnniversary(p); if (filter !== 'all') return p.relationship === filter; return true })
    .filter(p => { if (!search) return true; const q = search.toLowerCase(); return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.phone?.includes(q) })
    .sort((a, b) => daysSinceLast(b) - daysSinceLast(a))

  const overdueCount = people.filter(isOverdue).length
  const birthdayCount = people.filter(isUpcomingBirthday).length
  const anniversaryCount = people.filter(isUpcomingAnniversary).length

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">People</h2><p className="text-gray-500 text-xs sm:text-sm">{people.length} in your network</p></div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <button onClick={() => { setEditing(null); setFormData({ name: '', email: '', phone: '', relationship: 'Past Client', close_date: '', birthday: '', address: '', notes: '' }); setShowAddForm(!showAddForm) }} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-[#1a2e44] rounded-xl hover:bg-[#0f1d2d]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="hidden sm:inline">Add</span></button>
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      {/* Auto-import */}
      {closedNotInSOI.length > 0 && (
        <div className="mb-4 rounded-xl p-4 bg-blue-50 border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-2">{closedNotInSOI.length} closed client{closedNotInSOI.length !== 1 ? 's' : ''} not in your network yet</p>
          <div className="space-y-2">{closedNotInSOI.slice(0, 4).map(c => (
            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
              <div><p className="text-sm font-medium text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.service_type}</p></div>
              <button onClick={() => handleAddFromContact(c)} disabled={saving} className="text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-200">Add</button>
            </div>
          ))}{closedNotInSOI.length > 4 && <p className="text-xs text-blue-600">+ {closedNotInSOI.length - 4} more</p>}</div>
        </div>
      )}

      {/* Alert cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'overdue' ? 'bg-red-50 ring-2 ring-red-200' : 'bg-white')}><p className="text-xs text-gray-500">Reach Out</p><p className="text-xl font-bold text-red-600">{overdueCount}</p><p className="text-[10px] text-gray-400">{overdueDays}+ days</p></button>
        <button onClick={() => setFilter(filter === 'birthdays' ? 'all' : 'birthdays')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'birthdays' ? 'bg-pink-50 ring-2 ring-pink-200' : 'bg-white')}><p className="text-xs text-gray-500">Birthdays</p><p className="text-xl font-bold text-pink-600">{birthdayCount}</p><p className="text-[10px] text-gray-400">Next {birthdayLookahead}d</p></button>
        <button onClick={() => setFilter(filter === 'anniversaries' ? 'all' : 'anniversaries')} className={'rounded-xl p-3 shadow-sm transition-colors ' + (filter === 'anniversaries' ? 'bg-purple-50 ring-2 ring-purple-200' : 'bg-white')}><p className="text-xs text-gray-500">Homeiversaries</p><p className="text-xl font-bold text-purple-600">{anniversaryCount}</p><p className="text-[10px] text-gray-400">Next {anniversaryLookahead}d</p></button>
      </div>

      {/* Search */}
      <div className="mb-4"><div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: '16px' }} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div></div>

      {/* Filters */}
      <div className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide"><div className="flex gap-2 min-w-max">{['all', 'Past Client', 'Family', 'Friend', 'Vendor', 'Lender'].map(f => <button key={f} onClick={() => setFilter(f)} className={'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ' + (filter === f ? 'bg-[#1a2e44] text-white' : 'bg-white text-gray-600 border border-gray-200')}>{f === 'all' ? 'All' : f}</button>)}</div></div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-4 text-sm">{editing ? 'Edit Person' : 'Add Person'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Name *" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <select value={formData.relationship} onChange={(e) => setFormData(p => ({ ...p, relationship: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none">{RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <div><label className="block text-xs text-gray-500 mb-1">Birthday</label><input type="date" value={formData.birthday} onChange={(e) => setFormData(p => ({ ...p, birthday: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Close Date</label><input type="date" value={formData.close_date} onChange={(e) => setFormData(p => ({ ...p, close_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            <input type="text" placeholder="Address" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none sm:col-span-2" />
            <textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none resize-none sm:col-span-2" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => { setShowAddForm(false); setEditing(null) }} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !formData.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Saving...' : editing ? 'Save' : 'Add'}</button>
          </div>
        </div>
      )}

      {/* Contact Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center"><p className="text-gray-500">No people yet</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const overdue = isOverdue(p)
            const bday = isUpcomingBirthday(p)
            const anni = isUpcomingAnniversary(p)
            const days = daysSinceLast(p)
            return (
              <div key={p.id} className={'bg-white rounded-xl shadow-sm overflow-hidden border ' + (overdue ? 'border-red-200' : 'border-gray-100')}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{p.relationship}</span>
                      </div>
                      {(bday || anni) && (
                        <div className="flex gap-1.5 mt-1.5">
                          {bday && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-100 text-pink-700">Birthday {fmtDate(p.birthday)}</span>}
                          {anni && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">Homeiversary</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button onClick={() => handleEdit(p)} className="p-1 text-gray-400 hover:text-[#1a2e44] rounded hover:bg-gray-100"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-500">
                    {p.phone && <div className="flex items-center gap-2"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg><a href={'tel:' + p.phone} className="text-[#1a2e44] font-medium">{formatPhone(p.phone)}</a></div>}
                    {p.email && <div className="flex items-center gap-2"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg><span className="truncate">{p.email}</span></div>}
                    {p.address && <div className="flex items-center gap-2"><svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg><span className="truncate">{p.address}</span></div>}
                    {p.notes && <p className="text-gray-400 italic mt-1">{p.notes}</p>}
                  </div>
                </div>

                <div className={'px-4 py-2.5 flex items-center justify-between border-t ' + (overdue ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100')}>
                  <span className={'text-[11px] font-medium ' + (overdue ? 'text-red-600' : days <= 30 ? 'text-green-600' : days <= 60 ? 'text-gray-500' : 'text-amber-600')}>
                    {days === 999 ? 'Never contacted' : days === 0 ? 'Contacted today' : days + 'd since last contact'}
                  </span>
                  <button onClick={() => handleMarkContacted(p)} className={'text-[11px] font-medium px-2.5 py-1 rounded-lg ' + (overdue ? 'text-red-700 bg-red-100 hover:bg-red-200' : 'text-[#1a2e44] bg-[#1a2e44]/10 hover:bg-[#1a2e44]/20')}>
                    Mark Contacted
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="People Help" sections={HELP_SECTIONS} />
    </div>
  )
}