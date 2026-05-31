import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, JOB_CATEGORIES, STATUS_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline, SupportJobBadge } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'

const ACTIVE = ['New request','Scheduled','Site Work On-going','Site work completed','Draft Report Submitted','Draft Report Accepted']

const NAV = (badge) => [
  { href: '/coordinator/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/client/new', label: 'New Request', icon: '➕', badge },
]

export default function CoordinatorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', category: '', requestedBy: '', dateFrom: '', dateTo: '', method: '' })
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'coordinator') { router.push('/'); return }
    setProfile(p)
    // Load ALL requests from same company
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .eq('company', p.company)
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  async function openRequest(r) {
    setSelected(r)
    const { data } = await supabase.from('request_documents').select('*')
      .eq('request_id', r.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }

  async function reloadDocs() {
    if (!selected) return
    const { data } = await supabase.from('request_documents').select('*')
      .eq('request_id', selected.id).order('created_at', { ascending: false })
    setDocs(data || [])
  }

  // Stats
  const total = requests.length
  const active = requests.filter(r => ACTIVE.includes(r.status)).length
  const overdue = requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date() && ACTIVE.includes(r.status)).length
  const awaitingReview = requests.filter(r => r.status === 'Draft Report Submitted').length
  const completed = requests.filter(r => r.status === 'Report accepted').length

  // Workload by requestor
  const byRequestor = {}
  requests.forEach(r => {
    const name = r.requested_by_name || 'Unknown'
    if (!byRequestor[name]) byRequestor[name] = { total: 0, active: 0, overdue: 0 }
    byRequestor[name].total++
    if (ACTIVE.includes(r.status)) byRequestor[name].active++
    if (r.date_needed && new Date(r.date_needed) < new Date() && ACTIVE.includes(r.status)) byRequestor[name].overdue++
  })

  // Filtering
  const filtered = requests.filter(r => {
    const s = search.toLowerCase()
    if (s && ![r.request_no, r.ndt_method, r.location, r.equipment_no, r.requested_by_name]
      .filter(Boolean).join(' ').toLowerCase().includes(s)) return false
    if (filters.status && r.status !== filters.status) return false
    if (filters.category && r.job_category !== filters.category) return false
    if (filters.method && !r.ndt_method?.toLowerCase().includes(filters.method.toLowerCase())) return false
    if (filters.requestedBy && !(r.requested_by_name || '').toLowerCase().includes(filters.requestedBy.toLowerCase())) return false
    if (filters.dateFrom && r.created_at?.slice(0,10) < filters.dateFrom) return false
    if (filters.dateTo && r.created_at?.slice(0,10) > filters.dateTo) return false
    return true
  })

  const hasFilters = Object.values(filters).some(Boolean) || search

  return (
    <Layout profile={profile} nav={NAV(awaitingReview)}>
      {/* Tab switcher */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1">
          {['dashboard','requests','workload'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === t ? 'bg-blue-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'requests' ? `📋 All Requests (${requests.length})` : '👥 Workload'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary text-sm" onClick={() => router.push('/client/new')}>+ New request</button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[
              { label: 'Total', value: total },
              { label: 'Active', value: active, color: 'text-blue-700' },
              { label: 'Awaiting review', value: awaitingReview, color: awaitingReview > 0 ? 'text-indigo-600' : '' },
              { label: 'Overdue', value: overdue, color: overdue > 0 ? 'text-red-600' : 'text-gray-400' },
              { label: 'Completed', value: completed, color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
                <div className={`text-2xl font-semibold ${s.color || ''}`}>{s.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Awaiting review */}
          {awaitingReview > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-indigo-700 mb-2">📋 Reports waiting for review</div>
              {requests.filter(r => r.status === 'Draft Report Submitted').map(r => (
                <div key={r.id} className="flex items-center gap-2 py-1 cursor-pointer"
                  onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                  <span className="text-xs font-bold text-indigo-700">{r.request_no}</span>
                  <span className="text-xs text-indigo-600">{r.ndt_method}</span>
                  <span className="text-xs text-indigo-400">— {r.requested_by_name}</span>
                  <span className="badge bg-indigo-100 text-indigo-700 text-xs ml-auto">Review →</span>
                </div>
              ))}
            </div>
          )}

          {/* By status */}
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
                        style={{ width: `${Math.round((count / total) * 100)}%` }} />
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

          {/* Overdue */}
          {overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-red-700 mb-2">⚠ Overdue</div>
              {requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date() && ACTIVE.includes(r.status)).map(r => (
                <div key={r.id} className="flex items-center gap-2 py-1 cursor-pointer"
                  onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                  <span className="text-xs font-bold text-red-700">{r.request_no}</span>
                  <span className="text-xs text-red-600">{r.ndt_method}</span>
                  <span className="text-xs text-red-400">— {r.requested_by_name}</span>
                  <span className="ml-auto text-xs text-red-500">Due: {r.date_needed}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKLOAD TAB */}
      {activeTab === 'workload' && (
        <div>
          <div className="text-xs text-gray-400 mb-3">Workload breakdown by requestor — {profile?.company}</div>
          <div className="space-y-2">
            {Object.entries(byRequestor).sort((a,b) => b[1].total - a[1].total).map(([name, data]) => (
              <div key={name} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">👤 {name}</div>
                  <div className="flex gap-2">
                    <span className="badge bg-blue-100 text-blue-700 text-xs">{data.total} total</span>
                    <span className="badge bg-amber-100 text-amber-700 text-xs">{data.active} active</span>
                    {data.overdue > 0 && <span className="badge bg-red-100 text-red-700 text-xs">{data.overdue} overdue</span>}
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full"
                    style={{ width: total > 0 ? `${Math.round((data.total / total) * 100)}%` : '0%' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {total > 0 ? Math.round((data.total / total) * 100) : 0}% of company requests
                </div>
                <button onClick={() => {
                  setFilters(f => ({...f, requestedBy: name}))
                  setActiveTab('requests')
                }} className="text-xs text-blue-600 mt-1 hover:underline">
                  View requests →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <>
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <input className="input pl-8 text-sm w-full"
                placeholder="Search by ID, method, location, equipment, requestor…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn text-xs ${hasFilters ? 'btn-primary' : 'btn-ghost'}`}>
              ⚙ Filters {Object.values(filters).filter(Boolean).length > 0 ? `(${Object.values(filters).filter(Boolean).length})` : ''}
            </button>
          </div>

          {/* Status pills */}
          <div className="flex gap-1 flex-wrap mb-2">
            {['All',...NDT_STATUSES].map(s => {
              const count = s === 'All' ? requests.length : requests.filter(r=>r.status===s).length
              if (count === 0 && s !== 'All') return null
              return (
                <button key={s} onClick={() => setFilters(f=>({...f,status:s==='All'?'':s}))}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors
                    ${(s==='All'&&!filters.status)||filters.status===s
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-500 border-gray-200'}`}>
                  {s} ({count})
                </button>
              )
            })}
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-2">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="label text-xs">Requestor name</label>
                  <input className="input text-xs py-1" placeholder="Search name"
                    value={filters.requestedBy} onChange={e => setFilters(f=>({...f,requestedBy:e.target.value}))} />
                </div>
                <div>
                  <label className="label text-xs">NDT method</label>
                  <input className="input text-xs py-1" placeholder="e.g. UT, RT"
                    value={filters.method} onChange={e => setFilters(f=>({...f,method:e.target.value}))} />
                </div>
                <div>
                  <label className="label text-xs">Category</label>
                  <select className="input text-xs py-1" value={filters.category}
                    onChange={e => setFilters(f=>({...f,category:e.target.value}))}>
                    <option value="">All categories</option>
                    {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="label text-xs">From date</label>
                    <input className="input text-xs py-1" type="date"
                      value={filters.dateFrom} onChange={e => setFilters(f=>({...f,dateFrom:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label text-xs">To date</label>
                    <input className="input text-xs py-1" type="date"
                      value={filters.dateTo} onChange={e => setFilters(f=>({...f,dateTo:e.target.value}))} />
                  </div>
                </div>
              </div>
              <button onClick={() => { setFilters({status:'',category:'',requestedBy:'',dateFrom:'',dateTo:'',method:''}); setSearch('') }}
                className="text-xs text-blue-600">Clear all</button>
            </div>
          )}

          <div className="text-xs text-gray-400 mb-2">Showing {filtered.length} of {requests.length} requests</div>

          {filtered.length === 0
            ? <div className="card text-center py-8 text-gray-400 text-sm">No requests found.</div>
            : <div className="space-y-1">
                {filtered.map(r => (
                  <div key={r.id}
                    className={`bg-white border rounded-lg px-3 py-2 cursor-pointer hover:shadow-sm transition-all
                      ${r.status === 'Cancelled' ? 'opacity-50 border-gray-100' : 'border-gray-100 hover:border-blue-200'}
                      ${r.status === 'Draft Report Submitted' ? 'border-l-4 border-l-indigo-400' : ''}`}
                    onClick={() => openRequest(r)}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-blue-700 w-16 shrink-0">{r.request_no}</span>
                      <span className="text-xs truncate w-40">{r.ndt_method}</span>
                      <span className="text-xs text-gray-500 truncate flex-1">👤 {r.requested_by_name || '—'}</span>
                      <StatusBadge status={r.status} />
                      <span className="text-xs text-gray-400 shrink-0">{r.date_needed}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {r.location}{r.equipment_no ? ` · ${r.equipment_no}` : ''}
                      {r.job_category ? ` · ${r.job_category}` : ''}
                    </div>
                  </div>
                ))}
              </div>
          }
        </>
      )}

      {/* DETAIL DRAWER */}
      {selected && profile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{selected.request_no}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selected.ndt_method} · {selected.location}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPrinting(true)} className="btn btn-ghost text-xs">🖨️</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">×</button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="card py-3"><NDTTimeline status={selected.status} /></div>

              {selected.support_jobs?.length > 0 && (
                <div className="card">
                  <div className="section-title">Support work</div>
                  {selected.support_jobs.map(sj => (
                    <div key={sj.id} className="flex items-center justify-between py-1.5 border-b last:border-0 border-gray-50">
                      <div>
                        <div className="text-xs font-medium">{sj.job_type}</div>
                        <div className="text-xs text-gray-400">{sj.contractor_name || 'Not assigned'}</div>
                      </div>
                      <StatusBadge status={sj.status} />
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <DocumentUpload requestId={selected.id} profile={profile} fileType="document"
                  label="Supporting documents" existingDocs={docs} onUploaded={reloadDocs} />
              </div>

              {['Draft Report Submitted','Draft Report Accepted','Report accepted'].includes(selected.status) && (
                <div className="card">
                  <DocumentUpload requestId={selected.id} profile={profile} fileType="report"
                    label="NDT Report" existingDocs={docs} onUploaded={reloadDocs} />
                </div>
              )}

              <div className="card text-xs space-y-1">
                <div className="section-title">Details</div>
                {[
                  ['Requested by', selected.requested_by_name],
                  ['Created', selected.created_at?.slice(0,10)],
                  ['Company', selected.company],
                  ['Location', selected.location],
                  ['Equipment', selected.equipment_no],
                  ['Method', selected.ndt_method],
                  ['Category', selected.job_category],
                  ['Scope', selected.scope_qty],
                  ['Date needed', selected.date_needed],
                  ['Priority', selected.priority],
                  ['Scheduled', selected.scheduled_date],
                  ['Technician', selected.tech_name],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              {selected.status_history?.length > 0 && (
                <div className="card text-xs">
                  <div className="section-title">Activity</div>
                  {[...selected.status_history].reverse().map(h => (
                    <div key={h.id} className="flex items-center gap-2 py-0.5">
                      <span className="text-gray-400 w-28 shrink-0">
                        {new Date(h.changed_at).toLocaleString('en-SG',{dateStyle:'short',timeStyle:'short'})}
                      </span>
                      <StatusBadge status={h.new_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {printing && selected && (
        <PrintRequest request={{ ...selected, support_jobs: selected.support_jobs || [], documents: docs }}
          onClose={() => setPrinting(false)} />
      )}
    </Layout>
  )
}
