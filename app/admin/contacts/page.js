'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New Lead', bg: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', bg: 'bg-yellow-100 text-yellow-700' },
  { value: 'showing_scheduled', label: 'Showing', bg: 'bg-purple-100 text-purple-700' },
  { value: 'offer_submitted', label: 'Offer Sent', bg: 'bg-indigo-100 text-indigo-700' },
  { value: 'under_contract', label: 'Under Contract', bg: 'bg-emerald-100 text-emerald-700' },
  { value: 'closed', label: 'Closed', bg: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', bg: 'bg-red-100 text-red-700' },
]

const LEAD_TYPES = [
  { value: 'all_types', label: 'All Types' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'both', label: 'Buyer/Seller' },
  { value: 'investor', label: 'Investor' },
  { value: 'renter', label: 'Renter' },
]

const HELP_SECTIONS = [
  { title: 'What is this page?', body: 'Your list of all leads, clients, and people in your network. Everyone from new inquiries to closed deals lives here.' },
  { title: 'Create Contact', body: 'Tap the + New button to add a contact manually. Fill in name and phone at minimum.' },
  { title: 'Status filters', body: 'Filter by pipeline stage. Counts update in real time.' },
  { title: 'Tap a contact', body: 'Open the detail page to call, text, email, change status, add birthday/close dates, and see activity history.' },
  { title: 'Birthday', body: 'Contacts with upcoming birthdays show a pink badge so you remember to reach out.' },
]

