import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, PRIORITY_COLOR, STATUS_COLOR, JOB_CATEGORIES } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline, SupportJobBadge } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'

const MANAGER_NAV = (badge) => [
  { href: '/manager/dashboard', label: 'Dashboard', icon: '📊', badge },
  { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
  { href: '/manager/schedule',  label: 'Schedule', icon: '📅' },
  { href: '/manager/team',      label: 'Team', icon: '👥' },
]

export default function ManagerRequests() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [printing, setPrinting] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    await load()
  }

  async function load() {
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  async function loadDocs(requestId) {
    const { data } = await supabase
      .from('request_documents')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })
    setDocs(data || [])
  }

  async function openRequest(r) {
    setSelected(r)
    await loadDocs(r.id)
  }

  async function updateStatus(id, status) {
    await supabase.from('requests').update({ status }).eq('id', id)
    await load()
    setSelected(prev => prev ? { ...prev, status } : null)
  }

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'All' || r.status === filter
    const matchSearch = !search || [r.request_no, r.company, r.location, r.ndt_method]
      .join(' ').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const newCount = requests.filter(r => r.status === 'New request').length

  return (
    <Layout profile={profile} nav={MANAGER_NAV(newCount)}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold">All Requests</h1>
        <input className="input w-64 text-sm" placeholder="Search by ID, company, method…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {['All', ...NDT_STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${filter === s ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s} ({s === 'All' ? requests.length : requests.filter(r => r.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(r => (
          <div key={r.id}
            className="bg-white border border-gray-100 rounded-lg px-3 py-2 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all"
            onClick={() => openRequest(r)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-blue-700 w-16 shrink-0">{r.request_no}</span>
              <span className="text-xs font-medium truncate max-w-[120px]">{r.company}</span>
              <span className="text-xs text-gray-400 truncate flex-1">{r.ndt_method}</span>
              <StatusBadge status={r.status} />
              {r.job_category && <span className="badge bg-gray-100 text-gray-600 text-xs">{r.job_category}</span>}
              {r.priority !== 'Normal' && <span className={`badge ${PRIORITY_COLOR[r.priority]} text-xs`}>{r.priority}</span>}
              {!r.step2_complete && <span className="badge bg-amber-100 text-amber-700 text-xs">⚠ Details</span>}
              <span className="text-xs text-gray-400 shrink-0">{r.date_needed}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {r.location}{r.equipment_no ? ` · ${r.equipment_no}` : ''}{r.tech_name ? ` · 👷 ${r.tech_name}` : ''}
              {r.support_jobs?.length > 0 && ` · ${r.support_jobs.map(s=>s.job_type).join(', ')}`}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="card text-center text-gray-400 py-8">No requests found.</div>}
      </div>

      {/* Detail drawer */}
      {selected && profile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-semibold">{selected.request_no}</h2>
                <p className="text-xs text-gray-400">{selected.company} · {selected.ndt_method}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPrinting(true)} className="btn btn-ghost text-xs">🖨️ Print</button>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="card">
                <NDTTimeline status={selected.status} />
                <label className="label mt-3">Update status</label>
                <select className="input" value={selected.status}
                  onChange={e => updateStatus(selected.id, e.target.value)}>
                  {NDT_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Details */}
              <div className="card text-sm space-y-1.5">
                <div className="section-title">Site & scope</div>
                {[
                  ['Category', selected.job_category],
                  ['Location', selected.location],
                  ['Contact', selected.contact_name],
                  ['Phone', selected.contact_phone],
                  ['Method', selected.ndt_method],
                  ['Scope', selected.scope_qty],
                  ['Date needed', selected.date_needed],
                  ['Priority', selected.priority],
                  ['Description', selected.description],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              {/* Technical details */}
              {selected.step2_complete && (
                <div className="card text-sm space-y-1.5">
                  <div className="section-title">Technical details</div>
                  {[
                    ['Material', selected.material],
                    ['Thickness', selected.thickness_mm ? selected.thickness_mm + ' mm' : null],
                    ['Pipe size', selected.pipe_size],
                    ['P-Number', selected.p_number],
                    ['Code', selected.code_standard],
                    ['Acceptance', selected.acceptance],
                    ['Notes', selected.special_notes],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-400 w-24 shrink-0">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Support jobs */}
              {selected.support_jobs?.length > 0 && (
                <div className="card">
                  <div className="section-title">Support work</div>
                  {selected.support_jobs.map(sj => (
                    <div key={sj.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                      <div>
                        <div className="text-sm font-medium">{sj.job_type}</div>
                        <div className="text-xs text-gray-400">{sj.contractor_name || 'Unassigned'}</div>
                      </div>
                      <StatusBadge status={sj.status} />
                    </div>
                  ))}
                </div>
              )}

              {/* Supporting documents */}
              <div className="card">
                <DocumentUpload
                  requestId={selected.id}
                  profile={profile}
                  fileType="document"
                  label="Supporting documents"
                  existingDocs={docs}
                  onUploaded={() => loadDocs(selected.id)}
                />
              </div>

              {/* NDT Report */}
              <div className="card">
                <DocumentUpload
                  requestId={selected.id}
                  profile={profile}
                  fileType="report"
                  label="NDT Report"
                  existingDocs={docs}
                  onUploaded={() => loadDocs(selected.id)}
                />
              </div>

              {/* Scheduling */}
              {selected.scheduled_date && (
                <div className="card text-sm space-y-1.5">
                  <div className="section-title">Scheduling</div>
                  {[
                    ['Date', selected.scheduled_date],
                    ['Technician', selected.tech_name],
                    ['Notes', selected.manager_notes],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-400 w-24 shrink-0">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Audit trail */}
              {selected.status_history?.length > 0 && (
                <div className="card">
                  <div className="section-title">Audit trail</div>
                  {[...selected.status_history].reverse().map(h => (
                    <div key={h.id} className="flex items-center gap-2 text-xs py-1">
                      <span className="text-gray-400 w-32 shrink-0">
                        {new Date(h.changed_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="text-gray-400">{h.old_status} →</span>
                      <StatusBadge status={h.new_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print modal */}
      {printing && selected && (
        <PrintRequest
          request={{ ...selected, support_jobs: selected.support_jobs || [] }}
          onClose={() => setPrinting(false)}
        />
      )}
    </Layout>
  )
}
