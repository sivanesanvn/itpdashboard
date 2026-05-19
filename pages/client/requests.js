import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, PRIORITY_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline, SupportJobBadge } from '../../components/StatusBadge'

export default function ClientRequests() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'client') { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase.from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .eq('client_id', user.id).order('created_at', { ascending: false })
    setRequests(data || [])
  }

  const nav = [
    { href: '/client/requests', label: 'My Requests', icon: '📋', badge: requests.length },
    { href: '/client/new',      label: 'New Request',  icon: '➕' },
  ]

  return (
    <Layout profile={profile} nav={nav}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">My NDT Requests</h1>
        <button className="btn btn-primary" onClick={() => router.push('/client/new')}>+ New request</button>
      </div>
      {requests.length === 0
        ? <div className="card text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="font-semibold">No requests yet</h3>
            <p className="text-sm text-gray-400 mt-1 mb-4">Submit your first NDT inspection request</p>
            <button className="btn btn-primary" onClick={() => router.push('/client/new')}>Submit request →</button>
          </div>
        : <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-blue-700 text-sm">{r.request_no}</span>
                      <StatusBadge status={r.status} />
                      {r.priority !== 'Normal' && <span className={`badge ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>}
                      {!r.step2_complete && (
                        <button className="badge bg-amber-100 text-amber-700 hover:bg-amber-200"
                          onClick={e => { e.stopPropagation(); router.push('/client/new?step2=' + r.id) }}>
                          ✏️ Add technical details
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-1">{r.ndt_method}</div>
                    <div className="text-xs text-gray-400">{r.location} · Needed by {r.date_needed}</div>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
                <NDTTimeline status={r.status} />
                {r.support_jobs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2 flex-wrap">
                    {r.support_jobs.map(sj => <SupportJobBadge key={sj.id} job={sj} />)}
                  </div>
                )}
                {r.scheduled_date && (
                  <div className="mt-2 text-xs text-gray-400">📅 {r.scheduled_date}{r.tech_name ? ' · 👷 ' + r.tech_name : ''}</div>
                )}
              </div>
            ))}
          </div>
      }

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="font-semibold">{selected.request_no}</h2><p className="text-xs text-gray-400">{selected.ndt_method} · {selected.location}</p></div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="card mb-3"><NDTTimeline status={selected.status} /></div>
            {selected.support_jobs?.length > 0 && (
              <div className="card mb-3">
                <div className="section-title">Support work</div>
                {selected.support_jobs.map(sj => (
                  <div key={sj.id} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                    <div><div className="text-sm font-medium">{sj.job_type}</div><div className="text-xs text-gray-400">{sj.contractor_name || 'Contractor not assigned'}</div></div>
                    <StatusBadge status={sj.status} />
                  </div>
                ))}
              </div>
            )}
            <div className="card mb-3 text-sm space-y-1.5">
              <div className="section-title">Details</div>
              {[['Location',selected.location],['Method',selected.ndt_method],['Scope',selected.scope_qty],['Date needed',selected.date_needed],['Material',selected.material],['Code',selected.code_standard]].map(([k,v])=>v&&(
                <div key={k} className="flex gap-2"><span className="text-gray-400 w-24 shrink-0">{k}</span><span>{v}</span></div>
              ))}
            </div>
            {selected.status_history?.length > 0 && (
              <div className="card text-xs">
                <div className="section-title">Activity log</div>
                {[...selected.status_history].reverse().map(h => (
                  <div key={h.id} className="flex items-center gap-2 py-1">
                    <span className="text-gray-400 w-28 shrink-0">{new Date(h.changed_at).toLocaleString('en-SG',{dateStyle:'short',timeStyle:'short'})}</span>
                    <StatusBadge status={h.new_status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
