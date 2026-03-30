'use client'

import { useState, useEffect } from 'react'

const CATEGORY_ORDER = [
  { key: 'new_lead', label: 'New Lead', desc: 'First contact with a new lead' },
  { key: 'showing', label: 'Showing', desc: 'Before, during, and after showings' },
  { key: 'offer', label: 'Offer & Negotiation', desc: 'Offers, counters, and updates' },
  { key: 'under_contract', label: 'Under Contract', desc: 'Milestone updates and reminders' },
  { key: 'closing', label: 'Closing', desc: 'Pre-closing and day-of messages' },
  { key: 'post_close', label: 'Post-Close', desc: 'Thank you, reviews, and SOI nurture' },
  { key: 'listing', label: 'Listing', desc: 'Seller-focused templates' },
  { key: 'general', label: 'General', desc: 'Other templates' },
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [formData, setFormData] = useState({ name: '', subject: '', body: '', category: 'new_lead', is_default: false, type: 'sms' })

  useEffect(() => { fetchTemplates() }, [])
  const fetchTemplates = async () => {
    try { const r = await fetch('/api/admin/templates'); const d = await r.json(); if (d.templates) setTemplates(d.templates) }
    catch (e) {} finally { setLoading(false) }
  }

  const handleEdit = (t) => { setEditing(t.id); setFormData({ name: t.name, subject: t.subject || '', body: t.body, category: t.category || 'general', is_default: t.is_default || false, type: t.type || 'email' }) }
  const handleNew = () => { setEditing('new'); setFormData({ name: '', subject: '', body: '', category: 'new_lead', is_default: false, type: 'sms' }) }
  const handleCancel = () => setEditing(null)

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.body.trim()) return
    if (formData.type === 'email' && !formData.subject.trim()) return
    setSaving(true)
    try {
      const method = editing === 'new' ? 'POST' : 'PUT'
      const payload = editing === 'new' ? formData : { ...formData, id: editing }
      const r = await fetch('/api/admin/templates', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (r.ok) { setSuccessMsg(editing === 'new' ? 'Created' : 'Updated'); setEditing(null); fetchTemplates(); setTimeout(() => setSuccessMsg(''), 3000) }
    } catch (e) {} finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    try { await fetch('/api/admin/templates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchTemplates() } catch (e) {}
  }

  const filtered = typeFilter === 'all' ? templates : templates.filter(t => (t.type || 'email') === typeFilter)
  const grouped = CATEGORY_ORDER.map(cat => ({ ...cat, items: filtered.filter(t => (t.category || 'general') === cat.key).sort((a, b) => a.name.localeCompare(b.name)) })).filter(g => g.items.length > 0).filter(g => categoryFilter === 'all' || g.key === categoryFilter)

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Templates</h2><p className="text-gray-500 text-xs sm:text-sm">{templates.length} templates</p></div>
        {!editing && <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2e44] text-white text-sm font-medium rounded-xl hover:bg-[#0f1d2d]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>New</button>}
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      {!editing && <div className="flex gap-2 mb-3">{[{ v: 'all', l: 'All' }, { v: 'sms', l: 'SMS' }, { v: 'email', l: 'Email' }].map(f => <button key={f.v} onClick={() => setTypeFilter(f.v)} className={'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' + (typeFilter === f.v ? 'bg-[#1a2e44] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{f.l}<span className={'ml-1.5 ' + (typeFilter === f.v ? 'text-white/70' : 'text-gray-400')}>{f.v === 'all' ? templates.length : templates.filter(t => (t.type || 'email') === f.v).length}</span></button>)}</div>}

      {!editing && <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4"><button onClick={() => setCategoryFilter('all')} className={'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ' + (categoryFilter === 'all' ? 'bg-[#1a2e44] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>All Stages</button>{CATEGORY_ORDER.filter(c => templates.some(t => (t.category || 'general') === c.key)).map(c => <button key={c.key} onClick={() => setCategoryFilter(c.key)} className={'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ' + (categoryFilter === c.key ? 'bg-[#1a2e44] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{c.label}</button>)}</div>}

      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-4">{editing === 'new' ? 'Create Template' : 'Edit Template'}</h3>
          <div className="space-y-4">
            <div><label className="block text-xs text-gray-500 mb-1.5">Type</label><div className="flex bg-gray-100 rounded-lg p-0.5 w-fit"><button onClick={() => setFormData(p => ({ ...p, type: 'sms' }))} className={'px-4 py-2 text-sm font-medium rounded-md transition-colors ' + (formData.type === 'sms' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>SMS</button><button onClick={() => setFormData(p => ({ ...p, type: 'email' }))} className={'px-4 py-2 text-sm font-medium rounded-md transition-colors ' + (formData.type === 'email' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>Email</button></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1.5">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Template name" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1.5">Pipeline Stage</label><select value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none">{CATEGORY_ORDER.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            </div>
            {formData.type === 'email' && <div><label className="block text-xs text-gray-500 mb-1.5">Subject *</label><input type="text" value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Use {name}, {property_address} for personalization" style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>}
            <div>
              <div className="flex items-center justify-between mb-1.5"><label className="block text-xs text-gray-500">{formData.type === 'sms' ? 'Message *' : 'Body *'}</label><span className="text-[10px] text-gray-400">Variables: {'{name}'} {'{first_name}'} {'{property_address}'}</span></div>
              <textarea value={formData.body} onChange={(e) => setFormData(p => ({ ...p, body: e.target.value }))} rows={formData.type === 'sms' ? 4 : 10} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none resize-none" />
              {formData.type === 'sms' && <p className="text-xs text-gray-400 mt-1">{formData.body.length}/160</p>}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleCancel} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving || !formData.name.trim() || !formData.body.trim()} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center"><p className="text-gray-500">No templates found</p><button onClick={handleNew} className="mt-3 text-sm text-[#1a2e44] font-medium hover:underline">Create your first template</button></div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50"><h3 className="text-sm font-semibold text-[#1a2e44]">{group.label}</h3><p className="text-[11px] text-gray-400">{group.desc}</p></div>
              <div className="divide-y divide-gray-100">
                {group.items.map((t) => (
                  <div key={t.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={'inline-flex px-2 py-0.5 rounded text-[10px] font-medium ' + ((t.type || 'email') === 'sms' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>{(t.type || 'email').toUpperCase()}</span>
                          <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                        </div>
                        {t.subject && <p className="text-xs text-gray-500 truncate">{t.subject}</p>}
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.body?.substring(0, 120)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-[#1a2e44] rounded-lg hover:bg-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
