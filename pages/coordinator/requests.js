import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, JOB_CATEGORIES, NDT_METHODS } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'
import RequestComments from '../../components/RequestComments'

const EMPTY_COL = { status: '', method: '', equipment: '', location: '', category: '', requestedBy: '' }

function SearchSelect({ value, onChange, options, placeholder = 'All' }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  function select(v) { onChange(v); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className="relative w-full">
      <button type="button" onClick={() => { setOpen(o => !o); setQuery('') }}
        className={`w-full text-left text-xs border rounded px-1.5 py-1 bg-white flex items-center justify-between gap-1 focus:outline-none focus:ring-1 focus:ring-blue-300 ${value ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-500'}`}>
        <span className="truncate">{value || placeholder}</span>
        <span className="text-gray-300 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-0.5 w-48 bg-white border border-gray-200 rounded shadow-lg">
          <div className="p-1.5 border-b border-gray-100">
            <input autoFocus className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
              placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => select('')}
              className={`w-full text-left text-xs px-2.5 py-1.5 hover:bg-blue-50 ${!value ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              All
            </button>
            {filtered.map(o => (
              <button key={o} type="button" onClick={() => select(o)}
                className={`w-full text-left text-xs px-2.5 py-1.5 hover:bg-blue-50 truncate ${value === o ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-gray-700'}`}>
                {o}
              </button>
            ))}
            {filtered.length === 0 && <div className="text-xs text-gray-400 px-2.5 py-2">No matches</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const NAV = (badge) => [
  { href: '/coordinator/dashboard', label: 'Dashboard',    icon: '📊' },
  { href: '/coordinator/requests',  label: 'All Requests', icon: '📋' },
  { href: '/client/new',            label: 'New Request',  icon: '➕', badge },
]

export default function CoordinatorRequests() {
  const router = useRouter()
  const [profile, setProfile]       = useState(null)
  const [requests, setRequests]     = useState([])
  const [search, setSearch]         = useState('')
  const [colFilters, setColFilters] = useState(EMPTY_COL)
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [selected, setSelected]     = useState(null)
  const [docs, setDocs]             = useState([])
  const [printing, setPrinting]     = useState(false)
  const [acting, setActing]         = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'coordinator') { router.push('/'); return }
    setProfile(p)
    await load(p)
  }

  async function load(p) {
    const prof = p || profile
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*), request_documents(id)')
      .eq('company', prof.company)
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

  const setCol = (key, val) => setColFilters(prev => ({ ...prev, [key]: val }))
  const hasColFilters = Object.values(colFilters).some(Boolean)
  const uniqueVals = (key) => [...new Set(requests.map(r => r[key]).filter(Boolean))].sort()

  const filtered = requests.filter(r => {
    const matchSearch = !search || [r.request_no, r.company, r.location, r.ndt_method, r.requested_by_name, r.equipment_no]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
    const matchFrom   = !dateFrom || r.created_at?.slice(0,10) >= dateFrom
    const matchTo     = !dateTo   || r.created_at?.slice(0,10) <= dateTo
    const matchStatus = !colFilters.status   || r.status === colFilters.status
    const matchMethod = !colFilters.method   || r.ndt_method === colFilters.method
    const matchEquip  = !colFilters.equipment || (r.equipment_no || '').toLowerCase().includes(colFilters.equipment.toLowerCase())
    const matchLoc    = !colFilters.location  || (r.location || '').toLowerCase().includes(colFilters.location.toLowerCase())
    const matchCat    = !colFilters.category  || r.job_category === colFilters.category
    const matchBy     = !colFilters.requestedBy || r.requested_by_name === colFilters.requestedBy
    return matchSearch && matchFrom && matchTo && matchStatus && matchMethod && matchEquip && matchLoc && matchCat && matchBy
  })

  const awaitingReview = requests.filter(r => r.status === 'Draft report submitted').length

  return (
    <Layout profile={profile} nav={NAV(awaitingReview)}>
      {/* Header + filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold">All Requests <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <input className="input w-52 text-sm pl-8" placeholder="Search ID, company, method…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
          <input className="input text-xs py-1.5 w-32" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input className="input text-xs py-1.5 w-32" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          {(search || dateFrom || dateTo || hasColFilters) && (
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setColFilters(EMPTY_COL) }}
              className="text-xs text-blue-600">Clear all</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">ID</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Method</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Equipment</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Location</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Category</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Requested By</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap text-xs">Requested On</th>
              <th className="px-3 py-2"></th>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="px-2 py-1.5"></td>
              <td className="px-2 py-1.5">
                <SearchSelect value={colFilters.status} onChange={v => setCol('status', v)} options={NDT_STATUSES} />
              </td>
              <td className="px-2 py-1.5">
                <SearchSelect value={colFilters.method} onChange={v => setCol('method', v)} options={uniqueVals('ndt_method')} />
              </td>
              <td className="px-2 py-1.5">
                <input className={`w-full text-xs border rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 ${colFilters.equipment ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-500'}`}
                  placeholder="Search…" value={colFilters.equipment} onChange={e => setCol('equipment', e.target.value)} />
              </td>
              <td className="px-2 py-1.5">
                <input className={`w-full text-xs border rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 ${colFilters.location ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-500'}`}
                  placeholder="Search…" value={colFilters.location} onChange={e => setCol('location', e.target.value)} />
              </td>
              <td className="px-2 py-1.5">
                <select className={`w-full text-xs border rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 ${colFilters.category ? 'border-blue-400 text-blue-700 font-medium' : 'border-gray-200 text-gray-500'}`}
                  value={colFilters.category} onChange={e => setCol('category', e.target.value)}>
                  <option value="">All</option>
                  {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <SearchSelect value={colFilters.requestedBy} onChange={v => setCol('requestedBy', v)} options={uniqueVals('requested_by_name')} />
              </td>
              <td className="px-2 py-1.5"></td>
              <td className="px-2 py-1.5"></td>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r.id} onClick={() => openRequest(r)}
                className="hover:bg-blue-50/30 cursor-pointer transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-blue-700">{r.request_no}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 max-w-[180px]">
                  <span className="block truncate">{r.ndt_method}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{r.equipment_no || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 max-w-[200px]">
                  <span className="block truncate">{r.location || '—'}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-700">{r.job_category || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{r.requested_by_name || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{r.created_at?.slice(0,10)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">
                  {r.request_documents?.length > 0 && <span title="Has attachments">📎</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">No requests found.</div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && profile && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
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
              <div className="card"><NDTTimeline status={selected.status} /></div>

              {selected.status === 'Draft report submitted' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-indigo-800 mb-1">📋 Draft report ready for review</div>
                  <p className="text-xs text-indigo-600 mb-3">Download the report below. If satisfied, click Accept. If revisions are needed, click Reject.</p>
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus('Draft report accepted')} disabled={acting}
                      className="btn btn-success flex-1 justify-center text-xs">
                      {acting ? 'Updating…' : '✅ Accept draft report'}
                    </button>
                    <button onClick={() => updateStatus('NDT in progress')} disabled={acting}
                      className="btn btn-danger flex-1 justify-center text-xs">
                      {acting ? 'Updating…' : '✗ Reject — request revision'}
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'Draft report accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  ✅ Draft report accepted — Cutech NDT team will issue the final report.
                </div>
              )}

              {selected.status === 'Final report submitted' && (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800">
                  📄 Final report submitted — available for download below.
                </div>
              )}

              {selected.status === 'Closed' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  ✅ Request closed — all work complete.
                </div>
              )}

              <div className="card text-sm space-y-1.5">
                <div className="section-title">Site & scope</div>
                {[
                  ['Requested by', selected.requested_by_name],
                  ['Company',      selected.company],
                  ['Category',     selected.job_category],
                  ['Location',     selected.location],
                  ['Equipment',    selected.equipment_no],
                  ['Contact',      selected.contact_name],
                  ['Phone',        selected.contact_phone],
                  ['Method',       selected.ndt_method],
                  ['Scope',        selected.scope_qty],
                  ['Date needed',  selected.date_needed],
                  ['Priority',     selected.priority],
                  ['Description',  selected.description],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              {selected.step2_complete && (
                <div className="card text-sm space-y-1.5">
                  <div className="section-title">Technical details</div>
                  {[
                    ['Material',   selected.material],
                    ['Thickness',  selected.thickness_mm ? selected.thickness_mm + ' mm' : null],
                    ['Pipe size',  selected.pipe_size],
                    ['P-Number',   selected.p_number],
                    ['Code',       selected.code_standard],
                    ['Acceptance', selected.acceptance],
                    ['Notes',      selected.special_notes],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-400 w-24 shrink-0">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

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

              <div className="card">
                <DocumentUpload requestId={selected.id} profile={profile} fileType="document"
                  label="Supporting documents" existingDocs={docs} onUploaded={reloadDocs} />
              </div>

              {['Draft report submitted','Draft report accepted','Final report submitted','Reinstatement in progress','Closed'].includes(selected.status) && (
                <div className="card">
                  <DocumentUpload requestId={selected.id} profile={profile} fileType="report"
                    label="NDT Report" existingDocs={docs} onUploaded={reloadDocs} />
                </div>
              )}

              {selected.scheduled_date && (
                <div className="card text-sm space-y-1.5">
                  <div className="section-title">Scheduling</div>
                  {[
                    ['Date',       selected.scheduled_date],
                    ['Technician', selected.tech_name],
                    ['Notes',      selected.manager_notes],
                  ].map(([k, v]) => v && (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-400 w-24 shrink-0">{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <RequestComments requestId={selected.id} profile={profile} />

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

      {printing && selected && (
        <PrintRequest request={{ ...selected, support_jobs: selected.support_jobs || [] }}
          docs={docs} onClose={() => setPrinting(false)} />
      )}
    </Layout>
  )
}
