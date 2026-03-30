'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const TRANSACTION_SIDES = ['Buyer', 'Seller', 'Dual']
const TRANSACTION_STATUSES = ['pending', 'closed', 'fell_through']
const HELP_SECTIONS = [
  { title: 'What is this page?', body: 'Your deal tracker. Every active and closed transaction with commission calculations and milestone checklists.' },
  { title: 'Adding a deal', body: 'Tap New Deal, enter property, client, sale price, and commission details. Set contract and closing dates to auto-generate milestones.' },
  { title: 'Milestones', body: 'Setting a contract date auto-generates deadlines based on your Settings. Checking a box saves immediately. You can edit milestone dates individually.' },
  { title: 'Commission calculator', body: 'Sale Price × Commission% − Broker Split% − Referral Fee = Net GCI. Calculated automatically.' },
  { title: 'Linking contacts', body: 'Use the Contact dropdown to link a transaction to an existing contact. This shows the transaction on the contact detail page.' },
  { title: 'Configurable defaults', body: 'Milestone day offsets come from Settings. Change them there to affect all future transactions.' },
]

// Default milestone template — overridden by settings
const DEFAULT_MILESTONES = [
  { key: 'milestone_earnest_money', label: 'Earnest Money Due', defaultOffset: 3, critical: true },
  { key: 'milestone_appraisal_ordered', label: 'Appraisal Ordered', defaultOffset: 7, critical: false },
  { key: 'milestone_inspection', label: 'Home Inspection', defaultOffset: 10, critical: true },
  { key: 'milestone_inspection_objection', label: 'Inspection Objection Deadline', defaultOffset: 12, critical: true },
  { key: 'milestone_inspection_resolution', label: 'Inspection Resolution', defaultOffset: 15, critical: false },
  { key: 'milestone_hoa_docs', label: 'HOA Docs Review', defaultOffset: 14, critical: false },
  { key: 'milestone_title_commitment', label: 'Title Commitment Due', defaultOffset: 20, critical: false },
  { key: 'milestone_appraisal_deadline', label: 'Appraisal Deadline', defaultOffset: 21, critical: true },
  { key: 'milestone_loan_approval', label: 'Loan Approval Deadline', defaultOffset: 25, critical: true },
  { key: null, label: 'Final Walkthrough', defaultOffset: -1, critical: true },
  { key: 'milestone_closing', label: 'Closing Day', defaultOffset: 30, critical: true },
]

