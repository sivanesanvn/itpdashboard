import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, SUPPORT_STATUSES, ROLE_LABEL } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'

// Status sequences per job type
const NEXT_STATUS = {
  Scaffold: {
    'Pending':       'Erection',
    'Erection':      'Ready to use',
    'Ready to use':  'Dismantling',
    'Dismantling':   'Completed',
  },
  'Insulation Removal': {
    'Pending':       'In progress',
    'In progress':   'Ready to use',
    'Ready to use':  'Completed',
  },
  Painting: {
    'Pending':       'In progress',
    'In progress':   'Completed',
  },
}

const TYPE_ICON = { Scaffold: '🏗️', 'Insulation Removal': '🧱', Painting: '🎨' }

export default function ContractorJobs() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [user, setUser]         = useState(null)
  const [jobs, setJobs]         = useState([])
  const [saving, setSaving]     = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['scaffold','insulation','painting'].includes(p.role)) { router.push('/'); return }
    setProfile(p); setUser(u)
    await load(u.id)
  }

  async function load(uid) {
    const { data } = await supabase
      .from('support_jobs')
      .select('*, requests(request_no, company, location, ndt_method, scheduled_date, status)')
      .eq('contractor_id', uid)
      .order('created_at', { ascending: false })
    setJobs(data || [])
  }

  async function advance(job) {
    const seq = NEXT_STATUS[job.job_type] || {}
    const next = seq[job.status]
    if (!next) return
    setSaving(job.id)
    await supabase.from('support_jobs').update({ status: next }).eq('id', job.id)
    await load(user.id)
    setSaving(null)
  }

  async function addNote(job) {
    const note = prompt('Add a note for this job:', job.notes || '')
    if (note === null) return
    await supabase.from('support_jobs').update({ notes: note }).eq('id', job.id)
    await load(user.id)
  }

  const active   = jobs.filter(j => j.status !== 'Completed')
  const completed = jobs.filter(j => j.status === 'Completed')

  const nav = [{ href: '/contractor/jobs', label: 'My Jobs', icon: TYPE_ICON[jobs[0]?.job_type] || '🏗️', badge: active.length }]

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={nav}>
      <h1 className="text-xl font-bold mb-1">My Jobs</h1>
      <p className="text-sm text-gray-400 mb-5">{ROLE_LABEL[profile.role]} — update your job status below</p>

      {jobs.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">{TYPE_ICON[profile.role === 'scaffold' ? 'Scaffold' : profile.role === 'insulation' ? 'Insulation Removal' : 'Painting']}</div>
          <p>No jobs assigned to you yet.</p>
          <p className="text-xs mt-1">Your NDT manager will assign jobs when needed.</p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="section-title">Active jobs</div>
          <div className="space-y-3 mb-6">
            {active.map(j => {
              const req = j.requests
              const seq = NEXT_STATUS[j.job_type] || {}
              const nextStatus = seq[j.status]
              const statuses = SUPPORT_STATUSES[j.job_type] || []
              const currentIdx = statuses.indexOf(j.status)

              return (
                <div key={j.id} className="card">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{TYPE_ICON[j.job_type]}</span>
                        <span className="font-semibold">{j.job_type}</span>
                        <StatusBadge status={j.status} />
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{req?.company}</div>
                      <div className="text-xs text-gray-400">{req?.location} · NDT: {req?.ndt_method}</div>
                      <div className="text-xs text-gray-400">📅 NDT scheduled: {req?.scheduled_date || 'TBC'}</div>
                      <div className="text-xs text-gray-400">Job ref: {req?.request_no}</div>
                    </div>
                  </div>

                  {/* Status progress bar */}
                  <div className="flex items-center gap-0 my-3">
                    {statuses.map((s, i) => {
                      const done = i < currentIdx, active2 = i === currentIdx
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center relative">
                          {i < statuses.length - 1 && (
                            <div className={`absolute top-2.5 left-1/2 w-full h-0.5 z-0 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          )}
                          <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                            ${done ? 'bg-emerald-500 text-white' : active2 ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-200 text-gray-400'}`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <div className={`text-center mt-1 text-[9px] leading-tight max-w-[48px] ${done || active2 ? 'text-gray-700' : 'text-gray-400'}`}>{s}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Notes */}
                  {j.notes && (
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-3">
                      📝 {j.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    {nextStatus && (
                      <button className="btn btn-primary flex-1 justify-center"
                        disabled={saving === j.id}
                        onClick={() => advance(j)}>
                        {saving === j.id ? 'Updating…' : `Mark: ${nextStatus} →`}
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => addNote(j)}>📝 Note</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {completed.length > 0 && (
        <>
          <div className="section-title">Completed jobs</div>
          <div className="space-y-2">
            {completed.map(j => (
              <div key={j.id} className="card flex items-center gap-3">
                <span className="text-xl">{TYPE_ICON[j.job_type]}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{j.requests?.company}</div>
                  <div className="text-xs text-gray-400">{j.job_type} · {j.requests?.location}</div>
                </div>
                <StatusBadge status={j.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
