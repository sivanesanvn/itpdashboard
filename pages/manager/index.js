import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '../../components/Layout'
import { StatusBadge, PriorityBadge, ScaffoldBadge } from '../../components/StatusBadge'
import Link from 'next/link'

export default function ManagerDashboard() {
  const supabase = useSupabaseClient()
  const user     = useUser()
  const router   = useRouter()

  const [profile,   setProfile]   = useState(null)
  const [requests,  setRequests]  = useState([])
  const [techs,     setTechs]     = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    const [{ data: prof }, { data: reqs }, { data: techList }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('requests_overview').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'tech'),
    ])
    if (prof?.role !== 'manager') { router.push('/'); return }
    setProfile(prof)
    setRequests(reqs ?? [])
    setTechs(techList ?? [])
    setLoading(false)
  }

  // Schedule modal state
  const [schedModal, setSchedModal] = useState(null) // request object
  const [schedDate,  setSchedDate]  = useState('')
  const [schedTech,  setSchedTech]  = useState('')
  const [schedNotes, setSchedNotes] = useState('')
  const [saving,     setSaving]     = useState(false)

  function openSched(req) {
    setSchedModal(req)
    setSchedDate(req.date_needed ?? '')
    setSchedTech(req.tech_id ?? '')
    setSchedNotes(req.manager_notes ?? '')
  }

  async function confirmSchedule() {
    if (!schedDate || !schedTech) return
    setSaving(true)
    await supabase.from('requests').update({
      status: 'Scheduled',
      scheduled_date: schedDate,
      tech_id: schedTech,
      manager_notes: schedNotes,
    }).eq('id', schedModal.id)
    setSchedModal(null)
    setSaving(false)
    loadAll()
  }

  if (loading) return <LoadingScreen />

  const newReqs     = requests.filter(r => r.status === 'New request')
  const activeReqs  = requests.filter(r => ['Scheduled','On-going'].includes(r.status))
  const doneReqs    = requests.filter(r => ['Site work completed','Report submitted','Report accepted'].includes(r.status))

  return (
    <Layout profile={profile} newCount={newReqs.length}>
      <div className="p-6 max-w-5xl mx-auto">
        <h2 className="text-lg font-semibold mb-5">Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'New requests', value: newReqs.length,    color: 'text-blue-700' },
            { label: 'Scheduled',    value: requests.filter(r=>r.status==='Scheduled').length, color: 'text-purple-700' },
            { label: 'On-going',     value: requests.filter(r=>r.status==='On-going').length,  color: 'text-amber-700' },
            { label: 'Completed',    value: doneReqs.length,   color: 'text-teal-700' },
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* New requests — action required */}
        <div className="card mb-4">
          <div className="section-title">⚡ Action required — new requests</div>
          {newReqs.length === 0 ? (
            <p className="text-sm text-gray-400">No pending requests.</p>
          ) : newReqs.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{r.request_no}</span>
                  <span className="text-sm font-medium">{r.company}</span>
                  <PriorityBadge priority={r.priority} />
                  {r.scaffold_required && <span className="text-xs text-orange-600">🏗 Scaffold needed</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{r.ndt_method} · {r.location} · Needed by {r.date_needed}</div>
                {!r.step2_complete && (
                  <div className="text-xs text-amber-600 mt-0.5">⚠ Technical details not yet filled</div>
                )}
              </div>
              <button className="btn btn-primary btn-sm flex-shrink-0" onClick={() => openSched(r)}>
                Schedule
              </button>
            </div>
          ))}
        </div>

        {/* Active jobs */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="section-title mb-0">Active jobs</div>
            <Link href="/manager/requests" className="text-xs text-blue-600 hover:underline">View all →</Link>
          </div>
          {activeReqs.length === 0 ? (
            <p className="text-sm text-gray-400">No active jobs.</p>
          ) : activeReqs.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-mono">{r.request_no}</span>
                  <span className="text-sm font-medium">{r.company}</span>
                  <StatusBadge status={r.status} />
                  {r.scaffold_status && <ScaffoldBadge status={r.scaffold_status} />}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {r.ndt_method} · {r.tech_name ?? 'Unassigned'} · {r.scheduled_date}
                </div>
              </div>
              <Link href={`/manager/requests?id=${r.id}`} className="btn btn-sm text-xs">Details</Link>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Modal */}
      {schedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-1">Schedule — {schedModal.request_no}</h3>
            <p className="text-sm text-gray-500 mb-4">{schedModal.company} · {schedModal.ndt_method}</p>

            <label className="label">Confirm date</label>
            <input type="date" className="input" value={schedDate} onChange={e=>setSchedDate(e.target.value)} />

            <label className="label">Assign technician</label>
            <select className="input" value={schedTech} onChange={e=>setSchedTech(e.target.value)}>
              <option value="">Select technician…</option>
              {techs.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} — {t.cert}</option>
              ))}
            </select>

            <label className="label">Manager notes (optional)</label>
            <textarea className="input" rows={2} value={schedNotes} onChange={e=>setSchedNotes(e.target.value)}
              placeholder="Instructions for technician…" />

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn" onClick={() => setSchedModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmSchedule} disabled={saving || !schedDate || !schedTech}>
                {saving ? 'Saving…' : 'Confirm schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-sm text-gray-400">Loading…</div>
    </div>
  )
}
