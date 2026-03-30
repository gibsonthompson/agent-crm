'use client'

import { useState, useEffect } from 'react'
import HelpModal, { HelpButton } from '../components/HelpModal'

const HELP_SECTIONS = [
  { title: 'What is this page?', body: 'Configure all the thresholds and timing that drive your CRM. Changes take effect immediately across the whole app.' },
  { title: 'Alert Thresholds', body: 'Control when leads show up in "Needs Attention" on the Dashboard. For example, set new lead alert to 2 hours instead of 1 to give yourself more time before the flag appears.' },
  { title: 'SOI Settings', body: 'Control how many days before a contact is flagged as overdue for a touch, and how far ahead to look for birthdays and homeiversaries.' },
  { title: 'Milestone Defaults', body: 'These are the day offsets used when you create a new transaction. For example, if Inspection is set to 10, it means 10 days after contract date. Changing these only affects NEW transactions — existing ones keep their dates.' },
]

const SECTIONS = [
  {
    title: 'Alert Thresholds',
    description: 'When leads appear in Needs Attention on the Dashboard',
    keys: [
      { key: 'new_lead_alert_hours', suffix: 'hours' },
      { key: 'offer_followup_days', suffix: 'days' },
    ]
  },
  {
    title: 'SOI Settings',
    description: 'Sphere of Influence timing',
    keys: [
      { key: 'soi_overdue_days', suffix: 'days' },
      { key: 'soi_birthday_lookahead', suffix: 'days' },
      { key: 'soi_anniversary_lookahead', suffix: 'days' },
    ]
  },
  {
    title: 'Transaction Milestone Defaults',
    description: 'Days after contract date for auto-generated milestones. Only affects new transactions.',
    keys: [
      { key: 'milestone_earnest_money', suffix: 'days' },
      { key: 'milestone_appraisal_ordered', suffix: 'days' },
      { key: 'milestone_inspection', suffix: 'days' },
      { key: 'milestone_inspection_objection', suffix: 'days' },
      { key: 'milestone_inspection_resolution', suffix: 'days' },
      { key: 'milestone_hoa_docs', suffix: 'days' },
      { key: 'milestone_title_commitment', suffix: 'days' },
      { key: 'milestone_appraisal_deadline', suffix: 'days' },
      { key: 'milestone_loan_approval', suffix: 'days' },
      { key: 'milestone_closing', suffix: 'days' },
    ]
  },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [edited, setEdited] = useState({})

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const r = await fetch('/api/admin/settings')
      const d = await r.json()
      if (d.settings) setSettings(d.settings)
      if (d.rows) setRows(d.rows)
    } catch (e) {} finally { setLoading(false) }
  }

  const handleChange = (key, value) => {
    setEdited(prev => ({ ...prev, [key]: value }))
  }

  const getValue = (key) => {
    if (edited[key] !== undefined) return edited[key]
    return settings[key]?.value || ''
  }

  const getLabel = (key) => settings[key]?.label || key.replace(/_/g, ' ')
  const getDesc = (key) => settings[key]?.description || ''

  const handleSave = async () => {
    const updates = Object.entries(edited).map(([key, value]) => ({ key, value }))
    if (updates.length === 0) return
    setSaving(true)
    try {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })
      if (r.ok) {
        setSuccessMsg('Settings saved')
        setEdited({})
        fetchSettings()
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    } catch (e) {} finally { setSaving(false) }
  }

  const hasChanges = Object.keys(edited).length > 0

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Settings</h2>
          <p className="text-gray-500 text-xs sm:text-sm">Configure thresholds and defaults</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} />
          {hasChanges && (
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1a2e44] text-white text-sm font-medium rounded-xl hover:bg-[#0f1d2d] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-[#1a2e44]">{section.title}</h3>
              <p className="text-[11px] text-gray-400">{section.description}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {section.keys.map(({ key, suffix }) => {
                const isEdited = edited[key] !== undefined && edited[key] !== (settings[key]?.value || '')
                return (
                  <div key={key} className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-gray-800">{getLabel(key)}</p>
                      <p className="text-[11px] text-gray-400">{getDesc(key)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        value={getValue(key)}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className={'w-20 px-3 py-2 border rounded-lg text-sm text-right focus:ring-2 focus:ring-[#1a2e44] outline-none ' + (isEdited ? 'border-[#e8963e] bg-amber-50' : 'border-gray-200')}
                      />
                      <span className="text-xs text-gray-400 w-10">{suffix}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Settings Help" sections={HELP_SECTIONS} />
    </div>
  )
}