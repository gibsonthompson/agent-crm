'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DEFAULT_USER = { id: 'owner', name: 'Agent', role: 'admin', permissions: {} }
const AuthContext = createContext({ isAuthenticated: true, user: DEFAULT_USER, hasPermission: () => true })
export const useAdminAuth = () => useContext(AuthContext)

const BRAND = { name: 'Agent CRM', primary: '#1a2e44', accent: '#e8963e' }

export default function AdminLayout({ children }) {
  const user = DEFAULT_USER
  const hasPermission = () => true
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { const meta = document.querySelector('meta[name="viewport"]'); if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'); else { const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'; document.head.appendChild(m) } }, [])
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const allNavItems = [
    { href: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/contacts', label: 'Contacts', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { href: '/admin/pipeline', label: 'Pipeline', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { href: '/admin/transactions', label: 'Transactions', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { href: '/admin/calendar', label: 'Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/admin/templates', label: 'Templates', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { href: '/admin/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ]

  const isActive = (href) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <AuthContext.Provider value={{ isAuthenticated: true, user, hasPermission }}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-40 hidden sm:block">
          <div className="max-w-[1600px] mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Link href="/admin" className="flex items-center gap-2 flex-shrink-0"><div className="w-8 h-8 bg-[#1a2e44] rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div><span className="font-bold text-[#1a2e44] text-sm">{BRAND.name}</span></Link>
                <nav className="flex items-center gap-1">{allNavItems.map((item) => <Link key={item.href} href={item.href} className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ' + (isActive(item.href) ? 'bg-[#1a2e44]/10 text-[#1a2e44]' : 'text-gray-600 hover:bg-gray-100')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>{item.label}</Link>)}</nav>
              </div>
            </div>
          </div>
        </header>

        <header className="bg-white shadow-sm sticky top-0 z-40 sm:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2"><div className="w-8 h-8 bg-[#1a2e44] rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div><span className="font-bold text-[#1a2e44] text-sm">{BRAND.name}</span></Link>
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 p-1 -mr-1"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          </div>
        </header>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50 sm:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-8 h-8 bg-[#1a2e44] rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-[#e8963e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div><span className="font-bold text-[#1a2e44]">{BRAND.name}</span></div>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <nav className="flex-1 overflow-y-auto py-2 px-3">{allNavItems.map((item) => <Link key={item.href} href={item.href} className={'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-0.5 ' + (isActive(item.href) ? 'bg-[#1a2e44]/10 text-[#1a2e44]' : 'text-gray-600 active:bg-gray-100')}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>{item.label}</Link>)}</nav>
            </div>
          </div>
        )}

        <main className="max-w-[1600px] mx-auto pb-6">{children}</main>
      </div>
    </AuthContext.Provider>
  )
}