export default function ContactsPage() {
  const { user } = useAdminAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all_types')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showHelp, setShowHelp] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', service_type: '', lead_type: '', status: 'new' })

  useEffect(() => { if (user) fetchContacts() }, [user])

  const fetchContacts = async () => {
    try {
      const params = user.role === 'member' ? `?user_id=${user.id}&user_role=member` : ''
      const r = await fetch('/api/contact' + params); const res = await r.json(); if (res.data) setContacts(res.data)
    } catch (e) {} finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!newContact.name.trim()) return
    setSaving(true)
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newContact.name, phone: newContact.phone || '0000000000', email: newContact.email || 'noemail@placeholder.com', service_type: newContact.service_type || null, source: 'manual' }) })
      const res = await r.json()
      if (res.data && (newContact.lead_type || newContact.status !== 'new')) {
        await fetch('/api/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: res.data.id, lead_type: newContact.lead_type || null, status: newContact.status }) })
      }
      setShowCreate(false); setNewContact({ name: '', phone: '', email: '', service_type: '', lead_type: '', status: 'new' }); fetchContacts()
    } catch (e) {} finally { setSaving(false) }
  }

  const filtered = contacts
    .filter(s => {
      if (filter !== 'all' && s.status !== filter) return false
      if (typeFilter !== 'all_types' && s.lead_type !== typeFilter) return false
      if (search) { const q = search.toLowerCase(); return s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.phone?.includes(q) || s.service_type?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q) }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sortBy === 'scheduled') { if (!a.scheduled_date && !b.scheduled_date) return 0; if (!a.scheduled_date) return 1; if (!b.scheduled_date) return -1; return new Date(a.scheduled_date) - new Date(b.scheduled_date) }
      return 0
    })

  const formatPhone = (phone) => { if (!phone || phone === '0000000000') return ''; const c = phone.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0,3) + ') ' + c.slice(3,6) + '-' + c.slice(6); if (c.length === 11 && c[0] === '1') return '(' + c.slice(1,4) + ') ' + c.slice(4,7) + '-' + c.slice(7); return phone }
  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const getStatusBadge = (status) => (statuses.find(s => s.value === status)?.bg || 'bg-gray-100 text-gray-700')
  const getStatusLabel = (status) => (statuses.find(s => s.value === status)?.label || status)
  const getStatusCount = (status) => status === 'all' ? contacts.length : contacts.filter(s => s.status === status).length
  const timeAgo = (d) => { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 3600) return Math.floor(s/60) + 'm ago'; if (s < 86400) return Math.floor(s/3600) + 'h ago'; if (s < 604800) return Math.floor(s/86400) + 'd ago'; return formatDate(d) }
  const getUrgencyColor = (contact) => { if (!['new', 'contacted'].includes(contact.status)) return ''; const h = (Date.now() - new Date(contact.created_at)) / 36e5; if (h < 1) return 'border-l-4 border-l-green-400'; if (h < 24) return 'border-l-4 border-l-yellow-400'; return 'border-l-4 border-l-red-400' }
  const getLeadTypeBadge = (type) => { if (!type) return null; const colors = { buyer: 'bg-sky-100 text-sky-700', seller: 'bg-orange-100 text-orange-700', both: 'bg-violet-100 text-violet-700', investor: 'bg-teal-100 text-teal-700', renter: 'bg-gray-100 text-gray-600' }; return colors[type] || 'bg-gray-100 text-gray-600' }
  const isUpcomingBirthday = (c) => { if (!c.birthday) return false; const b = new Date(c.birthday + 'T00:00:00'); const today = new Date(); const thisYear = new Date(today.getFullYear(), b.getMonth(), b.getDate()); const diff = (thisYear - today) / 864e5; return diff >= 0 && diff <= 14 }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Contacts</h2><p className="text-gray-500 text-xs sm:text-sm">{contacts.length} total</p></div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <Link href="/admin/pipeline" className="px-3 py-1.5 text-xs font-medium text-[#1a2e44] bg-[#1a2e44]/10 rounded-lg hover:bg-[#1a2e44]/20 transition-colors">Board View</Link>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1a2e44] rounded-lg hover:bg-[#0f1d2d]"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New</button>
        </div>
      </div>

      {/* Create Contact Form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-3 text-sm">New Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Name *" value={newContact.name} onChange={(e) => setNewContact(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="tel" placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="email" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact(p => ({ ...p, email: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <input type="text" placeholder="Interest (e.g. 3BR in Buckhead)" value={newContact.service_type} onChange={(e) => setNewContact(p => ({ ...p, service_type: e.target.value }))} style={{ fontSize: '16px' }} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" />
            <select value={newContact.lead_type} onChange={(e) => setNewContact(p => ({ ...p, lead_type: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none bg-white"><option value="">Lead Type...</option><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="both">Buyer/Seller</option><option value="investor">Investor</option><option value="renter">Renter</option></select>
            <select value={newContact.status} onChange={(e) => setNewContact(p => ({ ...p, status: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none bg-white"><option value="new">New Lead</option><option value="contacted">Contacted</option><option value="showing_scheduled">Showing</option></select>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleCreate} disabled={saving || !newContact.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Adding...' : 'Add Contact'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500">New Leads</p><p className="text-xl font-bold text-blue-600">{getStatusCount('new')}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500">Showings</p><p className="text-xl font-bold text-purple-600">{getStatusCount('showing_scheduled')}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500">Under Contract</p><p className="text-xl font-bold text-emerald-600">{getStatusCount('under_contract')}</p></div>
      </div>

      <div className="mb-4 sm:mb-6"><div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg><input type="text" placeholder="Search name, email, phone, address..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: '16px' }} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] focus:border-transparent outline-none" /></div></div>

      <div className="mb-4 sm:mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide"><div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">{statuses.map((status) => <button key={status.value} onClick={() => setFilter(status.value)} className={'flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all ' + (filter === status.value ? 'bg-[#1a2e44] text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 active:scale-95')}>{status.label}<span className={'ml-1.5 ' + (filter === status.value ? 'text-white/70' : 'text-gray-400')}>{getStatusCount(status.value)}</span></button>)}</div></div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm text-gray-600 border border-gray-200 bg-white rounded-lg px-2 py-1 focus:ring-0 cursor-pointer">{LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm text-gray-600 border-none bg-transparent focus:ring-0 cursor-pointer pr-6"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="scheduled">By scheduled date</option></select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? <div className="p-8 sm:p-12 text-center"><p className="text-gray-500">{search ? 'No contacts match your search' : 'No contacts found'}</p></div> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Interest</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Scheduled</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Added</th><th className="px-6 py-3"></th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((contact) => (
                    <tr key={contact.id} className={'hover:bg-gray-50 transition-colors ' + getUrgencyColor(contact)}>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><div><p className="font-medium text-gray-900">{contact.name}</p><p className="text-sm text-gray-500">{formatPhone(contact.phone)}</p></div>{isUpcomingBirthday(contact) && <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-pink-100 text-pink-700">Bday</span>}</div></td>
                      <td className="px-6 py-4">{contact.lead_type && <span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + getLeadTypeBadge(contact.lead_type)}>{contact.lead_type}</span>}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{contact.service_type || '—'}</td>
                      <td className="px-6 py-4"><span className={'inline-flex px-2.5 py-1 rounded-full text-xs font-medium ' + getStatusBadge(contact.status)}>{getStatusLabel(contact.status)}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{contact.scheduled_date ? formatDate(contact.scheduled_date) : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(contact.created_at)}</td>
                      <td className="px-6 py-4"><Link href={'/admin/contacts/' + contact.id} className="text-[#1a2e44] hover:text-[#0f1d2d] font-medium text-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((contact) => (
                <Link key={contact.id} href={'/admin/contacts/' + contact.id} className={'block p-4 active:bg-gray-50 transition-colors ' + getUrgencyColor(contact)}>
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="font-semibold text-gray-900 truncate">{contact.name}</p>{isUpcomingBirthday(contact) && <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-pink-100 text-pink-700">Bday</span>}</div>
                      <p className="text-sm text-gray-500">{contact.service_type || 'No interest specified'}</p>
                    </div>
                    <div className="flex flex-col items-end ml-3"><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + getStatusBadge(contact.status)}>{getStatusLabel(contact.status)}</span><p className="text-[10px] text-gray-400 mt-1">{timeAgo(contact.created_at)}</p></div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {formatPhone(contact.phone) && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{formatPhone(contact.phone)}</span>}
                    {contact.lead_type && <span className={'inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ' + getLeadTypeBadge(contact.lead_type)}>{contact.lead_type}</span>}
                    {contact.scheduled_date && <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{formatDate(contact.scheduled_date)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Contacts Help" sections={HELP_SECTIONS} />
    </div>
  )
}