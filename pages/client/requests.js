import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, PRIORITY_COLOR, NDT_STATUSES, JOB_CATEGORIES, STATUS_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline, SupportJobBadge } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'
import RequestComments from '../../components/RequestComments'

const ACTIVE_STATUSES = NDT_STATUSES.filter(s => !['Report accepted','Cancelled'].includes(s))

export default function ClientRequests() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ status: '', category: '', dateFrom: '', dateTo: '', equipment: '', requestedBy: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [acting, setActing] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p); setUser(u)
    await load(u.id)
  }

  async function load(uid) {
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .eq('client_id', uid)
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

  async function updateStatus(newStatus) {
    setActing(true)
    await supabase.from('requests').update({ status: newStatus }).eq('id', selected.id)
    setSelected(prev => ({ ...prev, status: newStatus }))
    setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: newStatus } : r))
    setActing(false)
  }

  async function cancelRequest() {
    if (!confirm(`Cancel request ${selected.request_no}? This cannot be undone.`)) return
    await updateStatus('Cancelled')
  }

  // Filtering
  const filtered = requests.filter(r => {
    const s = search.toLowerCase()
    if (s && ![r.request_no, r.ndt_method, r.location, r.equipment_no, r.requested_by_name, r.company]
      .filter(Boolean).join(' ').toLowerCase().includes(s)) return false
    if (filters.status && r.status !== filters.status) return false
    if (filters.category && r.job_category !== filters.category) return false
    if (filters.equipment && !(r.equipment_no || '').toLowerCase().includes(filters.equipment.toLowerCase())) return false
    if (filters.requestedBy && !(r.requested_by_name || '').toLowerCase().includes(filters.requestedBy.toLowerCase())) return false
    if (filters.dateFrom && r.created_at?.slice(0,10) < filters.dateFrom) return false
    if (filters.dateTo && r.created_at?.slice(0,10) > filters.dateTo) return false
    return true
  })

  const hasFilters = Object.values(filters).some(Boolean) || search

  // Dashboard stats
  const active = requests.filter(r => ACTIVE_STATUSES.includes(r.status))
  const overdue = requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date()
    && !['Report accepted','Cancelled','Draft Report Accepted'].includes(r.status))
  const awaitingReview = requests.filter(r => r.status === 'Draft Report Submitted')
  const completed = requests.filter(r => r.status === 'Report accepted')

  const scheduled = requests.filter(r => r.scheduled_date)
  const scheduledGrouped = scheduled.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r); return acc
  }, {})

  const nav = [
    { href: '/client/requests', label: 'Dashboard', icon: '📊' },
    { href: '/client/new', label: 'New Request', icon: '➕' },
  ]

  return (
    <Layout profile={profile} nav={nav}>
      {/* Tab switcher */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1">
          {['dashboard','requests','schedule'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === t ? 'bg-blue-700 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'requests' ? `📋 All Requests (${requests.length})` : `📅 Schedule (${scheduled.length})`}
            </button>
          ))}
        </div>
        <button className="btn btn-primary text-sm" onClick={() => router.push('/client/new')}>+ New request</button>
      </div>

      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Total', value: requests.length, color: '' },
              { label: 'Active', value: active.length, color: 'text-blue-700' },
              { label: 'Awaiting review', value: awaitingReview.length, color: awaitingReview.length > 0 ? 'text-indigo-600' : '' },
              { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? 'text-red-600' : 'text-gray-400' },
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
                  onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                  <span className="text-xs font-bold text-indigo-700">{r.request_no}</span>
                  <span className="text-xs text-indigo-600">{r.ndt_method}</span>
                  <span className="badge bg-indigo-100 text-indigo-700 text-xs ml-auto">Review now →</span>
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

          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-red-700 mb-2">⚠ Overdue</div>
              {overdue.map(r => (
                <div key={r.id} className="flex items-center gap-2 py-1 cursor-pointer"
                  onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                  <span className="text-xs font-bold text-red-700">{r.request_no}</span>
                  <span className="text-xs text-red-600">{r.ndt_method}</span>
                  <span className="ml-auto text-xs text-red-500">Due: {r.date_needed}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setActiveTab('requests')} className="w-full text-center text-sm text-blue-600 py-2">
            View all requests →
          </button>
        </div>
      )}

      {/* REQUESTS LIST */}
      {activeTab === 'requests' && (
        <>
          {/* Search bar */}
          <div className="flex gap-2 mb-2">
            <div className="flex-1 relative">
              <input className="input pl-8 text-sm w-full" placeholder="Search by ID, method, location, equipment, requestor…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn text-xs ${hasFilters ? 'btn-primary' : 'btn-ghost'}`}>
              ⚙ Filters {Object.values(filters).filter(Boolean).length > 0 ? `(${Object.values(filters).filter(Boolean).length})` : ''}
            </button>
          </div>

          {/* Status quick filter */}
          <div className="flex gap-1 flex-wrap mb-2">
            {['All',...NDT_STATUSES].map(s => {
              const count = s === 'All' ? requests.length : requests.filter(r=>r.status===s).length
              if (count === 0 && s !== 'All') return null
              return (
                <button key={s} onClick={() => setFilters(f=>({...f,status:s==='All'?'':s}))}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors
                    ${(s==='All'&&!filters.status)||filters.status===s ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200'}`}>
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
                  <label className="label text-xs">Equipment / piping no.</label>
                  <input className="input text-xs py-1" placeholder="e.g. V-1201"
                    value={filters.equipment} onChange={e => setFilters(f=>({...f,equipment:e.target.value}))} />
                </div>
                <div>
                  <label className="label text-xs">Requested by</label>
                  <input className="input text-xs py-1" placeholder="Name"
                    value={filters.requestedBy} onChange={e => setFilters(f=>({...f,requestedBy:e.target.value}))} />
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
                    <label className="label text-xs">Created from</label>
                    <input className="input text-xs py-1" type="date"
                      value={filters.dateFrom} onChange={e => setFilters(f=>({...f,dateFrom:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label text-xs">Created to</label>
                    <input className="input text-xs py-1" type="date"
                      value={filters.dateTo} onChange={e => setFilters(f=>({...f,dateTo:e.target.value}))} />
                  </div>
                </div>
              </div>
              <button onClick={() => { setFilters({status:'',category:'',dateFrom:'',dateTo:'',equipment:'',requestedBy:''}); setSearch('') }}
                className="text-xs text-blue-600">Clear all filters</button>
            </div>
          )}

          <div className="text-xs text-gray-400 mb-2">Showing {filtered.length} of {requests.length} requests</div>

          {filtered.length === 0
            ? <div className="card text-center py-8 text-gray-400 text-sm">No requests found.</div>
            : <div className="space-y-1">
                {filtered.map(r => (
                  <div key={r.id}
                    className={`bg-white border rounded-lg px-3 py-2 cursor-pointer hover:shadow-sm transition-all
                      ${r.status === 'Cancelled' ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:border-blue-200'}
                      ${r.status === 'Draft Report Submitted' ? 'border-l-4 border-l-indigo-400' : ''}`}
                    onClick={() => openRequest(r)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-blue-700 w-16 shrink-0">{r.request_no}</span>
                      <span className="text-xs truncate flex-1">{r.ndt_method}</span>
                      <StatusBadge status={r.status} />
                      {r.job_category && <span className="badge bg-gray-100 text-gray-600 text-xs">{r.job_category}</span>}
                      {r.status === 'Draft Report Submitted' && <span className="badge bg-indigo-100 text-indigo-700 text-xs">Action needed</span>}
                      <span className="text-xs text-gray-400 shrink-0">{r.date_needed}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                      {r.location && <span>{r.location}</span>}
                      {r.equipment_no && <span>· {r.equipment_no}</span>}
                      {r.requested_by_name && <span>· 👤 {r.requested_by_name}</span>}
                      <span className="ml-auto">{r.created_at?.slice(0,10)}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </>
      )}

      {/* SCHEDULE */}
      {activeTab === 'schedule' && (
        <>
          {Object.keys(scheduledGrouped).length === 0
            ? <div className="card text-center text-gray-400 py-10">No scheduled jobs yet.</div>
            : Object.keys(scheduledGrouped).sort().map(date => (
              <div key={date} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-semibold">{date}</span>
                  <span className="text-xs text-gray-400">{scheduledGrouped[date].length} job{scheduledGrouped[date].length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {scheduledGrouped[date].map(r => (
                    <div key={r.id} className="card cursor-pointer hover:shadow-sm transition-all hover:border-blue-200"
                      onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
                        <StatusBadge status={r.status} />
                        {r.job_category && <span className="badge bg-gray-100 text-gray-600 text-xs">{r.job_category}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {r.ndt_method}{r.location ? ` · ${r.location}` : ''}{r.equipment_no ? ` · ${r.equipment_no}` : ''}
                      </div>
                      {r.support_jobs?.map(sj => (
                        <div key={sj.id} className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                          <span>{sj.job_type}:</span><StatusBadge status={sj.status} />
                        </div>
                      ))}
                      {r.manager_notes && <p className="text-xs text-gray-400 italic mt-1.5">📝 {r.manager_notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* DETAIL DRAWER */}
      {selected && profile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{selected.request_no}</span>
                  <StatusBadge status={selected.status} />
                  {selected.job_category && <span className="badge bg-gray-100 text-gray-600 text-xs">{selected.job_category}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selected.ndt_method} · {selected.location}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPrinting(true)} className="btn btn-ghost text-xs">🖨️</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">×</button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="card py-3"><NDTTimeline status={selected.status} /></div>

              {/* Draft report review */}
              {selected.status === 'Draft Report Submitted' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <div className="text-sm font-semibold text-indigo-800 mb-1">📋 Draft report ready for review</div>
                  <p className="text-xs text-indigo-600 mb-3">Download the report below. If satisfied, click Accept. If revision needed, contact your NDT Manager and leave as-is.</p>
                  <button onClick={() => updateStatus('Draft Report Accepted')} disabled={acting}
                    className="btn btn-primary text-xs w-full justify-center"
                    style={{background:'#059669',borderColor:'#059669'}}>
                    {acting ? 'Updating…' : '✅ Accept draft report'}
                  </button>
                </div>
              )}

              {selected.status === 'Draft Report Accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  ✅ Draft report accepted — Cutech NDT team will issue the final report.
                </div>
              )}

              {/* Cancel button for new/scheduled requests */}
              {['New request','Scheduled'].includes(selected.status) && (
                <button onClick={cancelRequest} disabled={acting}
                  className="w-full text-xs text-red-500 hover:text-red-700 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  ✕ Cancel this request
                </button>
              )}

              {/* Support work */}
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

              {/* Docs */}
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

              {/* Details */}
              <div className="card text-xs space-y-1">
                <div className="section-title">Details</div>
                {[
                  ['Requested by', selected.requested_by_name],
                  ['Created', selected.created_at?.slice(0,10)],
                  ['Location', selected.location],
                  ['Equipment', selected.equipment_no],
                  ['Method', selected.ndt_method],
                  ['Category', selected.job_category],
                  ['Scope', selected.scope_qty],
                  ['Date needed', selected.date_needed],
                  ['Priority', selected.priority],
                  ['Scheduled', selected.scheduled_date],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              <RequestComments requestId={selected.id} profile={profile} />

              {selected.status_history?.length > 0 && (
                <div className="card text-xs">
                  <div className="section-title">Activity</div>
                  {[...selected.status_history].reverse().map(h => (
                    <div key={h.id} className="flex items-center gap-2 py-0.5">
                      <span className="text-gray-400 w-28 shrink-0 text-xs">
                        {new Date(h.changed_at).toLocaleString('en-SG', {dateStyle:'short',timeStyle:'short'})}
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
        <PrintRequest request={{ ...selected, support_jobs: selected.support_jobs || [] }}
          onClose={() => setPrinting(false)} />
      )}
    </Layout>
  )
}
