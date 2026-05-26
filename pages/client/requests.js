import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, JOB_CATEGORIES } from '../../lib/supabase'
import Layout from '../../components/Layout'

const ACTIVE_STATUSES = NDT_STATUSES.filter(s => !['Report accepted','Cancelled'].includes(s))

const NAV = [
  { href: '/client/requests',     label: 'Dashboard',    icon: '📊' },
  { href: '/client/all-requests', label: 'All Requests', icon: '📋' },
  { href: '/client/schedule',     label: 'Schedule',     icon: '📅' },
  { href: '/client/new',          label: 'New Request',  icon: '➕' },
]

export default function ClientDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase
      .from('requests')
      .select('*, status_history(*)')
      .eq('client_id', u.id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  const active        = requests.filter(r => ACTIVE_STATUSES.includes(r.status))
  const overdue       = requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date()
    && !['Report accepted','Cancelled','Draft Report Accepted'].includes(r.status))
  const awaitingReview = requests.filter(r => r.status === 'Draft Report Submitted')

  return (
    <Layout profile={profile} nav={NAV}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total',           value: requests.length,       color: '' },
          { label: 'Active',          value: active.length,         color: 'text-blue-700' },
          { label: 'Awaiting review', value: awaitingReview.length, color: awaitingReview.length > 0 ? 'text-indigo-600' : '' },
          { label: 'Overdue',         value: overdue.length,        color: overdue.length > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Awaiting review alert */}
      {awaitingReview.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-indigo-700 mb-2">📋 Reports waiting for your review</div>
          {awaitingReview.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:opacity-80"
              onClick={() => router.push('/client/all-requests')}>
              <span className="text-xs font-bold text-indigo-700">{r.request_no}</span>
              <span className="text-xs text-indigo-600">{r.ndt_method}</span>
              <span className="badge bg-indigo-100 text-indigo-700 text-xs ml-auto">Review now →</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By status</div>
          {NDT_STATUSES.filter(s => s !== 'Cancelled').map(s => {
            const count = requests.filter(r => r.status === s).length
            if (!count) return null
            return (
              <div key={s} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{s}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round((count / requests.length) * 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By category</div>
          {JOB_CATEGORIES.map(c => (
            <div key={c} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-600">{c}</span>
              <span className={`badge text-xs ${requests.filter(r=>r.job_category===c).length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>
                {requests.filter(r=>r.job_category===c).length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <div className="text-xs font-semibold text-red-700 mb-2">⚠ Overdue</div>
          {overdue.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1 cursor-pointer"
              onClick={() => router.push('/client/all-requests')}>
              <span className="text-xs font-bold text-red-700">{r.request_no}</span>
              <span className="text-xs text-red-600">{r.ndt_method}</span>
              <span className="ml-auto text-xs text-red-500">Due: {r.date_needed}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => router.push('/client/all-requests')}
        className="w-full text-center text-sm text-blue-600 py-2">
        View all requests →
      </button>
    </Layout>
  )
}
