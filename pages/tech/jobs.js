import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline } from '../../components/StatusBadge'

const TECH_NEXT = {
  'Scheduled':           'On-going',
  'On-going':            'Site work completed',
  'Site work completed': 'Report submitted',
}

export default function TechJobs() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser]       = useState(null)
  const [active, setActive]   = useState([])
  const [history, setHistory] = useState([])
  const [saving, setSaving]   = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || p.role !== 'tech') { router.push('/'); return }
    setProfile(p); setUser(u)
    await load(u.id)
  }

  async function load(uid) {
    const { data } = await supabase.from('requests')
      .select('*, support_jobs(*)')
      .eq('tech_id', uid)
      .order('scheduled_date')
    const all = data || []
    setActive(all.filter(r => ['Scheduled','On-going','Site work completed'].includes(r.status)))
    setHistory(all.filter(r => ['Report submitted','Report accepted'].includes(r.status)))
  }

  async function advance(id, newStatus) {
    setSaving(id)
    await supabase.from('requests').update({ status: newStatus }).eq('id', id)
    await load(user.id)
    setSaving(null)
  }

  const nav = [{ href: '/tech/jobs', label: 'My Jobs', icon: '🔧', badge: active.length }]

  return (
    <Layout profile={profile} nav={nav}>
      <h1 className="text-xl font-bold mb-5">My Jobs</h1>

      {active.length === 0 && history.length === 0 && (
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">🔧</div>
          <p>No jobs assigned to you yet.</p>
        </div>
      )}

      {active.length > 0 && (
        <>
          <div className="section-title">Active jobs</div>
          <div className="space-y-3 mb-6">
            {active.map(r => (
              <div key={r.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-700">{r.request_no}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="font-medium mt-0.5">{r.company}</div>
                    <div className="text-xs text-gray-400">{r.ndt_method} · {r.location}</div>
                    <div className="text-xs text-gray-400 mt-0.5">📅 {r.scheduled_date}</div>
                  </div>
                </div>

                <NDTTimeline status={r.status} />

                {/* Job details */}
                <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ['Method',    r.ndt_method],
                    ['Material',  r.material],
                    ['Thickness', r.thickness_mm ? r.thickness_mm + ' mm' : null],
                    ['Code',      r.code_standard],
                    ['Scope',     r.scope_qty],
                    ['Notes',     r.manager_notes],
                  ].map(([k, v]) => v && (
                    <div key={k}><span className="text-gray-400">{k}: </span><span>{v}</span></div>
                  ))}
                </div>

                {/* Support jobs this tech should know about */}
                {r.support_jobs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-1.5">Support work on this job:</div>
                    {r.support_jobs.map(sj => (
                      <div key={sj.id} className="flex items-center gap-2 text-xs mb-1">
                        <span className="text-gray-500">{sj.job_type}:</span>
                        <StatusBadge status={sj.status} />
                        {sj.contractor_name && <span className="text-gray-400">— {sj.contractor_name}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action button */}
                {TECH_NEXT[r.status] && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <button
                      className="btn btn-primary w-full justify-center"
                      disabled={saving === r.id}
                      onClick={() => advance(r.id, TECH_NEXT[r.status])}>
                      {saving === r.id ? 'Updating…' : `Mark as: ${TECH_NEXT[r.status]} →`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <div className="section-title">Completed jobs</div>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="card flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
                    <span className="text-sm text-gray-600">{r.company}</span>
                  </div>
                  <div className="text-xs text-gray-400">{r.ndt_method} · {r.scheduled_date}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  )
}
