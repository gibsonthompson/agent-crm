'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '../layout'
import HelpModal, { HelpButton } from '../components/HelpModal'

const PERMISSION_LABELS = [
  { key: 'dashboard', label: 'Dashboard', desc: 'View the main dashboard' },
  { key: 'contacts', label: 'Contacts', desc: 'View and manage contacts' },
  { key: 'pipeline', label: 'Pipeline', desc: 'View and move pipeline cards' },
  { key: 'calendar', label: 'Calendar', desc: 'View calendar and events' },
  { key: 'templates', label: 'Templates', desc: 'View and manage templates' },
  { key: 'sms', label: 'Send SMS', desc: 'Send text messages' },
  { key: 'email', label: 'Send Email', desc: 'Compose and send emails' },
  { key: 'delete_contacts', label: 'Delete Contacts', desc: 'Permanently delete contacts' },
]


const HELP_SECTIONS = [{"title": "Admins vs Agents", "body": "Admins have full access to everything including this page. Agents only see contacts assigned to them and enabled pages."}, {"title": "Permissions", "body": "Toggle switches control what each agent can access \u2014 Contacts, Pipeline, Calendar, Templates, SMS, Email, etc."}, {"title": "Data scoping", "body": "Agents only see contacts assigned to them. Use the Assigned To dropdown on a contact detail page. Admins see everything."}, {"title": "Passwords", "body": "You set the password when creating a user. To reset it, edit their profile and type a new one."}, {"title": "Deactivating vs Deleting", "body": "Deactivate to temporarily remove access (history preserved). Delete is permanent."}]

