'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '../layout'

const STATUS_COLORS = {
  showing_scheduled: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  under_contract: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  offer_submitted: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  new: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  contacted: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  closed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}
const STATUS_LABELS = { showing_scheduled: 'Showing', under_contract: 'Contract', offer_submitted: 'Offer', new: 'New', contacted: 'Contacted', closed: 'Closed', lost: 'Lost' }
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const EVENT_TYPES = ['Showing', 'Open House', 'Listing Appointment', 'Buyer Consultation', 'Closing', 'Inspection', 'Appraisal', 'Final Walkthrough', 'Other']
const TIME_OPTIONS = ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM']

export default function CalendarPage() {
  const { user } = useAdminAuth()
  const isAdmin = user?.role === 'admin'
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState(typeof window !== 'undefined' && window.innerWidth < 640 ? 'week' : 'month')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [newEvent, setNewEvent] = useState({ name: '', phone: '', service_type: '', scheduled_date: '', scheduled_time: '', status: 'showing_scheduled', address: '', notes: '' })

  useEffect(() => { if (user) fetchSubmissions() }, [user])

  const fetchSubmissions = async () => {
    try { const params = user.role === 'member' ? `?user_id=${user.id}&user_role=member` : ''; const r = await fetch('/api/contact' + params); const res = await r.json(); if (res.data) setSubmissions(res.data.filter(s => s.scheduled_date)) } catch (e) {} finally { setLoading(false) }
  }

  const openAddModal = (date) => {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    setNewEvent({ name: '', phone: '', service_type: '', scheduled_date: dateStr, scheduled_time: '', status: 'showing_scheduled', address: '', notes: '' })
    setShowAddModal(true)
  }

  const handleAddEvent = async () => {
    if (!newEvent.name || !newEvent.service_type || !newEvent.scheduled_date) return
    setSaving(true)
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newEvent.name, phone: newEvent.phone || '0000000000', email: 'noemail@placeholder.com', service_type: newEvent.service_type, message: newEvent.notes || null, source: 'calendar' }) })
      const res = await r.json()
      if (res.data) await fetch('/api/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: res.data.id, status: newEvent.status, scheduled_date: newEvent.scheduled_date, scheduled_time: newEvent.scheduled_time || null, address: newEvent.address || null }) })
      setShowAddModal(false); setSuccessMsg('Event added'); fetchSubmissions(); setTimeout(() => setSuccessMsg(''), 2000)
    } catch (err) {} finally { setSaving(false) }
  }

  const getMonthDays = () => { const y = currentDate.getFullYear(), m = currentDate.getMonth(); const f = new Date(y, m, 1), l = new Date(y, m + 1, 0); const days = []; const pl = new Date(y, m, 0).getDate(); for (let i = f.getDay() - 1; i >= 0; i--) days.push({ date: new Date(y, m - 1, pl - i), isCurrentMonth: false }); for (let d = 1; d <= l.getDate(); d++) days.push({ date: new Date(y, m, d), isCurrentMonth: true }); const rem = 42 - days.length; for (let i = 1; i <= rem; i++) days.push({ date: new Date(y, m + 1, i), isCurrentMonth: false }); return days }
  const getWeekDays = () => { const s = new Date(currentDate); s.setDate(s.getDate() - s.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); return { date: d, isCurrentMonth: true } }) }
  const getEventsForDate = (date) => { const ds = date.toISOString().split('T')[0]; return submissions.filter(s => s.scheduled_date === ds) }
  const isToday = (d) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear() }
  const isSameDate = (a, b) => a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const navigate = (dir) => { const n = new Date(currentDate); if (view === 'month') n.setMonth(n.getMonth() + dir); else n.setDate(n.getDate() + dir * 7); setCurrentDate(n) }
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()) }
  const formatPhone = (p) => { if (!p || p === '0000000000') return ''; const c = p.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0,3) + ') ' + c.slice(3,6) + '-' + c.slice(6); return p }

  const days = view === 'month' ? getMonthDays() : getWeekDays()
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Calendar</h2><p className="text-gray-500 text-xs sm:text-sm">{submissions.length} scheduled</p></div>
        <div className="flex items-center gap-2">
          {isAdmin && <button onClick={() => openAddModal(selectedDate || new Date())} className="px-3 py-1.5 text-xs font-medium text-white bg-[#1a2e44] rounded-lg hover:bg-[#0f1d2d] flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add</button>}
          <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-[#1a2e44] bg-[#1a2e44]/10 rounded-lg">Today</button>
          <div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={() => setView('month')} className={'px-3 py-1.5 text-xs font-medium rounded-md ' + (view === 'month' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>Month</button><button onClick={() => setView('week')} className={'px-3 py-1.5 text-xs font-medium rounded-md ' + (view === 'week' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>Week</button></div>
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <h3 className="text-base sm:text-lg font-semibold text-[#1a2e44]">{view === 'month' ? MONTHS[currentDate.getMonth()] + ' ' + currentDate.getFullYear() : (() => { const s = new Date(currentDate); s.setDate(s.getDate() - s.getDay()); const e = new Date(s); e.setDate(e.getDate() + 6); return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' — ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })()}</h3>
        <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg"><svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
      </div>

      {/* Mobile Week */}
      {view === 'week' && (
        <div className="sm:hidden space-y-3 mb-4">
          {(() => {
            const weekDays = getWeekDays()
            const todayIndex = weekDays.findIndex(d => isToday(d.date))
            const reordered = todayIndex >= 0 ? [...weekDays.slice(todayIndex), ...weekDays.slice(0, todayIndex)] : weekDays
            return reordered.map((day, i) => {
              const events = getEventsForDate(day.date); const today = isToday(day.date)
              const isPast = day.date < new Date(new Date().setHours(0,0,0,0)) && !today
              return (
                <div key={i} className={'bg-white rounded-xl shadow-sm overflow-hidden ' + (isPast ? 'opacity-60' : '')}>
                  <div className={'px-4 py-3 flex items-center justify-between border-l-4 ' + (today ? 'border-l-[#1a2e44] bg-[#1a2e44]/5' : 'border-l-gray-200')}>
                    <div className="flex items-center gap-3">
                      <div className="text-center w-10"><p className={'text-[10px] font-semibold uppercase ' + (today ? 'text-[#1a2e44]' : 'text-gray-400')}>{DAYS_OF_WEEK[day.date.getDay()]}</p><p className={'text-xl font-bold ' + (today ? 'text-[#1a2e44]' : 'text-gray-800')}>{day.date.getDate()}</p></div>
                      {today && <span className="text-[10px] font-medium text-white bg-[#1a2e44] px-2 py-0.5 rounded-full">Today</span>}
                    </div>
                    {events.length > 0 && <span className="text-xs font-medium text-gray-400">{events.length}</span>}
                  </div>
                  {events.length === 0 ? <div className="px-4 py-3"><p className="text-xs text-gray-300">Nothing scheduled</p></div> : (
                    <div className="divide-y divide-gray-100">
                      {events.map((event) => { const colors = STATUS_COLORS[event.status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' }; return (
                        <Link key={event.id} href={'/admin/contacts/' + event.id} className="flex items-start gap-3 px-4 py-3 active:bg-gray-50">
                          <div className={'w-1 self-stretch rounded-full flex-shrink-0 ' + colors.dot} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{event.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + colors.bg + ' ' + colors.text}>{STATUS_LABELS[event.status] || event.status}</span></div>
                            <p className="text-xs text-gray-500">{event.service_type}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">{event.scheduled_time && <span>{event.scheduled_time}</span>}{event.address && <span>{event.address}</span>}</div>
                          </div>
                        </Link>
                      ) })}
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* Desktop Grid */}
      {(view === 'month' || view === 'week') && (
        <div className={'bg-white rounded-xl shadow-sm overflow-hidden mb-4 ' + (view === 'week' ? 'hidden sm:block' : '')}>
          <div className="grid grid-cols-7 border-b border-gray-100">{DAYS_OF_WEEK.map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const events = getEventsForDate(day.date); const today = isToday(day.date); const selected = isSameDate(day.date, selectedDate)
              return (
                <button key={i} onClick={() => setSelectedDate(day.date)} className={'relative border-b border-r border-gray-50 transition-colors text-left ' + (view === 'month' ? 'min-h-[72px] sm:min-h-[90px] p-1 sm:p-2' : 'min-h-[120px] p-2 sm:p-3') + (!day.isCurrentMonth ? ' bg-gray-50/50' : '') + (selected ? ' bg-[#1a2e44]/5 ring-1 ring-inset ring-[#1a2e44]/20' : ' hover:bg-gray-50')}>
                  <span className={'inline-flex items-center justify-center text-xs sm:text-sm font-medium rounded-full w-6 h-6 sm:w-7 sm:h-7 ' + (today ? 'bg-[#1a2e44] text-white' : '') + (!day.isCurrentMonth ? ' text-gray-300' : ' text-gray-700')}>{day.date.getDate()}</span>
                  {events.length > 0 && (<><div className="flex gap-0.5 mt-0.5 sm:hidden">{events.slice(0, 3).map((e, j) => <div key={j} className={'w-1.5 h-1.5 rounded-full ' + (STATUS_COLORS[e.status]?.dot || 'bg-gray-400')} />)}</div><div className="hidden sm:flex flex-col gap-0.5 mt-1">{events.slice(0, 2).map((e, j) => { const c = STATUS_COLORS[e.status] || { bg: 'bg-gray-100', text: 'text-gray-700' }; return <div key={j} className={'truncate text-[10px] font-medium px-1.5 py-0.5 rounded ' + c.bg + ' ' + c.text}>{e.name.split(' ')[0]} · {STATUS_LABELS[e.status] || e.status}</div> })}{events.length > 2 && <span className="text-[10px] text-gray-400 px-1.5">+{events.length - 2}</span>}</div></>)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Date */}
      {selectedDate && view === 'month' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}<span className="text-gray-400 font-normal ml-2">({selectedEvents.length})</span></h3>
            {isAdmin && <button onClick={() => openAddModal(selectedDate)} className="text-xs text-[#1a2e44] font-medium flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add</button>}
          </div>
          {selectedEvents.length === 0 ? <div className="p-8 text-center"><p className="text-xs text-gray-400">Nothing scheduled</p></div> : (
            <div className="divide-y divide-gray-100">
              {selectedEvents.map((event) => { const colors = STATUS_COLORS[event.status] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' }; return (
                <Link key={event.id} href={'/admin/contacts/' + event.id} className="flex items-start gap-3 p-4 sm:px-6 hover:bg-gray-50">
                  <div className={'w-1 self-stretch rounded-full flex-shrink-0 ' + colors.dot} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><p className="font-semibold text-gray-900 text-sm truncate">{event.name}</p><span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + colors.bg + ' ' + colors.text}>{STATUS_LABELS[event.status] || event.status}</span></div>
                    <p className="text-xs text-gray-500">{event.service_type}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">{event.scheduled_time && <span>{event.scheduled_time}</span>}{formatPhone(event.phone) && <span>{formatPhone(event.phone)}</span>}</div>
                    {event.address && <p className="text-xs text-gray-400 mt-0.5">{event.address}</p>}
                  </div>
                </Link>
              ) })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 px-1">{Object.entries(STATUS_LABELS).map(([key, label]) => { const c = STATUS_COLORS[key]; if (!c) return null; return <div key={key} className="flex items-center gap-1.5"><div className={'w-2 h-2 rounded-full ' + c.dot} /><span className="text-xs text-gray-500">{label}</span></div> })}</div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-gray-900">Add Event</h3><button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Date *</label><input type="date" value={newEvent.scheduled_date} onChange={(e) => setNewEvent(p => ({ ...p, scheduled_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Time</label><select value={newEvent.scheduled_time} onChange={(e) => setNewEvent(p => ({ ...p, scheduled_time: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#1a2e44] outline-none bg-white"><option value="">Select...</option>{TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Event Type *</label><select value={newEvent.service_type} onChange={(e) => setNewEvent(p => ({ ...p, service_type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none bg-white"><option value="">Select...</option>{EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-xs text-gray-500 mb-1">Client Name *</label><input type="text" value={newEvent.name} onChange={(e) => setNewEvent(p => ({ ...p, name: e.target.value }))} placeholder="Client name" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Phone</label><input type="tel" value={newEvent.phone} onChange={(e) => setNewEvent(p => ({ ...p, phone: e.target.value }))} placeholder="(770) 000-0000" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Property Address</label><input type="text" value={newEvent.address} onChange={(e) => setNewEvent(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Notes</label><textarea value={newEvent.notes} onChange={(e) => setNewEvent(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional..." style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none resize-none" /></div>
              <button onClick={handleAddEvent} disabled={saving || !newEvent.name || !newEvent.service_type || !newEvent.scheduled_date} className="w-full mt-2 py-3 bg-[#1a2e44] text-white rounded-xl font-semibold hover:bg-[#0f1d2d] disabled:opacity-50">{saving ? 'Adding...' : 'Add to Calendar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
