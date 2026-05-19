import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'

const SCAFFOLD_STEPS = ['Erection','Ready to use','Dismantle','Completed']
const STEP_COLOR = {
  'Pending':      'bg-gray-100 text-gray-500',
  'Erection':     'bg-orange-100 text-orange-700',
  'Ready to use': 'bg-green-100 text-green-700',
  'Dismantle':    'bg-red-100 text-red-700',
  'Completed':    'bg-gray-200 text-gray-600',
}

export default function ScaffoldJobs() {
  const supabase = useSupabaseClient()
  const user     = useUser()
  const router   = useRouter()

  const [profile, setProfile] = useState(null)
  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [noteModal, setNoteModal] = useState(null)
  const [noteText,  setNoteText]  = useState('')

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.role !== 'scaffold') { router.push('/'); return }
    setProfile(prof)

    // Get scaffold_requests assigned to this contractor, join with requests
    const { data } = await supabase
      .from('scaffold_requests')
      .select(`*, requests(request_no, company, location, ndt_method, status, date_needed)`)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false })

    setJobs(data ?? [])
    setLoading(false)
  }

  async function updateScaffoldStatus(scaffoldId, newStatus) {
    setSaving(true)
    const dateField = {
      'Erection':     'erection_date',
      'Ready to use': 'ready_date',
      'Dismantle':    'dismantle_date',
    }[newStatus]

    const updates = { status: newStatus }
    if (dateField) updates[dateField] = new Date().toISOString().slice(0,10)

    await supabase.from('scaffold_requests').update(updates).eq('id', scaffoldId)
    setSaving(false)
    load()
  }

  async function saveNote() {
    setSaving(true)
    await supabase.from('scaffold_requests').update({ contractor_notes: noteText }).eq('id', noteModal.id)
    setSaving(false)
    setNoteModal(null)
    load()
  }

  if (loading || !profile) return <div className="flex items-center justify-center h-screen text-sm text-gray-400">Loading…</div>

  const active   = jobs.filter(j => !['Completed'].includes(j.status))
  const complete = jobs.filter(j => j.status === 'Completed')

  return (
    <Layout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-1">My scaffold jobs</h2>
        <p className="text-sm text-gray-400 mb-5">{profile.company}</p>

        {jobs.length === 0 && (
          <div className="card text-center py-10 text-gray-400 text-sm">No scaffold jobs assigned yet.</div>
        )}

        {active.length > 0 && (
          <>
            <div className="section-title">Active</div>
            {active.map(j => (
              <div key={j.id} className="card mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{j.requests?.request_no}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STEP_COLOR[j.status]}`}>
                        🏗 {j.status}
                      </span>
                    </div>
                    <div className="font-medium text-sm mt-1">{j.requests?.company}</div>
                    <div className="text-xs text-gray-500">{j.requests?.location}</div>
                    {j.reason && <div className="text-xs text-gray-400 mt-0.5">Reason: {j.reason}</div>}
                  </div>
                  <StatusBadge status={j.requests?.status} />
                </div>

                {/* Scaffold stage tracker */}
                <div className="flex items-center gap-0 my-3">
                  {SCAFFOLD_STEPS.map((s, i) => {
                    const cur  = SCAFFOLD_STEPS.indexOf(j.status === 'Pending' ? '' : j.status)
                    const done = i < cur, active = i === cur
                    return (
                      <div key={s} className="flex-1 flex flex-col items-center relative">
                        {i < SCAFFOLD_STEPS.length - 1 && (
                          <div className={`absolute top-[8px] left-1/2 w-full h-px ${done ? 'bg-orange-400' : 'bg-gray-200'} z-0`} />
                        )}
                        <div className={`relative z-10 w-4 h-4 rounded-full border-2 flex items-center justify-center
                          ${done ? 'bg-orange-400 border-orange-400' : active ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-300'}`}>
                          {done && <span className="text-white text-[8px]">✓</span>}
                          {active && <div className="w-1 h-1 rounded-full bg-white" />}
                        </div>
                        <div className={`text-[9px] mt-1 text-center max-w-[50px] leading-tight
                          ${done || active ? 'text-orange-700' : 'text-gray-400'}`}>{s}</div>
                      </div>
                    )
                  })}
                </div>

                {j.contractor_notes && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2">Note: {j.contractor_notes}</div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {j.status === 'Pending' && (
                    <button className="btn btn-primary btn-sm" onClick={() => updateScaffoldStatus(j.id,'Erection')} disabled={saving}>
                      Start erection
                    </button>
                  )}
                  {j.status === 'Erection' && (
                    <button className="btn btn-success btn-sm" onClick={() => updateScaffoldStatus(j.id,'Ready to use')} disabled={saving}>
                      ✓ Mark ready to use
                    </button>
                  )}
                  {j.status === 'Ready to use' && (
                    <button className="btn btn-sm" onClick={() => updateScaffoldStatus(j.id,'Dismantle')} disabled={saving}>
                      Begin dismantle
                    </button>
                  )}
                  {j.status === 'Dismantle' && (
                    <button className="btn btn-sm" onClick={() => updateScaffoldStatus(j.id,'Completed')} disabled={saving}>
                      ✓ Mark completed
                    </button>
                  )}
                  <button className="btn btn-xs" onClick={() => { setNoteModal(j); setNoteText(j.contractor_notes||'') }}>
                    Add note
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {complete.length > 0 && (
          <>
            <div className="section-title mt-4">Completed</div>
            {complete.map(j => (
              <div key={j.id} className="card mb-2 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{j.requests?.request_no}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STEP_COLOR['Completed']}`}>Completed</span>
                  </div>
                  <div className="text-sm font-medium mt-0.5">{j.requests?.company}</div>
                  <div className="text-xs text-gray-400">{j.reason}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-semibold mb-3">Add note — {noteModal.requests?.request_no}</h3>
            <textarea className="input" rows={3} value={noteText} onChange={e=>setNoteText(e.target.value)}
              placeholder="e.g. Scaffold ready on east face, PTW submitted" />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNote} disabled={saving}>Save note</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
