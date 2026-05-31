import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES } from '../../lib/supabase'
import Layout from '../../components/Layout'

const ACTIVE_STATUSES = NDT_STATUSES.filter(s => !['Report accepted','Cancelled'].includes(s))

const NAV = [
  { href: '/client/requests',     label: 'Dashboard',    icon: '📊' },
  { href: '/client/all-requests', label: 'All Requests', icon: '📋' },
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Job Category</div>
          <PieChart data={categoryData(requests)} />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">NDT Methods</div>
          <PieChart data={methodData(requests)} />
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Requests per Month</div>
          <BarChart data={monthlyData(requests)} />
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

// ── Chart helpers ────────────────────────────────────────────

const PIE_COLORS = ['#185FA5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6']

function categoryData(requests) {
  return ['Meridium','Turn Around','Ad-Hoc'].map((c, i) => ({
    label: c, value: requests.filter(r => r.job_category === c).length, color: PIE_COLORS[i],
  })).filter(d => d.value > 0)
}

function methodData(requests) {
  const counts = {}
  requests.forEach(r => { if (r.ndt_method) counts[r.ndt_method] = (counts[r.ndt_method] || 0) + 1 })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }))
}

function monthlyData(requests) {
  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('en-SG', { month: 'short', year: '2-digit' }), count: 0 }
  })
  requests.forEach(r => {
    const d = new Date(r.created_at)
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (m) m.count++
  })
  return months
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="text-xs text-gray-400 text-center py-4">No data</p>
  let angle = -Math.PI / 2
  const cx = 70, cy = 70, r = 58
  const slices = data.map(d => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2} Z` }
  })
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5" />)}
      </svg>
      <div className="w-full space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
            <span className="flex-1 truncate text-gray-600">{d.label}</span>
            <span className="font-semibold text-gray-800">{d.value}</span>
            <span className="text-gray-400">({Math.round(d.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 280, H = 110, padL = 24, padB = 18, barW = Math.floor((W - padL) / data.length) - 2
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + padB}`} className="overflow-visible">
      {[0, Math.ceil(max / 2), max].map((v, i) => {
        const y = H - (v / max) * H
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{v}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH = Math.max((d.count / max) * H, d.count > 0 ? 2 : 0)
        const x = padL + i * (barW + 2) + 1, y = H - barH
        const showLabel = i % 3 === 0 || i === data.length - 1
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#185FA5" rx="1.5" opacity="0.85" />
            {d.count > 0 && <text x={x + barW / 2} y={y - 2} textAnchor="middle" fontSize="7" fill="#374151">{d.count}</text>}
            {showLabel && <text x={x + barW / 2} y={H + padB - 2} textAnchor="middle" fontSize="7" fill="#9ca3af">{d.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}
