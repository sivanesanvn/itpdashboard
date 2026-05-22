import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES, PRIORITY_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'

export default function ManagerDashboard() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [requests, setRequests] = useState([])
  const [techs, setTechs]       = useState([])
  const [contractors, setContractors] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null) // { type, request }

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    await Promise.all([fetchRequests(), fetchTechs()])
    setLoading(false)
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*)')
      .order('created_at', { ascending: false })
    setRequests(data || [])
  }

  async function fetchTechs() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['tech', 'scaffold', 'insulation', 'painting'])
    const all = data || []
    setTechs(all.filter(t => t.role === 'tech'))
    setContractors(all.filter(t => ['scaffold','insulation','painting'].includes(t.role)))
  }

  async function scheduleRequest({ requestId, techId, techName, date, notes, supportJobs }) {
    // Update main request
    await supabase.from('requests').update({
      status: 'Scheduled',
      tech_id: techId,
      tech_name: techName,
      scheduled_date: date,
      manager_notes: notes,
    }).eq('id', requestId)

    // Create support jobs for scaffold/insulation/painting if flagged
    for (const sj of supportJobs) {
      if (sj.enabled) {
        await supabase.from('support_jobs').insert({
          request_id: requestId,
          job_type: sj.type,
          contractor_id: sj.contractorId || null,
          contractor_name: sj.contractorName || null,
          contractor_role: sj.role,
          status: 'Pending',
        })
      }
    }
    await fetchRequests()
    setModal(null)
  }

  async function updateStatus(requestId, newStatus) {
    await supabase.from('requests').update({ status: newStatus }).eq('id', requestId)
    await fetchRequests()
    setModal(null)
  }

  const newCount     = requests.filter(r => r.status === 'New request').length
  const activeCount  = requests.filter(r => ['Scheduled','On-going'].includes(r.status)).length
  const doneCount    = requests.filter(r => ['Site work completed','Report submitted','Report accepted'].includes(r.status)).length
  const pendingDetail = requests.filter(r => !r.step2_complete && r.status === 'New request')

  const nav = [
    { href: '/manager/dashboard', label: 'Dashboard', icon: '📊', badge: newCount },
    { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
    { href: '/manager/schedule',  label: 'Schedule', icon: '📅' },
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={nav}>
      <h1 className="text-xl font-bold mb-5">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'New requests', value: newCount, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Active jobs',  value: activeCount, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Completed',    value: doneCount, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Total',        value: requests.length, color: 'text-gray-700', bg: 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`card ${s.bg} border-0`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action required */}
      <div className="card mb-5">
        <div className="section-title">⚡ Action required — New requests</div>
        {requests.filter(r => r.status === 'New request').length === 0
          ? <p className="text-sm text-gray-400">No new requests. All clear!</p>
          : requests.filter(r => r.status === 'New request').map(r => (
            <div key={r.id} className="flex items-center gap-3 py-3 border-b last:border-0 border-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.request_no}</span>
                  <span className="text-gray-500 text-sm">·</span>
                  <span className="text-sm">{r.company}</span>
                  {r.priority !== 'Normal' && (
                    <span className={`badge ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>
                  )}
                  {!r.step2_complete && (
                    <span className="badge bg-amber-100 text-amber-700">Details pending</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {r.ndt_method} · {r.location} · Needed: {r.date_needed}
                </div>
                {/* Support flags */}
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {r.needs_scaffold    && <span className="badge bg-orange-100 text-orange-700">🏗️ Scaffold</span>}
                  {r.needs_insulation  && <span className="badge bg-yellow-100 text-yellow-700">🧱 Insulation</span>}
                  {r.needs_painting    && <span className="badge bg-pink-100 text-pink-700">🎨 Painting</span>}
                </div>
              </div>
              <button className="btn btn-primary text-xs whitespace-nowrap"
                onClick={() => setModal({ type: 'schedule', request: r })}>
                📅 Schedule
              </button>
            </div>
          ))
        }
      </div>

      {/* Today's active jobs */}
      <div className="card">
        <div className="section-title">🔧 Active jobs</div>
        {requests.filter(r => ['Scheduled','On-going'].includes(r.status)).length === 0
          ? <p className="text-sm text-gray-400">No active jobs today.</p>
          : requests.filter(r => ['Scheduled','On-going'].includes(r.status)).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 border-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.request_no}</span>
                  <span className="text-gray-400 text-sm">{r.company}</span>
                </div>
                <div className="text-xs text-gray-400">{r.ndt_method} · {r.tech_name || 'Unassigned'} · {r.scheduled_date}</div>
                {/* Support job statuses */}
                {r.support_jobs?.map(sj => (
                  <div key={sj.id} className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">{sj.job_type}:</span>
                    <StatusBadge status={sj.status} />
                  </div>
                ))}
              </div>
              <StatusBadge status={r.status} />
              <button className="btn btn-ghost text-xs" onClick={() => setModal({ type: 'status', request: r })}>
                Update
              </button>
            </div>
          ))
        }
      </div>

      {/* Schedule modal */}
      {modal?.type === 'schedule' && (
        <ScheduleModal
          request={modal.request}
          techs={techs}
          contractors={contractors}
          onConfirm={scheduleRequest}
          onClose={() => setModal(null)}
        />
      )}

      {/* Status update modal */}
      {modal?.type === 'status' && (
        <StatusModal
          request={modal.request}
          onConfirm={updateStatus}
          onClose={() => setModal(null)}
        />
      )}
    </Layout>
  )
}

// ── Schedule Modal ────────────────────────────────────────────
function ScheduleModal({ request, techs, contractors, onConfirm, onClose }) {
  const [date, setDate]         = useState(request.date_needed || '')
  const [techName, setTechName] = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)

  // Support job state
  const [scaffold, setScaffold]     = useState({ enabled: request.needs_scaffold, contractorId: '', contractorName: '' })
  const [insulation, setInsulation] = useState({ enabled: request.needs_insulation, contractorId: '', contractorName: '' })
  const [painting, setPainting]     = useState({ enabled: request.needs_painting, contractorId: '', contractorName: '' })

  // Match typed name to a profile id if possible
  function findTechId(name) {
    const match = techs.find(t => t.full_name.toLowerCase() === name.toLowerCase())
    return match ? match.id : null
  }

  async function submit() {
    if (!date || !techName.trim()) { alert('Please enter a date and technician name.'); return }
    setSaving(true)
    await onConfirm({
      requestId: request.id,
      techId: findTechId(techName) || null,
      techName: techName.trim(),
      date, notes,
      supportJobs: [
        { ...scaffold,   type: 'Scaffold',            role: 'scaffold' },
        { ...insulation, type: 'Insulation Removal',  role: 'insulation' },
        { ...painting,   type: 'Painting',             role: 'painting' },
      ]
    })
  }

  const scaffoldContractors   = contractors.filter(c => c.role === 'scaffold')
  const insulationContractors = contractors.filter(c => c.role === 'insulation')
  const paintingContractors   = contractors.filter(c => c.role === 'painting')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-base">📅 Schedule — {request.request_no}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{request.company} · {request.ndt_method} · {request.location}</p>
        </div>
        <div className="p-5 space-y-4">
          {/* NDT scheduling */}
          <div>
            <div className="section-title">NDT job</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Schedule date</label>
                <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Technician name</label>
                <input
                  className="input"
                  list="tech-suggestions"
                  placeholder="Type technician name…"
                  value={techName}
                  onChange={e => setTechName(e.target.value)}
                />
                <datalist id="tech-suggestions">
                  {techs.map(t => <option key={t.id} value={t.full_name} />)}
                </datalist>
              </div>
            </div>
            <label className="label">Manager notes</label>
            <textarea className="input" rows={2} placeholder="Instructions for the technician…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Support jobs */}
          {(request.needs_scaffold || request.needs_insulation || request.needs_painting) && (
            <div>
              <div className="section-title">Support work (from client request)</div>

              {request.needs_scaffold && (
                <SupportJobRow
                  icon="🏗️" label="Scaffold" enabled={scaffold.enabled}
                  contractors={scaffoldContractors}
                  onToggle={v => setScaffold(p => ({ ...p, enabled: v }))}
                  onPick={val => pickContractor(val, setScaffold)}
                />
              )}
              {request.needs_insulation && (
                <SupportJobRow
                  icon="🧱" label="Insulation Removal" enabled={insulation.enabled}
                  contractors={insulationContractors}
                  onToggle={v => setInsulation(p => ({ ...p, enabled: v }))}
                  onPick={val => pickContractor(val, setInsulation)}
                />
              )}
              {request.needs_painting && (
                <SupportJobRow
                  icon="🎨" label="Painting" enabled={painting.enabled}
                  contractors={paintingContractors}
                  onToggle={v => setPainting(p => ({ ...p, enabled: v }))}
                  onPick={val => pickContractor(val, setPainting)}
                />
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : '✅ Confirm schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SupportJobRow({ icon, label, enabled, contractors, onToggle, onPick }) {
  const listId = `contractors-${label.replace(/\s+/g,'-')}`
  return (
    <div className="border border-gray-100 rounded-lg p-3 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)}
          className="rounded" id={`chk-${label}`} />
        <label htmlFor={`chk-${label}`} className="text-sm font-medium cursor-pointer">
          {icon} {label}
        </label>
      </div>
      {enabled && (
        <>
          <input
            className="input text-xs"
            list={listId}
            placeholder={`Type ${label} contractor name (optional)…`}
            onChange={e => onPick(e.target.value)}
          />
          <datalist id={listId}>
            {contractors.map(c => <option key={c.id} value={c.full_name} />)}
          </datalist>
        </>
      )}
    </div>
  )
}

function StatusModal({ request, onConfirm, onClose }) {
  const { NDT_STATUSES } = require('../../lib/supabase')
  const current = NDT_STATUSES.indexOf(request.status)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-base">Update status — {request.request_no}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{request.company}</p>
        </div>
        <div className="p-4 space-y-2">
          {NDT_STATUSES.map((s, i) => {
            const isCurrent = s === request.status
            const isPast = i < current
            return (
              <button key={s}
                onClick={() => !isCurrent && onConfirm(request.id, s)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors
                  ${isCurrent ? 'bg-blue-50 border-blue-200 text-blue-800 font-semibold cursor-default'
                  : isPast ? 'border-gray-100 text-gray-400 cursor-pointer hover:bg-gray-50'
                  : 'border-gray-200 hover:bg-gray-50 cursor-pointer'}`}>
                {isCurrent ? '▶ ' : ''}{s}
              </button>
            )
          })}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
