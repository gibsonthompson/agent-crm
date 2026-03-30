'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const COLUMNS = [
  { key: 'new', label: 'New Lead', color: 'border-blue-400', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
  { key: 'contacted', label: 'Contacted', color: 'border-yellow-400', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700' },
  { key: 'showing_scheduled', label: 'Showing', color: 'border-purple-400', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
  { key: 'offer_submitted', label: 'Offer Sent', color: 'border-indigo-400', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700' },
  { key: 'under_contract', label: 'Contract', color: 'border-emerald-400', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'closed', label: 'Closed', color: 'border-green-400', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  { key: 'lost', label: 'Lost', color: 'border-red-400', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
]
const CLOSE_REASONS = ['Found another agent', 'Not ready to buy/sell', 'No response', 'Price expectations', 'Relocated', 'Financing issues', 'Other']
const HELP_SECTIONS = [
  { title: 'The basics', body: 'Every lead moves left to right. New leads on the left, closed deals on the right.' },
  { title: 'How to move a lead', body: 'On a computer, drag and drop. On phone, tap the card and pick the new stage.' },
  { title: 'Pipeline stages', body: 'New Lead → Contacted → Showing → Offer Sent → Under Contract → Closed → Lost.' },
  { title: 'Colored dots', body: 'Green = less than 1 hour old. Yellow = 1-24 hours. Red = over 24 hours. Only on New and Contacted.' },
  { title: 'Under Contract', body: 'Moving a lead to Under Contract will prompt you to create a Transaction for milestone tracking and commission.' },
]

export default function PipelinePage() {
  const { user } = useAdminAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [moveModal, setMoveModal] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [showCloseModal, setShowCloseModal] = useState(null)
  const [closeReason, setCloseReason] = useState('')
  const [showTransactionPrompt, setShowTransactionPrompt] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => { if (user) fetchContacts() }, [user])
  const fetchContacts = async () => { try { const params = user.role === 'member' ? `?user_id=${user.id}&user_role=member` : ''; const r = await fetch('/api/contact' + params); const res = await r.json(); if (res.data) setContacts(res.data) } catch (e) {} finally { setLoading(false) } }

  const updateStatus = async (contactId, newStatus, oldStatus) => {
    if (newStatus === 'lost') { setShowCloseModal({ id: contactId, oldStatus }); setCloseReason(''); return }
    setContacts(prev => prev.map(s => s.id === contactId ? { ...s, status: newStatus } : s))
    try {
      await fetch('/api/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: contactId, status: newStatus }) })
      await fetch('/api/admin/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact_id: contactId, action: 'status_change', old_value: oldStatus, new_value: newStatus, user_id: user?.id }) })
      const label = COLUMNS.find(c => c.key === newStatus)?.label || newStatus
      setSuccessMsg('Moved to ' + label); setTimeout(() => setSuccessMsg(''), 3000)
      // Prompt to create transaction when moving to under_contract
      if (newStatus === 'under_contract') { const c = contacts.find(x => x.id === contactId); if (c) setShowTransactionPrompt(c) }
    } catch (err) { setContacts(prev => prev.map(s => s.id === contactId ? { ...s, status: oldStatus } : s)) }
  }

  const handleCloseLost = async () => {
    if (!showCloseModal || !closeReason) return
    const { id, oldStatus } = showCloseModal
    setContacts(prev => prev.map(s => s.id === id ? { ...s, status: 'lost' } : s)); setShowCloseModal(null)
    try { await fetch('/api/contact', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'lost', close_reason: closeReason }) }); await fetch('/api/admin/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact_id: id, action: 'status_change', old_value: oldStatus, new_value: 'lost', note: 'Reason: ' + closeReason, user_id: user?.id }) }); setSuccessMsg('Marked as lost'); setTimeout(() => setSuccessMsg(''), 2000) } catch (err) { setContacts(prev => prev.map(s => s.id === id ? { ...s, status: oldStatus } : s)) }
  }

  const handleDragStart = (e, id) => { setDraggingId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) }
  const handleDragOver = (e, colKey) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(colKey) }
  const handleDragLeave = () => setDragOverCol(null)
  const handleDrop = (e, colKey) => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData('text/plain'); const c = contacts.find(s => s.id === id); if (c && c.status !== colKey) updateStatus(id, colKey, c.status); setDraggingId(null) }
  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null) }
  const handleMobileMove = (newStatus) => { if (moveModal && moveModal.status !== newStatus) updateStatus(moveModal.id, newStatus, moveModal.status); setMoveModal(null) }

  const formatPhone = (phone) => { if (!phone) return ''; const c = phone.replace(/\D/g, ''); if (c.length === 10) return '(' + c.slice(0,3) + ') ' + c.slice(3,6) + '-' + c.slice(6); return phone }
  const timeAgo = (d) => { const s = Math.floor((Date.now() - new Date(d)) / 1000); if (s < 3600) return Math.floor(s/60) + 'm'; if (s < 86400) return Math.floor(s/3600) + 'h'; return Math.floor(s/86400) + 'd' }
  const getUrgencyDot = (c) => { if (!['new','contacted'].includes(c.status)) return null; const h = (Date.now() - new Date(c.created_at)) / 36e5; if (h > 24) return 'bg-red-500'; if (h > 1) return 'bg-yellow-500'; return 'bg-green-500' }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-6">
      <div className="flex items-center justify-between mb-4">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Pipeline</h2><p className="text-gray-500 text-xs sm:text-sm">{contacts.length} contacts</p></div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          <Link href="/admin/contacts" className="px-3 py-1.5 text-xs font-medium text-[#1a2e44] bg-[#1a2e44]/10 rounded-lg hover:bg-[#1a2e44]/20">List View</Link>
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      {/* Desktop */}
      <div className="hidden sm:grid grid-cols-7 gap-2">
        {COLUMNS.map((col) => {
          const cards = contacts.filter(s => s.status === col.key)
          return (
            <div key={col.key} className={'flex flex-col rounded-xl transition-colors min-w-0 ' + (dragOverCol === col.key ? 'bg-[#1a2e44]/5 ring-2 ring-[#1a2e44]/20' : 'bg-gray-100/80')} onDragOver={(e) => handleDragOver(e, col.key)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, col.key)}>
              <div className={'px-2 py-2 border-t-2 rounded-t-xl flex items-center gap-1 ' + col.color}><h3 className="text-[11px] font-semibold text-gray-800 truncate">{col.label}</h3><span className={'text-[9px] font-bold px-1 py-0.5 rounded-full flex-shrink-0 ' + col.badge}>{cards.length}</span></div>
              <div className="p-1.5 space-y-1.5 min-h-[80px] max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
                {cards.length === 0 && <div className="flex items-center justify-center h-16 text-gray-300 text-[10px]">Empty</div>}
                {cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((contact) => {
                  const dot = getUrgencyDot(contact)
                  return (
                    <div key={contact.id} draggable onDragStart={(e) => handleDragStart(e, contact.id)} onDragEnd={handleDragEnd} className={'bg-white rounded-lg p-2 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ' + (draggingId === contact.id ? 'opacity-40 scale-95' : '')}>
                      <div className="flex items-center justify-between mb-0.5"><div className="flex items-center gap-1 min-w-0">{dot && <div className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + dot} />}<Link href={'/admin/contacts/' + contact.id} className="font-semibold text-[11px] text-gray-900 truncate hover:text-[#1a2e44]" onClick={(e) => e.stopPropagation()}>{contact.name}</Link></div><span className="text-[8px] text-gray-400 flex-shrink-0 ml-1">{timeAgo(contact.created_at)}</span></div>
                      <p className="text-[10px] text-gray-500 truncate">{contact.service_type || 'No details'}</p>
                      <a href={'tel:' + contact.phone} className="text-[9px] text-[#1a2e44] font-medium hover:underline" onClick={(e) => e.stopPropagation()}>{formatPhone(contact.phone)}</a>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile */}
      <div className="sm:hidden space-y-2">
        {COLUMNS.map((col) => {
          const cards = contacts.filter(s => s.status === col.key)
          return (
            <div key={col.key} className="bg-gray-100/80 rounded-xl">
              <div className={'px-3 py-2 border-t-2 rounded-t-xl flex items-center justify-between ' + col.color}><div className="flex items-center gap-2"><h3 className="text-xs font-semibold text-gray-800">{col.label}</h3><span className={'text-[10px] font-bold px-1.5 py-0.5 rounded-full ' + col.badge}>{cards.length}</span></div></div>
              {cards.length > 0 && <div className="p-2 space-y-2">{cards.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((contact) => {
                const dot = getUrgencyDot(contact)
                return (
                  <div key={contact.id} onClick={() => setMoveModal(contact)} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 active:bg-gray-50">
                    <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-1.5 min-w-0">{dot && <div className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + dot} />}<span className="font-semibold text-sm text-gray-900 truncate">{contact.name}</span></div><span className="text-[10px] text-gray-400">{timeAgo(contact.created_at)}</span></div>
                    <p className="text-xs text-gray-500">{contact.service_type || 'No details'}</p>
                  </div>
                )
              })}</div>}
            </div>
          )
        })}
      </div>

      {/* Move Modal */}
      {moveModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setMoveModal(null)}><div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}><div className="p-4 border-b border-gray-100"><div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" /><p className="font-semibold text-gray-900">{moveModal.name}</p><p className="text-xs text-gray-500">{moveModal.service_type}</p></div><div className="p-2">{COLUMNS.map((col) => <button key={col.key} onClick={() => handleMobileMove(col.key)} className={'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ' + (moveModal.status === col.key ? col.bg + ' ring-1 ring-inset ring-gray-200' : 'hover:bg-gray-50')}><div className={'w-2.5 h-2.5 rounded-full border-2 ' + col.color} /><span className={'text-sm font-medium ' + (moveModal.status === col.key ? 'text-gray-900' : 'text-gray-600')}>{col.label}</span>{moveModal.status === col.key && <svg className="w-4 h-4 text-[#1a2e44] ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}</button>)}</div><div className="p-4 border-t border-gray-100"><Link href={'/admin/contacts/' + moveModal.id} className="block w-full text-center py-2.5 text-sm font-medium text-[#1a2e44] bg-[#1a2e44]/10 rounded-lg" onClick={() => setMoveModal(null)}>Open Details</Link></div></div></div>}

      {/* Close Modal */}
      {showCloseModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCloseModal(null)}><div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-bold text-gray-900 mb-4">Why was this lead lost?</h3><div className="space-y-2 mb-6">{CLOSE_REASONS.map((r) => <button key={r} onClick={() => setCloseReason(r)} className={'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ' + (closeReason === r ? 'border-red-300 bg-red-50 text-red-700 font-medium' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>{r}</button>)}</div><div className="flex gap-3"><button onClick={() => setShowCloseModal(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button><button onClick={handleCloseLost} disabled={!closeReason} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg disabled:opacity-50">Mark as Lost</button></div></div></div>}

      {/* Transaction prompt when moving to under_contract */}
      {showTransactionPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransactionPrompt(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Under Contract!</h3>
            <p className="text-sm text-gray-500 text-center mb-6">{showTransactionPrompt.name} is now under contract. Create a transaction to track milestones and commission?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowTransactionPrompt(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Skip</button>
              <Link href={'/admin/transactions?new=' + showTransactionPrompt.id} onClick={() => setShowTransactionPrompt(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-lg text-center">Create Deal</Link>
            </div>
          </div>
        </div>
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Pipeline Help" sections={HELP_SECTIONS} />
    </div>
  )
}