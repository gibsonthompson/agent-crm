'use client'

export default function HelpModal({ isOpen, onClose, title, sections }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#1a2e44]">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="p-5 space-y-5">
          {sections.map((s, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold text-gray-800 mb-1">{s.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100">
          <button onClick={onClose} className="w-full py-3 bg-[#1a2e44] text-white rounded-xl font-semibold hover:bg-[#0f1d2d] transition-colors">Got it</button>
        </div>
      </div>
    </div>
  )
}

export function HelpButton({ onClick }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.065 2.05-1.37 2.772-1.153.508.153.942.535 1.025 1.059.108.685-.378 1.232-.816 1.627-.39.354-.816.659-.816 1.267V13m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      Help
    </button>
  )
}