import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [msg, setMsg]           = useState('')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    if (password !== confirm) { setMsg('Passwords do not match.'); return }
    if (password.length < 8) { setMsg('Password must be at least 8 characters.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('success')
    await supabase.auth.signOut()
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #1a7ab8 100%)'}}>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white rounded-2xl shadow-lg mb-4 px-3 py-2">
              <img src="/cutech_logo.png" alt="Cutech" style={{height:'36px',width:'auto',display:'block'}} />
            </div>
            <h1 className="text-2xl font-bold text-white">NDT & Inspection Request Portal</h1>
            <p className="text-blue-200 text-sm mt-1">Complete Inspection Management System</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-base font-semibold mb-1 text-gray-800">Set new password</h2>

            {msg === 'success' ? (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
                ✅ Password updated successfully! Redirecting to sign in…
              </div>
            ) : !ready ? (
              <p className="text-sm text-gray-400 mt-3">Verifying your reset link…</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-4">Choose a new password for your account.</p>
                <form onSubmit={handleReset} className="space-y-3">
                  <div>
                    <label className="label">New password</label>
                    <input className="input" type="password" placeholder="Min 8 characters"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Confirm new password</label>
                    <input className="input" type="password" placeholder="Repeat password"
                      value={confirm} onChange={e => setConfirm(e.target.value)} required />
                  </div>
                  {msg && <p className="text-xs px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200">{msg}</p>}
                  <button type="submit" disabled={saving}
                    className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold"
                    style={{background:'#185FA5',borderColor:'#185FA5'}}>
                    {saving ? 'Saving…' : 'Update password'}
                  </button>
                </form>
              </>
            )}
          </div>

          <div className="text-center mt-6">
            <img src="/cutech_logo.png" alt="Cutech" style={{height:'20px',width:'auto',opacity:0.6}} />
            <p className="text-blue-300/60 text-xs mt-1">© {new Date().getFullYear()} Cutech · Complete Solution Provider</p>
          </div>
        </div>
      </div>
    </div>
  )
}
