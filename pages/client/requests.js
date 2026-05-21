import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, PRIORITY_COLOR, NDT_STATUSES, NDT_METHODS, JOB_CATEGORIES, STATUS_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline, SupportJobBadge } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 text-center">
      <div className={`text-2xl font-semibold ${color || 'text-gray-800'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

export default function ClientRequests() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ status: '', method: '', category: '', date: '' })
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .eq('client_id', user.id)
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

  async function clientReview(newStatus) {
    setReviewing(true)
    await supabase.from('requests').update({ status: newStatus }).eq('id', selected.id)
    setSelected(prev => ({ ...prev, status: newStatus }))
    setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: newStatus } : r))
    setReviewing(false)
  }

  const filtered = requests.filter(r => {
    if (filters.status && r.status !== filters.status) return false
    if (filters.method && r.ndt_method !== filters.method) return false
    if (filters.category && r.job_category !== filters.category) return false
    if (filters.date && r.date_needed !== filters.date) return false
    return true
  })

  const hasFilters = Object.values(filters).some(Boolean)

  // Dashboard stats
  const stats = {
    total: requests.length,
    active: requests.filter(r => !['Report accepted'].includes(r.status)).length,
    overdue: requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date() && !['Report accepted','Draft Report Accepted'].includes(r.status)).length,
    completed: requests.filter(r => r.status === 'Report accepted').length,
    byStatus: NDT_STATUSES.map(s => ({ status: s, count: requests.filter(r => r.status === s).length })).filter(x => x.count > 0),
    byCategory: JOB_CATEGORIES.map(c => ({ cat: c, count: requests.filter(r => r.job_category === c).length })),
  }

  const nav = [
    { href: '/client/requests', label: 'Dashboard', icon: '📊' },
    { href: '/client/new', label: 'New Request', icon: '➕' },
  ]

  return (
    <Layout profile={profile} nav={nav}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1">
          {['dashboard','requests'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${activeTab === t ? 'bg-blue-700 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t === 'dashboard' ? '📊 Dashboard' : '📋 My Requests'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary text-sm" onClick={() => router.push('/client/new')}>+ New request</button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <StatCard label="Total requests" value={stats.total} />
            <StatCard label="Active jobs" value={stats.active} color="text-blue-700" />
            <StatCard label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'} />
            <StatCard label="Completed" value={stats.completed} color="text-green-600" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By status</div>
              {stats.byStatus.length === 0
                ? <p className="text-xs text-gray-400">No requests yet</p>
                : stats.byStatus.map(({ status, count }) => (
                  <div key={status} className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-600">{status}</span>
                        <span className="text-xs font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.round((count / stats.total) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By category</div>
              {stats.byCategory.map(({ cat, count }) => (
                <div key={cat} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600">{cat}</span>
                  <span className={`badge text-xs ${count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-400">Uncategorised</span>
                <span className="badge bg-gray-100 text-gray-400 text-xs">{requests.filter(r => !r.job_category).length}</span>
              </div>
            </div>
          </div>

          {stats.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-red-700 mb-2">⚠ Overdue requests</div>
              {requests.filter(r => r.date_needed && new Date(r.date_needed) < new Date() && !['Report accepted','Draft Report Accepted'].includes(r.status)).map(r => (
                <div key={r.id} className="flex items-center gap-2 py-1 cursor-pointer hover:opacity-80"
                  onClick={() => { setActiveTab('requests'); setTimeout(() => openRequest(r), 100) }}>
                  <span className="text-xs font-semibold text-red-700">{r.request_no}</span>
                  <span className="text-xs text-red-600">{r.ndt_method}</span>
                  <span className="ml-auto text-xs text-red-500">Due: {r.date_needed}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setActiveTab('requests')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2">
            View all requests →
          </button>
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`btn text-xs ${hasFilters ? 'btn-primary' : 'btn-ghost'}`}>
              🔍 Filter {hasFilters ? `(${Object.values(filters).filter(Boolean).length})` : ''}
            </button>
            <div className="flex gap-1 flex-wrap">
              {['All', ...NDT_STATUSES].map(s => (
                <button key={s} onClick={() => setFilters(f => ({ ...f, status: s === 'All' ? '' : s }))}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors
                    ${(s === 'All' && !filters.status) || filters.status === s
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  {s === 'All' ? `All (${requests.length})` : `${s} (${requests.filter(r => r.status === s).length})`}
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">NDT method</label>
                  <select className="input text-xs py-1" value={filters.method}
                    onChange={e => setFilters(f => ({ ...f, method: e.target.value }))}>
                    <option value="">All methods</option>
                    {NDT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Category</label>
                  <select className="input text-xs py-1" value={filters.category}
                    onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                    <option value="">All categories</option>
                    {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Date needed</label>
                  <input className="input text-xs py-1" type="date" value={filters.date}
                    onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <button onClick={() => setFilters({ status: '', method: '', category: '', date: '' })}
                className="text-xs text-blue-600 mt-2">Clear all</button>
            </div>
          )}

          {filtered.length === 0
            ? <div className="card text-center py-8 text-gray-400 text-sm">No requests found.</div>
            : <div className="space-y-1">
                {filtered.map(r => (
                  <div key={r.id}
                    className="bg-white border border-gray-100 rounded-lg px-3 py-2 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all"
                    onClick={() => openRequest(r)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-blue-700 w-16 shrink-0">{r.request_no}</span>
                      <span className="text-xs font-medium truncate flex-1">{r.ndt_method}</span>
                      <StatusBadge status={r.status} />
                      {r.job_category && <span className="badge bg-gray-100 text-gray-600 text-xs">{r.job_category}</span>}
                      {r.priority !== 'Normal' && <span className={`badge ${PRIORITY_COLOR[r.priority]} text-xs`}>{r.priority}</span>}
                      {r.status === 'Draft Report Submitted' && (
                        <span className="badge bg-indigo-100 text-indigo-700 text-xs">Action needed</span>
                      )}
                      <span className="text-xs text-gray-400 shrink-0">{r.date_needed}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {r.location}{r.equipment_no ? ` · ${r.equipment_no}` : ''}
                      {r.support_jobs?.length > 0 && ` · ${r.support_jobs.map(s => s.job_type).join(', ')}`}
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
              {/* Timeline */}
              <div className="card py-3 px-3">
                <NDTTimeline status={selected.status} />
              </div>

              {/* Client review action for Draft Report */}
              {selected.status === 'Draft Report Submitted' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                  <div className="text-sm font-semibold text-indigo-800 mb-1">📋 Draft report ready for review</div>
                  <p className="text-xs text-indigo-600 mb-3">Download and review the report below, then accept or request revision.</p>
                  <div className="flex gap-2">
                    <button onClick={() => clientReview('Draft Report Accepted')} disabled={reviewing}
                      className="btn btn-primary text-xs flex-1 justify-center bg-green-600 border-green-600 hover:bg-green-700">
                      ✅ Accept draft
                    </button>
                    <button onClick={() => clientReview('Revision Required')} disabled={reviewing}
                      className="btn text-xs flex-1 justify-center bg-red-50 border-red-300 text-red-700 hover:bg-red-100">
                      ✏️ Revision required
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'Revision Required' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  ✏️ Revision requested — the NDT team will resubmit the report.
                </div>
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

              {['Draft Report Submitted','Revision Required','Draft Report Accepted','Report accepted'].includes(selected.status) && (
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
                  ['Location', selected.location],
                  ['Equipment', selected.equipment_no],
                  ['Method', selected.ndt_method],
                  ['Category', selected.job_category],
                  ['Scope', selected.scope_qty],
                  ['Date needed', selected.date_needed],
                  ['Priority', selected.priority],
                  ['Technician', selected.tech_name],
                  ['Scheduled', selected.scheduled_date],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              {/* Activity */}
              {selected.status_history?.length > 0 && (
                <div className="card text-xs">
                  <div className="section-title">Activity</div>
                  {[...selected.status_history].reverse().map(h => (
                    <div key={h.id} className="flex items-center gap-2 py-0.5">
                      <span className="text-gray-400 w-28 shrink-0 text-xs">
                        {new Date(h.changed_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
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
