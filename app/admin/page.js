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

  useEffect(() => { if (user) fetchData() }, [user])

  const fetchData = async () => {
    try {
      const params = user.role === 'member' ? `?user_id=${user.id}&user_role=member` : ''
      const [cRes, tRes] = await Promise.all([
        fetch('/api/contact' + params).then(r => r.json()),
        fetch('/api/admin/transactions').then(r => r.json()).catch(() => ({ transactions: [] }))
      ])
      if (cRes.data) setContacts(cRes.data)
      if (tRes.transactions) setTransactions(tRes.transactions)
    } catch (e) {} finally { setLoading(false) }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 864e5)
  const todayEvents = contacts.filter(s => s.scheduled_date === todayStr)
  const newLeads = contacts.filter(s => s.status === 'new')
  const underContract = contacts.filter(s => s.status === 'under_contract')
  const closedThisMonth = contacts.filter(s => s.status === 'closed' && new Date(s.updated_at).getMonth() === now.getMonth())
  const newThisWeek = contacts.filter(s => new Date(s.created_at) >= weekAgo)

  // Pipeline revenue from transactions
  const pendingRevenue = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (parseFloat(t.net_commission) || 0), 0)
  const closedRevenue = transactions.filter(t => t.status === 'closed').reduce((sum, t) => sum + (parseFloat(t.net_commission) || 0), 0)

  // Needs attention
  const needsAttention = contacts.filter(s => {
    if (['closed', 'lost'].includes(s.status)) return false
    if (s.next_follow_up) { const f = new Date(s.next_follow_up); f.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); if (f <= t) return true }
    if (s.status === 'new' && (Date.now() - new Date(s.created_at)) / 36e5 > 1) return true
    if (s.status === 'offer_submitted' && (Date.now() - new Date(s.updated_at)) / 864e5 > 2) return true
    return false
  }).sort((a, b) => {
    const aScore = a.status === 'new' ? 0 : a.next_follow_up ? 1 : 2
    const bScore = b.status === 'new' ? 0 : b.next_follow_up ? 1 : 2
    return aScore - bScore
  })

  // Upcoming transaction milestones (next 7 days)
  const upcomingMilestones = transactions.filter(t => t.status === 'pending' && t.milestones).flatMap(t => {
    const milestones = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : t.milestones
    return (milestones || []).filter(m => !m.completed && m.due_date).map(m => ({ ...m, transaction: t })).filter(m => {
      const due = new Date(m.due_date)
      return due >= now && due <= new Date(now.getTime() + 7 * 864e5)
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {hasPermission('contacts') && (
          <Link href="/admin/contacts" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center relative">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {newLeads.length > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-[8px] font-bold">{newLeads.length}</span></div>}
            </div>
            <span className="text-xs font-medium text-gray-700 text-center">Contacts</span>
          </Link>
        )}
        {hasPermission('pipeline') && (
          <Link href="/admin/pipeline" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#1a2e44]/10 flex items-center justify-center"><svg className="w-5 h-5 text-[#1a2e44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg></div>
            <span className="text-xs font-medium text-gray-700 text-center">Pipeline</span>
          </Link>
        )}
        <Link href="/admin/transactions" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
          <span className="text-xs font-medium text-gray-700 text-center">Deals</span>
        </Link>
        {hasPermission('calendar') && (
          <Link href="/admin/calendar" className="bg-white rounded-xl p-3 sm:p-4 shadow-sm flex flex-col items-center gap-2 active:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center"><svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
            <span className="text-xs font-medium text-gray-700 text-center">Calendar</span>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-blue-600">{newThisWeek.length}</p><p className="text-[10px] text-gray-500">New This Week</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-emerald-600">{underContract.length}</p><p className="text-[10px] text-gray-500">Under Contract</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-green-600">{fmtMoney(closedRevenue)}</p><p className="text-[10px] text-gray-500">Closed YTD</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center"><p className="text-lg sm:text-xl font-bold text-[#e8963e]">{fmtMoney(pendingRevenue)}</p><p className="text-[10px] text-gray-500">Pending GCI</p></div>
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
          <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">Upcoming Deadlines</h3>
            <span className="text-gray-400 text-sm">({upcomingMilestones.length})</span>
          </div>
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
    </div>
  )
}