export default function TransactionsPage() {
  const { user } = useAdminAuth()
  const isAdmin = user?.role === 'admin'
  const [transactions, setTransactions] = useState([])
  const [contacts, setContacts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [formData, setFormData] = useState({
    property_address: '', client_name: '', client_phone: '', side: 'Buyer',
    contract_date: '', closing_date: '', sale_price: '', commission_pct: '3',
    broker_split_pct: '30', referral_fee: '0', status: 'pending', notes: '',
    milestones: [], contact_id: ''
  })

  useEffect(() => {
    fetchAll().then(() => {
      // Auto-open new transaction if linked from pipeline
      const params = new URLSearchParams(window.location.search)
      const newContactId = params.get('new')
      if (newContactId) { handleNew(newContactId); window.history.replaceState({}, '', '/admin/transactions') }
    })
  }, [])

  const fetchAll = async () => {
    try {
      const [tRes, cRes, sRes] = await Promise.all([
        fetch('/api/admin/transactions').then(r => r.json()),
        fetch('/api/contact').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()).catch(() => ({ settings: {} })),
      ])
      if (tRes.transactions) setTransactions(tRes.transactions)
      if (cRes.data) setContacts(cRes.data)
      if (sRes.settings) setSettings(sRes.settings)
    } catch (e) {} finally { setLoading(false) }
  }

  const getSetting = (key, fallback) => parseInt(settings[key]?.value) || fallback

  const generateMilestones = (contractDate, closingDate) => {
    if (!contractDate) return []
    const cd = new Date(contractDate + 'T00:00:00')
    const closeDate = closingDate ? new Date(closingDate + 'T00:00:00') : null
    return DEFAULT_MILESTONES.map(t => {
      const offset = t.key ? getSetting(t.key, t.defaultOffset) : t.defaultOffset
      let due
      if (t.label === 'Closing Day' && closeDate) { due = closeDate }
      else if (t.label === 'Final Walkthrough' && closeDate) { due = new Date(closeDate); due.setDate(due.getDate() - 1) }
      else if (t.label === 'Final Walkthrough') { due = new Date(cd); due.setDate(due.getDate() + getSetting('milestone_closing', 30) - 1) }
      else { due = new Date(cd); due.setDate(due.getDate() + offset) }
      return { label: t.label, due_date: due.toISOString().split('T')[0], critical: t.critical, completed: false }
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  }

  const handleNew = (contactId) => {
    const linkedContact = contactId ? contacts.find(c => c.id === contactId) : null
    setEditing('new')
    setFormData({
      property_address: linkedContact?.address || '', client_name: linkedContact?.name || '',
      client_phone: linkedContact?.phone || '', side: 'Buyer',
      contract_date: '', closing_date: '', sale_price: '', commission_pct: '3',
      broker_split_pct: '30', referral_fee: '0', status: 'pending', notes: '',
      milestones: [], contact_id: contactId || ''
    })
  }

  const handleEdit = (t) => {
    setEditing(t.id)
    const milestones = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : (t.milestones || [])
    setFormData({ property_address: t.property_address||'', client_name: t.client_name||'', client_phone: t.client_phone||'', side: t.side||'Buyer', contract_date: t.contract_date||'', closing_date: t.closing_date||'', sale_price: t.sale_price||'', commission_pct: t.commission_pct||'3', broker_split_pct: t.broker_split_pct||'30', referral_fee: t.referral_fee||'0', status: t.status||'pending', notes: t.notes||'', milestones, contact_id: t.contact_id||'' })
  }

  const handleContractDateChange = (date) => {
    const milestones = generateMilestones(date, formData.closing_date)
    setFormData(p => ({ ...p, contract_date: date, milestones }))
  }

  const handleClosingDateChange = (date) => {
    const milestones = generateMilestones(formData.contract_date, date)
    setFormData(p => ({ ...p, closing_date: date, milestones }))
  }

  const handleContactSelect = (contactId) => {
    const c = contacts.find(x => x.id === contactId)
    setFormData(p => ({
      ...p, contact_id: contactId,
      client_name: c?.name || p.client_name,
      client_phone: c?.phone || p.client_phone,
      property_address: c?.address || p.property_address,
    }))
  }

  const toggleFormMilestone = (idx) => {
    setFormData(p => {
      const m = [...p.milestones]; m[idx] = { ...m[idx], completed: !m[idx].completed }; return { ...p, milestones: m }
    })
  }

  const updateFormMilestoneDate = (idx, newDate) => {
    setFormData(p => {
      const m = [...p.milestones]; m[idx] = { ...m[idx], due_date: newDate }; return { ...p, milestones: m }
    })
  }

  // Auto-save milestone toggle on EXISTING transactions (not in edit mode)
  const toggleLiveMilestone = async (transactionId, milestoneIdx) => {
    const t = transactions.find(x => x.id === transactionId)
    if (!t) return
    const ms = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : [...(t.milestones || [])]
    ms[milestoneIdx] = { ...ms[milestoneIdx], completed: !ms[milestoneIdx].completed }
    // Optimistic update
    setTransactions(prev => prev.map(x => x.id === transactionId ? { ...x, milestones: ms } : x))
    // Save to DB
    try {
      await fetch('/api/admin/transactions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: transactionId, milestones: JSON.stringify(ms) }) })
    } catch (e) { fetchAll() } // revert on error
  }

  const handleSave = async () => {
    if (!formData.property_address.trim()) return
    setSaving(true)
    try {
      const n = (v) => parseFloat(v) || 0
      const grossComm = n(formData.sale_price) * (n(formData.commission_pct) / 100)
      const brokerCut = grossComm * (n(formData.broker_split_pct) / 100)
      const payload = {
        ...formData, sale_price: n(formData.sale_price), commission_pct: n(formData.commission_pct),
        broker_split_pct: n(formData.broker_split_pct), referral_fee: n(formData.referral_fee),
        gross_commission: grossComm, net_commission: grossComm - brokerCut - n(formData.referral_fee),
        milestones: JSON.stringify(formData.milestones), contact_id: formData.contact_id || null,
      }
      if (editing !== 'new') payload.id = editing
      const r = await fetch('/api/admin/transactions', { method: editing === 'new' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) { setEditing(null); fetchAll(); setSuccessMsg(editing === 'new' ? 'Deal added' : 'Updated'); setTimeout(() => setSuccessMsg(''), 2000) }
    } catch (e) {} finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return
    try { await fetch('/api/admin/transactions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchAll() } catch (e) {}
  }

  const n = (v) => parseFloat(v) || 0
  const calcGross = () => n(formData.sale_price) * (n(formData.commission_pct) / 100)
  const calcBrokerCut = () => calcGross() * (n(formData.broker_split_pct) / 100)
  const calcNet = () => calcGross() - calcBrokerCut() - n(formData.referral_fee)
  const fmtMoney = (v) => '$' + Math.abs(parseFloat(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtDate = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter)
  const totals = {
    pending: transactions.filter(t => t.status === 'pending').reduce((s, t) => s + n(t.net_commission), 0),
    closed: transactions.filter(t => t.status === 'closed').reduce((s, t) => s + n(t.net_commission), 0),
    volume: transactions.filter(t => t.status !== 'fell_through').reduce((s, t) => s + n(t.sale_price), 0),
    deals: transactions.filter(t => t.status === 'closed').length,
  }

  // Contacts eligible for linking (under_contract or closed, not already linked)
  const linkedContactIds = new Set(transactions.map(t => t.contact_id).filter(Boolean))
  const linkableContacts = contacts.filter(c => ['under_contract', 'closed', 'offer_submitted'].includes(c.status))

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Transactions</h2><p className="text-gray-500 text-xs sm:text-sm">{transactions.length} deals</p></div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          {isAdmin && !editing && <button onClick={() => handleNew()} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2e44] text-white text-sm font-medium rounded-xl hover:bg-[#0f1d2d]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New Deal</button>}
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Closed GCI</p><p className="text-lg font-bold text-green-600">{fmtMoney(totals.closed)}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Pending GCI</p><p className="text-lg font-bold text-[#e8963e]">{fmtMoney(totals.pending)}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Volume</p><p className="text-lg font-bold text-[#1a2e44]">{fmtMoney(totals.volume)}</p></div>
        <div className="bg-white rounded-xl p-3 shadow-sm"><p className="text-[10px] text-gray-500 uppercase tracking-wide">Closed Deals</p><p className="text-lg font-bold text-gray-800">{totals.deals}</p></div>
      </div>

      <div className="flex gap-2 mb-4">{[{ v: 'all', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'closed', l: 'Closed' }, { v: 'fell_through', l: 'Fell Through' }].map(f => <button key={f.v} onClick={() => setFilter(f.v)} className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' + (filter === f.v ? 'bg-[#1a2e44] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{f.l}</button>)}</div>

      {/* Add/Edit Form */}
      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-4">{editing === 'new' ? 'New Transaction' : 'Edit Transaction'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Property Address *</label><input type="text" value={formData.property_address} onChange={(e) => setFormData(p => ({ ...p, property_address: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Link to Contact</label>
                <select value={formData.contact_id} onChange={(e) => handleContactSelect(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none bg-white">
                  <option value="">None — standalone deal</option>
                  {linkableContacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.service_type || c.status}</option>)}
                </select>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Side</label><select value={formData.side} onChange={(e) => setFormData(p => ({ ...p, side: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none">{TRANSACTION_SIDES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Client Name</label><input type="text" value={formData.client_name} onChange={(e) => setFormData(p => ({ ...p, client_name: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Status</label><select value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none">{TRANSACTION_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Contract Date</label><input type="date" value={formData.contract_date} onChange={(e) => handleContractDateChange(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Closing Date</label><input type="date" value={formData.closing_date} onChange={(e) => handleClosingDateChange(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Sale Price $</label><input type="number" value={formData.sale_price} onChange={(e) => setFormData(p => ({ ...p, sale_price: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Commission %</label><input type="number" step="0.1" value={formData.commission_pct} onChange={(e) => setFormData(p => ({ ...p, commission_pct: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Broker Split %</label><input type="number" step="1" value={formData.broker_split_pct} onChange={(e) => setFormData(p => ({ ...p, broker_split_pct: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Referral Fee $</label><input type="number" value={formData.referral_fee} onChange={(e) => setFormData(p => ({ ...p, referral_fee: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              <span>Gross: <span className="font-semibold text-gray-800">{fmtMoney(calcGross())}</span></span>
              <span>Broker: <span className="font-semibold text-red-500">-{fmtMoney(calcBrokerCut())}</span></span>
              {n(formData.referral_fee) > 0 && <span>Referral: <span className="font-semibold text-red-500">-{fmtMoney(formData.referral_fee)}</span></span>}
              <span>Net GCI: <span className="font-semibold text-green-600">{fmtMoney(calcNet())}</span></span>
            </div>
            {/* Editable milestones in form */}
            {formData.milestones.length > 0 && (
              <div><p className="text-xs text-gray-500 mb-2">Milestones <span className="text-gray-400">(dates are editable)</span></p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">{formData.milestones.map((m, i) => {
                  const isPast = new Date(m.due_date) < new Date() && !m.completed
                  return (
                    <div key={i} className={'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ' + (m.completed ? 'bg-green-50 border-green-200' : isPast ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200')}>
                      <button onClick={() => toggleFormMilestone(i)} className={'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ' + (m.completed ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                        {m.completed && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                      <span className={'flex-1 text-sm ' + (m.completed ? 'text-gray-400 line-through' : 'text-gray-700')}>{m.label}</span>
                      <input type="date" value={m.due_date} onChange={(e) => updateFormMilestoneDate(i, e.target.value)} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-[#1a2e44] outline-none" />
                    </div>
                  )
                })}</div>
              </div>
            )}
            <div><label className="block text-xs text-gray-500 mb-1">Notes</label><textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none resize-none" /></div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formData.property_address.trim()} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Saving...' : editing === 'new' ? 'Add Deal' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center"><p className="text-gray-500">No transactions yet</p>{isAdmin && <button onClick={() => handleNew()} className="mt-3 text-sm text-[#1a2e44] font-medium hover:underline">Add your first deal</button>}</div>
        ) : filtered.map((t) => {
          const milestones = typeof t.milestones === 'string' ? JSON.parse(t.milestones) : (t.milestones || [])
          const completedCount = milestones.filter(m => m.completed).length
          const nextMilestone = milestones.find(m => !m.completed)
          const isExpanded = expandedId === t.id
          const linkedContact = t.contact_id ? contacts.find(c => c.id === t.contact_id) : null

          return (
            <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 sm:px-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{t.property_address}</p>
                      <span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (t.status === 'closed' ? 'bg-green-100 text-green-700' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>{t.status === 'fell_through' ? 'Fell Through' : t.status}</span>
                      <span className={'inline-flex px-2 py-0.5 rounded text-[10px] font-medium ' + (t.side === 'Buyer' ? 'bg-sky-100 text-sky-700' : t.side === 'Seller' ? 'bg-orange-100 text-orange-700' : 'bg-violet-100 text-violet-700')}>{t.side}</span>
                      {linkedContact && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">Linked: {linkedContact.name}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {t.client_name && <span>{t.client_name}</span>}
                      <span>Sale: {fmtMoney(t.sale_price)}</span>
                      <span className="font-medium text-green-600">Net: {fmtMoney(t.net_commission)}</span>
                      {t.closing_date && <span>Close: {fmtDate(t.closing_date)}</span>}
                    </div>
                    {nextMilestone && t.status === 'pending' && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5"><div className="bg-[#1a2e44] rounded-full h-1.5 transition-all" style={{ width: milestones.length > 0 ? (completedCount / milestones.length * 100) + '%' : '0%' }} /></div>
                        <span className="text-[10px] text-gray-400">{completedCount}/{milestones.length}</span>
                        <span className="text-[10px] text-[#e8963e] font-medium">Next: {nextMilestone.label}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && <>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(t) }} className="p-1.5 text-gray-400 hover:text-[#1a2e44] rounded hover:bg-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </>}
                    <svg className={'w-4 h-4 text-gray-400 transition-transform ' + (isExpanded ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
              {/* Expanded — live-save milestone checkboxes */}
              {isExpanded && milestones.length > 0 && (
                <div className="border-t border-gray-100 px-4 sm:px-6 py-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Milestones <span className="text-gray-400">· click to toggle (auto-saves)</span></p>
                  <div className="space-y-1">{milestones.map((m, i) => {
                    const isPast = new Date(m.due_date) < new Date() && !m.completed
                    return (
                      <button key={i} onClick={() => toggleLiveMilestone(t.id, i)} className="w-full flex items-center gap-3 py-1.5 text-left">
                        <div className={'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ' + (m.completed ? 'bg-green-500 border-green-500' : 'border-gray-300')}>
                          {m.completed && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={'flex-1 text-xs ' + (m.completed ? 'text-gray-400 line-through' : isPast ? 'text-red-600 font-medium' : 'text-gray-700')}>{m.label}</span>
                        <span className={'text-[10px] ' + (isPast && !m.completed ? 'text-red-500' : 'text-gray-400')}>{fmtDate(m.due_date)}</span>
                      </button>
                    )
                  })}</div>
                  {t.notes && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">{t.notes}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Transactions Help" sections={HELP_SECTIONS} />
    </div>
  )
}