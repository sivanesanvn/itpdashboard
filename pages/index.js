import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

const ROLE_ROUTES = {
  manager:    '/manager/dashboard',
  coordinator: '/coordinator/dashboard',
  client:     '/client/requests',
  tech:       '/tech/jobs',
  scaffold:   '/contractor/jobs',
  insulation: '/contractor/jobs',
  painting:   '/contractor/jobs',
}

export default function LoginPage() {
  const router = useRouter()
  const [view, setView]         = useState('login') // 'login' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') router.push('/auth/reset-password')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile) { setError('Profile not found. Contact your manager.'); setLoading(false); return }
    router.push(ROLE_ROUTES[profile.role] || '/')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const redirectTo = window.location.origin + '/auth/reset-password'
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (err) { setError(err.message); return }
    setResetSent(true)
  }

  function switchView(v) { setView(v); setError(''); setResetSent(false) }

  return (
    <div className="min-h-screen flex flex-col" style={{background: 'linear-gradient(135deg, #0C447C 0%, #185FA5 50%, #1a7ab8 100%)'}}>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white rounded-2xl shadow-lg mb-4 px-3 py-2">
              <img src="/cutech_logo.png" alt="Cutech" style={{height:'36px',width:'auto',display:'block'}} />
            </div>
            <h1 className="text-3xl font-bold text-white">NDT & Inspection Request Portal</h1>
            <p className="text-blue-200 text-sm mt-1">Complete Inspection Management System</p>
          </div>

          {/* Login card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            {view === 'login' ? (
              <>
                <h2 className="text-base font-semibold mb-4 text-gray-800">Sign in to your account</h2>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="label">Email address</label>
                    <input className="input" type="email" placeholder="you@company.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input" type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                    <div className="text-right mt-1">
                      <button type="button" onClick={() => switchView('forgot')}
                        className="text-xs text-blue-600 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
                  <button type="submit" disabled={loading}
                    className="btn btn-primary w-full justify-center py-2.5 mt-1 text-sm font-semibold"
                    style={{background:'#185FA5',borderColor:'#185FA5'}}>
                    {loading ? 'Signing in…' : 'Sign in →'}
                  </button>
                </form>
                <p className="text-xs text-gray-400 text-center mt-4">
                  Access is by invitation. Contact Cutech NDT to get your credentials.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold mb-1 text-gray-800">Reset your password</h2>
                <p className="text-xs text-gray-400 mb-4">Enter your account email and we'll send you a reset link.</p>
                {resetSent ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
                    ✅ Reset link sent! Check your email and click the link to set a new password.
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-3">
                    <div>
                      <label className="label">Email address</label>
                      <input className="input" type="email" placeholder="you@company.com"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
                    <button type="submit" disabled={loading}
                      className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold"
                      style={{background:'#185FA5',borderColor:'#185FA5'}}>
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                  </form>
                )}
                <button onClick={() => switchView('login')}
                  className="mt-4 text-xs text-blue-600 hover:underline block mx-auto">
                  ← Back to sign in
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <img src="/cutech_logo.png" alt="Cutech" style={{height:'20px',width:'auto',opacity:0.6}} />
            <p className="text-blue-300/60 text-xs mt-1">© {new Date().getFullYear()} Cutech · Complete Solution Provider</p>
          </div>
        </div>
      </div>
    </div>
  )
}
