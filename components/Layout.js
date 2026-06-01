import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, ROLE_LABEL, ROLE_COLOR } from '../lib/supabase'

function PasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleChange(e) {
    e.preventDefault()
    if (next !== confirm) { setMsg('New passwords do not match.'); return }
    if (next.length < 8) { setMsg('Password must be at least 8 characters.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg('Password changed successfully!'); setTimeout(onClose, 1500) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-base mb-4">Change password</h2>
        <form onSubmit={handleChange} className="space-y-3">
          <div>
            <label className="label">New password</label>
            <input className="input" type="password" placeholder="Min 8 characters"
              value={next} onChange={e => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input className="input" type="password" placeholder="Repeat password"
              value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          {msg && <p className={`text-xs px-3 py-2 rounded-lg ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center text-sm">
              {saving ? 'Saving…' : 'Update password'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost text-sm">Cancel</button>
          </div>
        </form>
        <p className="text-xs text-gray-400 mt-3 text-center">Need a reset? Contact your NDT Manager.</p>
      </div>
    </div>
  )
}

export default function Layout({ profile, nav = [], children }) {
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  async function logout() { await supabase.auth.signOut(); router.push('/') }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Logo in white container — no black background */}
          <img src="/cutech_logo.png" alt="Cutech" style={{height:'32px',width:'auto',display:'block'}} />

          <div className="ml-auto flex items-center gap-2">
            {profile && (
              <>
                <span className={`badge ${ROLE_COLOR[profile.role]} hidden sm:inline-flex`}>
                  {ROLE_LABEL[profile.role]}
                </span>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-50">
                    <span className="hidden sm:block">{profile.full_name}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 z-50" onClick={() => setShowMenu(false)}>
                      <button onClick={() => setShowPwd(true)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        🔑 Change password
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {nav.length > 0 && (
          <div className="flex border-t border-gray-100 px-2 overflow-x-auto">
            {nav.map(item => {
              const active = router.pathname === item.href
              return (
                <button key={item.href} onClick={() => router.push(item.href)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors
                    ${active ? 'border-blue-600 text-blue-700 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {item.icon} {item.label}
                  {item.badge > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{item.badge}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main className="flex-1 p-3 sm:p-4 max-w-7xl mx-auto w-full">{children}</main>

      <footer className="border-t border-gray-100 bg-white py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/cutech_logo.png" alt="Cutech" style={{height:'20px',width:'auto'}} />
          <span className="text-xs text-gray-400">NDT Portal · Singapore</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Powered by</span>
          <img src="/ticwerks_logo.svg" alt="TicWerks" style={{height:'26px',width:'auto'}} />
        </div>
      </footer>

      {showPwd && <PasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  )
}
