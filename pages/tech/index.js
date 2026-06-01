import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'

export default function TechJobs() {
  const supabase = useSupabaseClient()
  const user     = useUser()
  const router   = useRouter()

  const [profile,  setProfile]  = useState(null)
  const [jobs,     setJobs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // Report upload modal
  const [reportModal,  setReportModal]  = useState(null)
  const [reportFile,   setReportFile]   = useState(null)
  const [uploading,    setUploading]    = useState(false)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.role !== 'tech') { router.push('/'); return }
    setProfile(prof)
    const { data } = await supabase
      .from('requests_overview')
      .select('*')
      .eq('tech_id', user.id)
      .order('scheduled_date', { ascending: true })
    setJobs(data ?? [])
    setLoading(false)
  }

  async function updateStatus(jobId, newStatus) {
    setSaving(true)
    await supabase.from('requests').update({ status: newStatus }).eq('id', jobId)
    setSaving(false)
    load()
  }

  async function uploadReport() {
    if (!reportFile || !reportModal) return
    setUploading(true)

    const ext      = reportFile.name.split('.').pop()
    const fileName = `${reportModal.request_no}-report.${ext}`
    const { data: fileData, error: uploadErr } = await supabase.storage
      .from('reports')
      .upload(fileName, reportFile, { upsert: true })

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName)
      await supabase.from('requests').update({
        status:      'Report submitted',
        report_url:  urlData.publicUrl,
        report_name: reportFile.name,
      }).eq('id', reportModal.id)
    }

    setUploading(false)
    setReportModal(null)
    setReportFile(null)
    load()
  }

  if (loading || !profile) return <div className="flex items-center justify-center h-screen text-sm text-gray-400">Loading…</div>

  const active  = jobs.filter(j => ['Scheduled','On-going','Site work completed'].includes(j.status))
  const history = jobs.filter(j => ['Report submitted','Report accepted'].includes(j.status))

  return (
    <Layout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">My jobs</h2>

        {active.length === 0 && history.length === 0 && (
          <div className="card text-center py-10 text-gray-400 text-sm">No jobs assigned yet.</div>
        )}

        {active.length > 0 && (
          <>
            <div className="section-title">Active</div>
            {active.map(j => (
              <div key={j.id} className="card mb-3">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{j.request_no}</span>
                      <StatusBadge status={j.status} />
                      {j.scaffold_required && <StatusBadge status={j.scaffold_status ?? 'Pending'} />}
                    </div>
                    <div className="font-medium text-sm mt-1">{j.company}</div>
                    <div className="text-xs text-gray-500">{j.ndt_method} · {j.location}</div>
                    {j.scheduled_date && <div className="text-xs text-gray-400 mt-0.5">📅 {j.scheduled_date}</div>}
                    {j.code_standard && <div className="text-xs text-gray-400">Code: {j.code_standard}{j.material ? ' · '+j.material : ''}</div>}
                    {j.manager_notes && <div className="text-xs text-blue-600 mt-0.5">Note: {j.manager_notes}</div>}
                  </div>
                </div>

                {/* Scaffold warning if not ready */}
                {j.scaffold_required && j.scaffold_status !== 'Ready to use' && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded px-2.5 py-1.5 mb-2">
                    ⚠ Waiting for scaffold — status: {j.scaffold_status ?? 'Pending'}
                  </div>
                )}


                {/* Action buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {j.status === 'Scheduled' && (
                    <button className="btn btn-primary btn-sm" onClick={() => updateStatus(j.id,'On-going')} disabled={saving}>
                      ▶ Mark on-going
                    </button>
                  )}
                  {j.status === 'On-going' && (
                    <button className="btn btn-sm" onClick={() => updateStatus(j.id,'Site work completed')} disabled={saving}>
                      ✓ Mark site complete
                    </button>
                  )}
                  {j.status === 'Site work completed' && (
                    <button className="btn btn-success btn-sm" onClick={() => { setReportModal(j); setReportFile(null) }}>
                      📤 Submit report
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {history.length > 0 && (
          <>
            <div className="section-title mt-4">History</div>
            {history.map(j => (
              <div key={j.id} className="card mb-2 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{j.request_no}</span>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="text-sm font-medium mt-0.5">{j.company}</div>
                  <div className="text-xs text-gray-400">{j.ndt_method}</div>
                </div>
                {j.report_url && (
                  <a href={j.report_url} target="_blank" rel="noreferrer" className="btn btn-xs text-blue-600">
                    📄 Report
                  </a>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Report upload modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm">
            <h3 className="font-semibold mb-1">Submit report</h3>
            <p className="text-sm text-gray-500 mb-3">{reportModal.request_no} · {reportModal.company}</p>
            <label className="label">Upload PDF report</label>
            <input type="file" accept=".pdf,.doc,.docx"
              className="input text-sm py-1.5"
              onChange={e => setReportFile(e.target.files[0])} />
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn" onClick={() => setReportModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={uploadReport} disabled={!reportFile || uploading}>
                {uploading ? 'Uploading…' : '📤 Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
