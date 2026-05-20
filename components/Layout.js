import { useRouter } from 'next/router'
import { supabase, ROLE_LABEL, ROLE_COLOR } from '../lib/supabase'

export default function Layout({ profile, nav = [], children }) {
  const router = useRouter()
  async function logout() { await supabase.auth.signOut(); router.push('/') }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Cutech logo */}
          <div className="flex items-center gap-2.5 mr-2">
            <img src="/cutech_logo.png" alt="Cutech" className="h-8 w-auto" />
          </div>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm text-gray-800">NDT Portal</span>
            <span className="text-xs text-gray-400">Singapore</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {profile && <>
              <span className={`badge ${ROLE_COLOR[profile.role]}`}>{ROLE_LABEL[profile.role]}</span>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile.full_name}</span>
            </>}
            <button onClick={logout} className="btn btn-ghost text-xs">Sign out</button>
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
                  {item.badge > 0 && <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{item.badge}</span>}
                </button>
              )
            })}
          </div>
        )}
      </header>
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">{children}</main>
      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/cutech_logo.png" alt="Cutech" className="h-5 w-auto opacity-60" />
          <span className="text-xs text-gray-400">NDT Portal · Singapore</span>
        </div>
        <span className="text-xs text-gray-300">© {new Date().getFullYear()} Cutech</span>
      </footer>
    </div>
  )
}
