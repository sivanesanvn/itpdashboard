import { useState } from 'react'
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
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    await supabase.auth.setSession(data.session)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile) { setError('Profile not found. Contact your manager.'); setLoading(false); return }
    router.push(ROLE_ROUTES[profile.role] || '/')
  }

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
            <div className="flex items-center justify-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <img src="/cutech_logo.png" alt="Cutech" style={{height:'32px',width:'auto'}} />
              <div className="w-px h-6 bg-gray-200" />
              <img src="/ticwerks_logo.svg" alt="TicWerks" style={{height:'32px',width:'auto'}} />
            </div>
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
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <img src="/cutech_logo.png" alt="Cutech" style={{height:'20px',width:'auto',opacity:0.6}} />
            <p className="text-blue-300/60 text-xs mt-1">© {new Date().getFullYear()} Cutech · Complete Solution Provider</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="text-white/70 text-xs font-medium">Powered by</span>
              <img src="/ticwerks_logo.svg" alt="TicWerks" style={{height:'28px',width:'auto',filter:'brightness(0) invert(1)'}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
