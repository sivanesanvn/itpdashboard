import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, JOB_CATEGORIES, NDT_METHODS } from '../../lib/supabase'
import Layout from '../../components/Layout'
import DonutChart from '../../components/DonutChart'

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
  const [period, setPeriod] = useState('Overall')

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

  const now = new Date()
  const periodRequests = requests.filter(r => {
    if (period === 'Overall') return true
    const d = new Date(r.created_at)
    if (period === 'Monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return d.getFullYear() === now.getFullYear()
  })

  const active        = requests.filter(r => ACTIVE_STATUSES.includes(r.status))
  const overdue       = requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date()
    && !['Report accepted','Cancelled','Draft Report Accepted'].includes(r.status))
  const awaitingReview = requests.filter(r => r.status === 'Draft Report Submitted')

  return (
    <Layout profile={profile} nav={NAV}>
      {/* Period filter */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex gap-1">
          {['Monthly','Yearly','Overall'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${period === p ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Total',           value: periodRequests.length,       color: '' },
          { label: 'Active',          value: periodRequests.filter(r => ACTIVE_STATUSES.includes(r.status)).length, color: 'text-blue-700' },
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

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Status</div>
          <div className="flex items-center gap-3">
            <DonutChart size={110} data={[
              { label: 'New',       value: periodRequests.filter(r => r.status === 'New request').length,      color: '#3b82f6' },
              { label: 'Active',    value: periodRequests.filter(r => ['Scheduled','Site Work On-going'].includes(r.status)).length, color: '#f59e0b' },
              { label: 'Reporting', value: periodRequests.filter(r => ['Site work completed','Draft Report Submitted','Draft Report Accepted'].includes(r.status)).length, color: '#6366f1' },
              { label: 'Done',      value: periodRequests.filter(r => r.status === 'Report accepted').length,  color: '#10b981' },
              { label: 'Cancelled', value: periodRequests.filter(r => r.status === 'Cancelled').length,        color: '#ef4444' },
            ]} />
            <div className="flex flex-col gap-1 text-xs">
              {[
                { label: 'New',       color: '#3b82f6', value: periodRequests.filter(r => r.status === 'New request').length },
                { label: 'Active',    color: '#f59e0b', value: periodRequests.filter(r => ['Scheduled','Site Work On-going'].includes(r.status)).length },
                { label: 'Reporting', color: '#6366f1', value: periodRequests.filter(r => ['Site work completed','Draft Report Submitted','Draft Report Accepted'].includes(r.status)).length },
                { label: 'Done',      color: '#10b981', value: periodRequests.filter(r => r.status === 'Report accepted').length },
                { label: 'Cancelled', color: '#ef4444', value: periodRequests.filter(r => r.status === 'Cancelled').length },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: l.color}} />
                  <span className="text-gray-500">{l.label}</span>
                  <span className="font-semibold ml-auto pl-2">{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Category</div>
          <div className="flex items-center gap-3">
            <DonutChart size={110} data={[
              { label: 'Meridium',    value: periodRequests.filter(r => r.job_category === 'Meridium').length,    color: '#185FA5' },
              { label: 'Turn Around', value: periodRequests.filter(r => r.job_category === 'Turn Around').length, color: '#1D9E75' },
              { label: 'Ad-Hoc',      value: periodRequests.filter(r => r.job_category === 'Ad-Hoc').length,      color: '#f59e0b' },
            ]} />
            <div className="flex flex-col gap-1 text-xs">
              {[
                { label: 'Meridium',    color: '#185FA5', value: periodRequests.filter(r => r.job_category === 'Meridium').length },
                { label: 'Turn Around', color: '#1D9E75', value: periodRequests.filter(r => r.job_category === 'Turn Around').length },
                { label: 'Ad-Hoc',      color: '#f59e0b', value: periodRequests.filter(r => r.job_category === 'Ad-Hoc').length },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background: l.color}} />
                  <span className="text-gray-500">{l.label}</span>
                  <span className="font-semibold ml-auto pl-2">{l.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 — NDT Method */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By NDT Method</div>
        <div className="flex items-center gap-4">
          <DonutChart size={110} data={
            NDT_METHODS.map((m, i) => ({
              label: m,
              value: periodRequests.filter(r => r.ndt_method === m).length,
              color: `hsl(${(i * 360 / NDT_METHODS.length)},60%,48%)`,
            }))
          } />
          <div className="flex flex-col gap-1 text-xs overflow-y-auto max-h-28">
            {NDT_METHODS.map((m, i) => {
              const count = periodRequests.filter(r => r.ndt_method === m).length
              if (!count) return null
              return (
                <div key={m} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: `hsl(${(i * 360 / NDT_METHODS.length)},60%,48%)` }} />
                  <span className="text-gray-500">{m}</span>
                  <span className="font-semibold ml-auto pl-2">{count}</span>
                </div>
              )
            })}
          </div>
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
