'use client'

import { useState, useEffect, useRef } from 'react'

function replaceVariables(text, contact) {
  if (!text) return ''
  return text
    .replace(/\{name\}/g, contact.name || '')
    .replace(/\{first_name\}/g, (contact.name || '').split(' ')[0])
    .replace(/\{email\}/g, contact.email || '')
    .replace(/\{phone\}/g, contact.phone || '')
    .replace(/\{service_type\}/g, contact.service_type || '')
    .replace(/\{property_address\}/g, contact.address || '')
}

export default function EmailComposer({ isOpen, onClose, contact, onSent, isProspect = false }) {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logged, setLogged] = useState(false)

  useEffect(() => {
    if (isOpen) { setSubject(''); setBody(''); setSelectedTemplate(''); setCopied(false); setLogged(false); fetchTemplates() }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoading(true)
    try { const r = await fetch('/api/admin/templates'); const d = await r.json(); if (d.templates) { setTemplates(d.templates.filter(t => (t.type || 'email') === 'email')); const def = d.templates.find(t => t.is_default && (t.type || 'email') === 'email'); if (def) handleTemplateSelect(def) } } catch (e) {} finally { setLoading(false) }
  }

  const handleTemplateSelect = (template) => { setSelectedTemplate(template.id); setSubject(replaceVariables(template.subject, contact)); setBody(replaceVariables(template.body, contact)) }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); setCopied(true); setTimeout(() => setCopied(false), 3000) } catch (err) {}
  }

  const handleLogAndCopy = async () => {
    await handleCopy()
    try {
      await fetch('/api/admin/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(isProspect ? { prospect_id: contact.id } : { contact_id: contact.id }), type: 'email', subject, body, template_id: selectedTemplate || null }) })
      setLogged(true); if (onSent) onSent(); setTimeout(() => onClose(), 2000)
    } catch (e) {}
  }

  const handleOpenGmail = async () => {
    await handleCopy()
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(subject)}`
    window.open(gmailUrl, '_blank')
  }

  if (!isOpen || !contact) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl overflow-hidden">
        <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
            <div className="min-w-0"><h3 className="font-semibold text-[#1a2e44] text-sm sm:text-base truncate">Compose Email</h3><p className="text-xs text-gray-500 truncate">To: {contact.name} · {contact.email}</p></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div><label className="block text-xs text-gray-500 mb-1.5">Template</label><select value={selectedTemplate} onChange={(e) => { const t = templates.find(t => t.id === e.target.value); if (t) handleTemplateSelect(t) }} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none"><option value="">Select a template...</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><label className="block text-xs text-gray-500 mb-1.5">Subject</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
          <div>
            <div className="flex items-center justify-between mb-1.5"><label className="block text-xs text-gray-500">Message</label><span className="text-[10px] text-gray-400">Variables: {'{name}'} {'{first_name}'} {'{property_address}'}</span></div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email..." rows={10} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none resize-none" style={{ lineHeight: '1.7', minHeight: '200px' }} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl text-center">Cancel</button>
            <button onClick={handleCopy} disabled={!body} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-sm font-medium bg-gray-100 rounded-xl disabled:opacity-40">
              {copied ? <><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="text-green-600">Copied!</span></> : <span>Copy</span>}
            </button>
            <button onClick={handleLogAndCopy} disabled={!body || logged} className="flex-[1.3] sm:flex-none flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-xl disabled:opacity-50 active:scale-[0.98]">
              {logged ? <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>Logged!</span></> : <span>Copy & Log</span>}
            </button>
            <button onClick={handleOpenGmail} disabled={!contact.email} className="hidden sm:flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40">Gmail</button>
          </div>
        </div>
      </div>
    </div>
  )
}