export default function UsersPage() {
  const { hasPermission, user: currentUser } = useAdminAuth()
  const [showHelp, setShowHelp] = useState(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ username: '', name: '', phone: '', password: '', role: 'member', permissions: { dashboard: false, contacts: false, pipeline: false, calendar: true, templates: false, sms: false, email: false, delete_contacts: false } })

  useEffect(() => { fetchUsers() }, [])
  const fetchUsers = async () => { try { const r = await fetch('/api/admin/users'); const d = await r.json(); if (d.users) setUsers(d.users) } catch (e) {} finally { setLoading(false) } }

  const handleNew = () => { setEditing('new'); setError(''); setFormData({ username: '', name: '', phone: '', password: '', role: 'member', permissions: { dashboard: false, contacts: false, pipeline: false, calendar: true, templates: false, sms: false, email: false, delete_contacts: false } }) }
  const handleEdit = (u) => { setEditing(u.id); setError(''); setFormData({ username: u.username, name: u.name, phone: u.phone || '', password: '', role: u.role, permissions: u.permissions || {} }) }
  const handleCancel = () => { setEditing(null); setError('') }

  const handleSave = async () => {
    if (!formData.name.trim()) { setError('Name is required'); return }
    if (editing === 'new' && !formData.username.trim()) { setError('Username is required'); return }
    if (editing === 'new' && (!formData.password || formData.password.length < 4)) { setError('Password required (min 4 characters)'); return }
    setSaving(true); setError('')
    try {
      const isNew = editing === 'new'
      const payload = isNew ? { username: formData.username, name: formData.name, phone: formData.phone, password: formData.password, role: formData.role, permissions: formData.permissions } : { id: editing, name: formData.name, phone: formData.phone, role: formData.role, permissions: formData.permissions, ...(formData.password ? { password: formData.password } : {}) }
      const r = await fetch('/api/admin/users', { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await r.json()
      if (!r.ok) { setError(data.error || 'Failed'); return }
      setSuccessMsg(isNew ? 'User created' : 'Updated'); setEditing(null); fetchUsers(); setTimeout(() => setSuccessMsg(''), 3000)
    } catch (e) { setError('Failed to save') } finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => { try { await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id, is_active: !u.is_active }) }); fetchUsers(); setSuccessMsg(u.is_active ? 'Deactivated' : 'Activated'); setTimeout(() => setSuccessMsg(''), 2000) } catch (e) {} }
  const handleDelete = async (u) => { if (u.id === currentUser?.id) return; if (!confirm('Delete ' + u.name + '?')) return; try { await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: u.id }) }); fetchUsers() } catch (e) {} }
  const togglePerm = (key) => setFormData(p => ({ ...p, permissions: { ...p.permissions, [key]: !p.permissions[key] } }))

  if (!hasPermission('users')) return <div className="px-4 py-16 text-center"><p className="text-gray-500 font-medium">No permission to manage users</p></div>
  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-[#1a2e44] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-lg sm:text-2xl font-bold text-[#1a2e44]">Users</h2><p className="text-gray-500 text-xs sm:text-sm">{users.filter(u=>u.is_active).length} active</p></div>
        {!editing && <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2e44] text-white text-sm font-medium rounded-xl hover:bg-[#0f1d2d]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add</button>}
      </div>

      {successMsg && <div className="mb-4 rounded-xl p-3 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
          <HelpButton onClick={() => setShowHelp(true)} /><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{successMsg}</div>}

      {editing && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 border-2 border-[#1a2e44]/20">
          <h3 className="font-semibold text-[#1a2e44] mb-4">{editing === 'new' ? 'Add User' : 'Edit User'}</h3>
          {error && <div className="mb-4 rounded-lg p-3 text-sm bg-red-50 border border-red-200 text-red-700">{error}</div>}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1.5">Username *</label><input type="text" value={formData.username} onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))} disabled={editing !== 'new'} autoCapitalize="none" style={{ fontSize: '16px' }} className={'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none ' + (editing !== 'new' ? 'bg-gray-50 text-gray-500' : '')} /></div>
              <div><label className="block text-xs text-gray-500 mb-1.5">Full Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-500 mb-1.5">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
              <div><label className="block text-xs text-gray-500 mb-1.5">{editing === 'new' ? 'Password *' : 'Reset Password'}</label><input type="text" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder={editing === 'new' ? 'Min 4 characters' : 'Leave blank to keep'} style={{ fontSize: '16px' }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#1a2e44] outline-none" /></div>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1.5">Role</label><div className="flex bg-gray-100 rounded-lg p-0.5 w-fit"><button onClick={() => setFormData(p => ({ ...p, role: 'admin' }))} className={'px-4 py-2.5 text-sm font-medium rounded-md transition-colors ' + (formData.role === 'admin' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>Admin</button><button onClick={() => setFormData(p => ({ ...p, role: 'member' }))} className={'px-4 py-2.5 text-sm font-medium rounded-md transition-colors ' + (formData.role === 'member' ? 'bg-white text-[#1a2e44] shadow-sm' : 'text-gray-500')}>Agent</button></div></div>
            {formData.role === 'member' && (
              <div><label className="block text-xs text-gray-500 mb-3">Permissions</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{PERMISSION_LABELS.map((p) => <button key={p.key} onClick={() => togglePerm(p.key)} className={'flex items-center justify-between px-3 py-3 rounded-lg border text-sm transition-all ' + (formData.permissions[p.key] ? 'border-[#1a2e44]/30 bg-[#1a2e44]/5' : 'border-gray-200 bg-white')}><div className="text-left"><p className={'font-medium ' + (formData.permissions[p.key] ? 'text-[#1a2e44]' : 'text-gray-700')}>{p.label}</p><p className="text-[11px] text-gray-400 mt-0.5">{p.desc}</p></div><div className={'w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ' + (formData.permissions[p.key] ? 'bg-[#1a2e44]' : 'bg-gray-300')}><div className={'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ' + (formData.permissions[p.key] ? 'translate-x-4' : 'translate-x-0.5')} /></div></button>)}</div></div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <button onClick={handleCancel} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white bg-[#1a2e44] rounded-lg disabled:opacity-50">{saving ? 'Saving...' : editing === 'new' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {users.length === 0 ? <div className="p-8 text-center"><p className="text-gray-500">No users yet</p></div> : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className={'p-4 sm:px-6 transition-colors ' + (u.is_active ? 'hover:bg-gray-50' : 'bg-gray-50/50')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + (u.is_active ? 'bg-[#1a2e44]' : 'bg-gray-300')}><span className="text-white font-bold text-sm">{u.name?.charAt(0)?.toUpperCase()}</span></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={'font-semibold text-sm ' + (u.is_active ? 'text-gray-900' : 'text-gray-400')}>{u.name}</p>
                        <span className="text-xs text-gray-400">@{u.username}</span>
                        <span className={'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ' + (u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>{u.role === 'admin' ? 'Admin' : 'Agent'}</span>
                        {!u.is_active && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">Disabled</span>}
                        {u.id === currentUser?.id && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600">You</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(u)} className="p-2 text-gray-400 hover:text-[#1a2e44] rounded-lg hover:bg-gray-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    {u.id !== currentUser?.id && <>
                      <button onClick={() => handleToggleActive(u)} className={'p-2 rounded-lg ' + (u.is_active ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50')}>{u.is_active ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}</button>
                      <button onClick={() => handleDelete(u)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Users Help" sections={HELP_SECTIONS} />
    </div>
  )
}