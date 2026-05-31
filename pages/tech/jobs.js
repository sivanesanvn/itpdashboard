import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_STATUSES } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, NDTTimeline } from '../../components/StatusBadge'
import DocumentUpload from '../../components/DocumentUpload'
import PrintRequest from '../../components/PrintRequest'
import RequestComments from '../../components/RequestComments'

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
  const [selected, setSelected] = useState(null)
  const [docs, setDocs] = useState([])
  const [printing, setPrinting] = useState(false)

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
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*), status_history(*)')
      .eq('tech_id', uid)
      .order('scheduled_date')
    const all = data || []
    setActive(all.filter(r => ['Scheduled','On-going','Site work completed'].includes(r.status)))
    setHistory(all.filter(r => ['Report submitted','Report accepted'].includes(r.status)))
  }

  async function openDetail(r) {
    setSelected(r)
    const { data } = await supabase
      .from('request_documents')
      .select('*')
      .eq('request_id', r.id)
      .order('created_at', { ascending: false })
    setDocs(data || [])
  }

  async function advance(id, newStatus) {
    setSaving(id)
    await supabase.from('requests').update({ status: newStatus }).eq('id', id)
    // Send email notification when draft report submitted
    if (newStatus === 'Draft Report Submitted') {
      const job = [...active, ...history].find(r => r.id === id)
      if (job) {
        // Get client email
        const { data: clientProfile } = await supabase
          .from('profiles').select('email').eq('id', job.client_id).single()
        if (clientProfile?.email) {
          try {
            await fetch('/api/notify-report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: clientProfile.email,
                requestNo: job.request_no,
                company: job.company,
                method: job.ndt_method,
                location: job.location,
              })
            })
          } catch(e) { console.warn('Email notification failed:', e) }
        }
      }
    }
    await load(user.id)
    setSaving(null)
    if (selected?.id === id) setSelected(prev => ({ ...prev, status: newStatus }))
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
                    <div className="text-xs text-gray-400">{r.ndt_method} · {r.location} · 📅 {r.scheduled_date}</div>
                  </div>
                  <button onClick={() => openDetail(r)} className="btn btn-ghost text-xs">Details</button>
                </div>

                <NDTTimeline status={r.status} />

                <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
['Requested by', r.requested_by_name],
                    ['Material', r.material],
                    ['Thickness', r.thickness_mm ? r.thickness_mm + ' mm' : null],
                    ['Code', r.code_standard],
                    ['Scope', r.scope_qty],
                    ['Notes', r.manager_notes],
                  ].map(([k, v]) => v && (
                    <div key={k}><span className="text-gray-400">{k}: </span><span>{v}</span></div>
                  ))}
                </div>

                {r.support_jobs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="text-xs font-medium text-gray-500 mb-1">Support work:</div>
                    {r.support_jobs.map(sj => (
                      <div key={sj.id} className="flex items-center gap-2 text-xs mb-1">
                        <span className="text-gray-500">{sj.job_type}:</span>
                        <StatusBadge status={sj.status} />
                        {sj.contractor_name && <span className="text-gray-400">— {sj.contractor_name}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {TECH_NEXT[r.status] && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <button className="btn btn-primary w-full justify-center"
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
              <div key={r.id} className="card flex items-center gap-3 cursor-pointer hover:shadow-md" onClick={() => openDetail(r)}>
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
                <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl">×</button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="card">
                <NDTTimeline status={selected.status} />
                {TECH_NEXT[selected.status] && (
                  <button className="btn btn-primary w-full justify-center mt-3"
                    disabled={saving === selected.id}
                    onClick={() => advance(selected.id, TECH_NEXT[selected.status])}>
                    {saving === selected.id ? 'Updating…' : `Mark as: ${TECH_NEXT[selected.status]} →`}
                  </button>
                )}
              </div>

              <div className="card text-sm space-y-1.5">
                <div className="section-title">Job details</div>
                {[
                  ['Company', selected.company],
                  ['Requested by', selected.requested_by_name],
                  ['Location', selected.location],
                  ['Method', selected.ndt_method],
                  ['Material', selected.material],
                  ['Thickness', selected.thickness_mm ? selected.thickness_mm + ' mm' : null],
                  ['Code', selected.code_standard],
                  ['Scope', selected.scope_qty],
                  ['Notes', selected.manager_notes],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-gray-400 w-24 shrink-0">{k}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>

              {/* Supporting docs — view + upload */}
              <div className="card">
                <DocumentUpload
                  requestId={selected.id}
                  profile={profile}
                  fileType="document"
                  label="Supporting documents"
                  existingDocs={docs}
                  onUploaded={async () => {
                    const { data } = await supabase.from('request_documents').select('*').eq('request_id', selected.id).order('created_at', { ascending: false })
                    setDocs(data || [])
                  }}
                />
              </div>

              <RequestComments requestId={selected.id} profile={profile} />

              {/* NDT Report upload */}
              <div className="card">
                <DocumentUpload
                  requestId={selected.id}
                  profile={profile}
                  fileType="report"
                  label="Upload NDT Report"
                  existingDocs={docs}
                  onUploaded={async () => {
                    const { data } = await supabase.from('request_documents').select('*').eq('request_id', selected.id).order('created_at', { ascending: false })
                    setDocs(data || [])
                  }}
                />
                <p className="text-xs text-gray-400 mt-2">After uploading, mark status as "Report submitted"</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {printing && selected && (
        <PrintRequest
          request={{ ...selected, support_jobs: selected.support_jobs || [], documents: docs }}
          onClose={() => setPrinting(false)}
        />
      )}
    </Layout>
  )
}
