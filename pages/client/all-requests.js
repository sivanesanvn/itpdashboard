import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, JOB_CATEGORIES } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'
import RequestComments from '../../components/RequestComments'
import MethodSelect from '../../components/MethodSelect'

const NAV = [
  { href: '/client/requests',     label: 'Dashboard',    icon: '📊' },
  { href: '/client/all-requests', label: 'All Requests', icon: '📋' },
  { href: '/client/schedule',     label: 'Schedule',     icon: '📅' },
  { href: '/client/new',          label: 'New Request',  icon: '➕' },
]

export default function ClientAllRequests() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [user, setUser]         = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const [docs, setDocs]         = useState([])
  const [printing, setPrinting] = useState(false)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('All')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [acting, setActing]     = useState(false)
  const [editMode, setEditMode]   = useState(false)
  const [editForm, setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p); setUser(u)
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*), request_documents(id)')
      .eq('client_id', u.id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  async function openRequest(r) {
    setSelected(r)
    setEditMode(false)
    setSuccessMsg('')
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

  function startEdit() {
    setEditForm({
      location:         selected.location         || '',
      equipment_no:     selected.equipment_no     || '',
      contact_name:     selected.contact_name     || '',
      contact_phone:    selected.contact_phone    || '',
      ndt_method:       selected.ndt_method       || '',
      scope_qty:        selected.scope_qty        || '',
      description:      selected.description      || '',
      date_needed:      selected.date_needed      || '',
      priority:         selected.priority         || 'Normal',
      job_category:     selected.job_category     || '',
      high_temp:        selected.high_temp        || false,
      needs_scaffold:   selected.needs_scaffold   || false,
      needs_insulation: selected.needs_insulation || false,
      needs_painting:   selected.needs_painting   || false,
      material:         selected.material         || '',
      thickness_mm:     selected.thickness_mm     || '',
      pipe_size:        selected.pipe_size        || '',
      p_number:         selected.p_number         || '',
      code_standard:    selected.code_standard    || '',
      acceptance:       selected.acceptance       || '',
      special_notes:    selected.special_notes    || '',
    })
    setEditMode(true)
  }

  async function saveEdit() {
    if (!editForm.location || !editForm.ndt_method || !editForm.date_needed) {
      alert('Location, NDT method, and date needed are required.')
      return
    }
    setEditSaving(true)
    const wasScheduled = selected.status === 'Scheduled'

    const { error } = await supabase.from('requests').update({
      location:         editForm.location,
      equipment_no:     editForm.equipment_no,
      contact_name:     editForm.contact_name,
      contact_phone:    editForm.contact_phone,
      ndt_method:       editForm.ndt_method,
      scope_qty:        editForm.scope_qty,
      description:      editForm.description,
      date_needed:      editForm.date_needed,
      priority:         editForm.priority,
      job_category:     editForm.job_category,
      high_temp:        editForm.high_temp,
      needs_scaffold:   editForm.needs_scaffold,
      needs_insulation: editForm.needs_insulation,
      needs_painting:   editForm.needs_painting,
      material:         editForm.material,
      thickness_mm:     editForm.thickness_mm,
      pipe_size:        editForm.pipe_size,
      p_number:         editForm.p_number,
      code_standard:    editForm.code_standard,
      acceptance:       editForm.acceptance,
      special_notes:    editForm.special_notes,
    }).eq('id', selected.id)

    if (error) { alert('Error saving: ' + error.message); setEditSaving(false); return }

    if (wasScheduled) {
      await fetch('/api/notify-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestNo:     selected.request_no,
          company:       selected.company,
          method:        editForm.ndt_method,
          location:      editForm.location,
          clientName:    profile.full_name,
          scheduledDate: selected.scheduled_date,
        }),
      })
    }

    const updated = { ...selected, ...editForm }
    setSelected(updated)
    setRequests(prev => prev.map(r => r.id === selected.id ? updated : r))
    setEditMode(false)
    setEditSaving(false)
    setSuccessMsg(wasScheduled
      ? 'Request updated. The NDT Manager has been notified to reschedule.'
      : 'Request updated successfully.')
    setTimeout(() => setSuccessMsg(''), 6000)
  }

  const filtered = requests.filter(r => {
    const matchStatus   = filter === 'All' || r.status === filter
    const matchSearch   = !search || [r.request_no, r.company, r.location, r.ndt_method, r.requested_by_name, r.equipment_no]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
    const matchCategory = !category || r.job_category === category
    const matchFrom     = !dateFrom || r.created_at?.slice(0,10) >= dateFrom
    const matchTo       = !dateTo   || r.created_at?.slice(0,10) <= dateTo
    return matchStatus && matchSearch && matchCategory && matchFrom && matchTo
  })

  return (
    <Layout profile={profile} nav={NAV}>
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h1 className="text-xl font-bold">All Requests</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <input className="input w-52 text-sm pl-8" placeholder="Search ID, method, location…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
          <select className="input text-xs py-1.5 w-36" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input text-xs py-1.5 w-32" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input className="input text-xs py-1.5 w-32" type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)} />
          {(category || dateFrom || dateTo) && (
            <button onClick={() => { setCategory(''); setDateFrom(''); setDateTo('') }}
              className="text-xs text-blue-600">Clear</button>
          )}
        </div>
      </div>

      {/* Status pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {['All', ...NDT_STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap
              ${filter === s ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s} ({s === 'All' ? requests.length : requests.filter(r => r.status === s).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Requested By</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Method</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Location</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Equipment</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Requested On</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r.id} onClick={() => openRequest(r)}
                className="hover:bg-blue-50/30 cursor-pointer transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-blue-700">{r.request_no}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{r.requested_by_name || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 max-w-[180px]">
                  <span className="block truncate">{r.ndt_method}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap font-medium text-gray-700">{r.job_category || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-500 max-w-[200px]">
                  <span className="block truncate">{r.location || '—'}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{r.equipment_no || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-400">{r.created_at?.slice(0,10)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge status={r.status} /></td>
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
                {['New request','Scheduled'].includes(selected.status) && !editMode && (
                  <button onClick={startEdit} className="btn btn-ghost text-xs">✏️ Edit</button>
                )}
                {editMode && (
                  <button onClick={() => setEditMode(false)} className="btn btn-ghost text-xs text-gray-500">Cancel</button>
                )}
                {!editMode && <button onClick={() => setPrinting(true)} className="btn btn-ghost text-xs">🖨️ Print</button>}
                <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl leading-none">×</button>
              </div>
            </div>

            {successMsg && (
              <div className="mx-5 mt-4 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-800 font-medium">
                ✅ {successMsg}
              </div>
            )}

            {/* Edit form */}
            {editMode && (
              <div className="p-5 space-y-4">
                {selected.status === 'Scheduled' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                    ⚠ This request is already scheduled. Saving changes will notify the NDT Manager to reschedule.
                  </div>
                )}
                <div className="card">
                  <div className="section-title">📍 Site information</div>
                  <label className="label text-xs">Location *</label>
                  <input className="input text-sm" value={editForm.location}
                    onChange={e => setEditForm(f => ({...f, location: e.target.value}))} />
                  <label className="label text-xs">Equipment / piping number</label>
                  <input className="input text-sm" value={editForm.equipment_no}
                    onChange={e => setEditForm(f => ({...f, equipment_no: e.target.value}))} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Contact person</label>
                      <input className="input text-sm" value={editForm.contact_name}
                        onChange={e => setEditForm(f => ({...f, contact_name: e.target.value}))} />
                    </div>
                    <div>
                      <label className="label text-xs">Phone</label>
                      <input className="input text-sm" value={editForm.contact_phone}
                        onChange={e => setEditForm(f => ({...f, contact_phone: e.target.value}))} />
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">🔍 NDT scope</div>
                  <label className="label text-xs">Job category</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {['Meridium','Turn Around','Ad-Hoc'].map(cat => (
                      <label key={cat} className={`flex items-center justify-center cursor-pointer p-2 rounded-lg border-2 text-xs font-medium
                        ${editForm.job_category === cat ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                        <input type="radio" name="edit-cat" value={cat} checked={editForm.job_category === cat}
                          onChange={() => setEditForm(f => ({...f, job_category: cat}))} className="hidden" />
                        {cat}
                      </label>
                    ))}
                  </div>
                  <label className="label text-xs">NDT method *</label>
                  <MethodSelect value={editForm.ndt_method} onChange={v => setEditForm(f => ({...f, ndt_method: v}))} />
                  <label className="label text-xs">Estimated quantity</label>
                  <input className="input text-sm" value={editForm.scope_qty}
                    onChange={e => setEditForm(f => ({...f, scope_qty: e.target.value}))} />
                  <label className="label text-xs">Description</label>
                  <textarea className="input text-sm" rows={3} value={editForm.description}
                    onChange={e => setEditForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div className="card">
                  <div className="section-title">📅 Scheduling</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Date needed *</label>
                      <input className="input text-sm" type="date" value={editForm.date_needed}
                        onChange={e => setEditForm(f => ({...f, date_needed: e.target.value}))} />
                    </div>
                    <div>
                      <label className="label text-xs">Priority</label>
                      <select className="input text-sm" value={editForm.priority}
                        onChange={e => setEditForm(f => ({...f, priority: e.target.value}))}>
                        <option>Normal</option><option>Urgent</option><option>Shutdown / turnaround</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="section-title">🏗️ Support work</div>
                  {[
                    { key: 'needs_scaffold',    icon: '🏗️', label: 'Scaffold erection / dismantling' },
                    { key: 'needs_insulation',  icon: '🧱', label: 'Insulation removal & reinstatement' },
                    { key: 'needs_painting',    icon: '🎨', label: 'Painting / surface preparation' },
                  ].map(({ key, icon, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 mt-1">
                      <input type="checkbox" checked={editForm[key]}
                        onChange={e => setEditForm(f => ({...f, [key]: e.target.checked}))}
                        className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm">{icon} {label}</span>
                    </label>
                  ))}
                </div>
                <div className="card">
                  <div className="section-title">🔩 Technical details (optional)</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Material',    'material',      'e.g. Carbon steel pipe'],
                      ['Thickness mm','thickness_mm',  'e.g. 12.7'],
                      ['Pipe size',   'pipe_size',     'e.g. 6" NB'],
                      ['P-Number',    'p_number',      'e.g. P1'],
                      ['Code',        'code_standard', 'e.g. ASME B31.3'],
                      ['Acceptance',  'acceptance',    'e.g. No linear indications'],
                    ].map(([label, key, ph]) => (
                      <div key={key}>
                        <label className="label text-xs">{label}</label>
                        <input className="input text-sm" placeholder={ph} value={editForm[key]}
                          onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))} />
                      </div>
                    ))}
                  </div>
                  <label className="label text-xs">Special notes</label>
                  <textarea className="input text-sm" rows={3} value={editForm.special_notes}
                    onChange={e => setEditForm(f => ({...f, special_notes: e.target.value}))} />
                </div>
                <div className="flex gap-3 pb-2">
                  <button onClick={() => setEditMode(false)} className="btn btn-ghost flex-1 justify-center text-sm">Cancel</button>
                  <button onClick={saveEdit} disabled={editSaving} className="btn btn-primary flex-1 justify-center text-sm">
                    {editSaving ? 'Saving…' : selected.status === 'Scheduled' ? '💾 Save & notify manager' : '💾 Save changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Detail view */}
            {!editMode && (
              <div className="p-5 space-y-4">
                <div className="card"><NDTTimeline status={selected.status} /></div>

                {selected.status === 'Draft Report Submitted' && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <div className="text-sm font-semibold text-indigo-800 mb-1">📋 Draft report ready for review</div>
                    <p className="text-xs text-indigo-600 mb-3">Download the report below. If satisfied, click Accept.</p>
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

                <div className="card text-sm space-y-1.5">
                  <div className="section-title">Site & scope</div>
                  {[
                    ['Requested by', selected.requested_by_name],
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
                <div className="card">
                  <DocumentUpload requestId={selected.id} profile={profile} fileType="report"
                    label="NDT Report" existingDocs={docs} onUploaded={reloadDocs} />
                </div>

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

                {['New request','Scheduled'].includes(selected.status) && (
                  <button onClick={cancelRequest} disabled={acting}
                    className="w-full text-xs text-red-500 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-colors">
                    ✕ Cancel this request
                  </button>
                )}

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
            )}
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
