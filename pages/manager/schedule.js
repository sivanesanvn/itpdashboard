import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'

const NAV = (b) => [
  { href: '/manager/dashboard', label: 'Dashboard', icon: '📊', badge: b },
  { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
  { href: '/manager/schedule',  label: 'Schedule', icon: '📅' },
]

export default function ManagerSchedule() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [techs, setTechs] = useState([])
  const [rescheduling, setRescheduling] = useState(null)
  const [form, setForm] = useState({ date: '', techId: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    const [{ data: reqs }, { data: ts }] = await Promise.all([
      supabase.from('requests').select('*, support_jobs(*)').not('scheduled_date', 'is', null).order('scheduled_date'),
      supabase.from('profiles').select('id, full_name').eq('role', 'tech').order('full_name'),
    ])
    setRequests(reqs || [])
    setTechs(ts || [])
  }

  async function load() {
    const { data } = await supabase.from('requests').select('*, support_jobs(*)')
      .not('scheduled_date', 'is', null).order('scheduled_date')
    setRequests(data || [])
  }

  function startReschedule(r) {
    setRescheduling(r.id)
    setForm({ date: r.scheduled_date || '', techId: r.tech_id || '', notes: r.manager_notes || '' })
  }

  async function saveReschedule(r) {
    if (!form.date) return
    setSaving(true)
    const tech = techs.find(t => t.id === form.techId)
    await supabase.from('requests').update({
      scheduled_date: form.date,
      tech_id: form.techId || null,
      tech_name: tech ? tech.full_name : null,
      manager_notes: form.notes || null,
    }).eq('id', r.id)
    setSaving(false)
    setRescheduling(null)
    await load()
  }

  const grouped = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r); return acc
  }, {})

  return (
    <Layout profile={profile} nav={NAV(0)}>
      <h1 className="text-xl font-bold mb-5">📅 Schedule</h1>
      {Object.keys(grouped).length === 0
        ? <div className="card text-center text-gray-400 py-10">No scheduled jobs yet.</div>
        : Object.keys(grouped).sort().map(date => (
          <div key={date} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-semibold">{date}</span>
              <span className="text-xs text-gray-400">{grouped[date].length} job{grouped[date].length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {grouped[date].map(r => (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
                    <span className="text-sm">{r.company}</span>
                    <StatusBadge status={r.status} />
                    <button
                      onClick={() => rescheduling === r.id ? setRescheduling(null) : startReschedule(r)}
                      className="ml-auto btn btn-ghost text-xs"
                    >
                      {rescheduling === r.id ? 'Cancel' : '📅 Reschedule'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {r.ndt_method} · {r.location}{r.tech_name ? ` · 👷 ${r.tech_name}` : ''}
                  </div>
                  {r.support_jobs?.map(sj => (
                    <div key={sj.id} className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <span>{sj.job_type}:</span><StatusBadge status={sj.status} />
                    </div>
                  ))}
                  {r.manager_notes && <p className="text-xs text-gray-400 italic mt-1.5">📝 {r.manager_notes}</p>}

                  {rescheduling === r.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      <div>
                        <label className="label">New date</label>
                        <input type="date" className="input" value={form.date}
                          onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Technician</label>
                        <select className="input" value={form.techId}
                          onChange={e => setForm(f => ({ ...f, techId: e.target.value }))}>
                          <option value="">— Unassigned —</option>
                          {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Manager notes</label>
                        <textarea className="input" rows={2} value={form.notes}
                          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveReschedule(r)} disabled={saving || !form.date}
                          className="btn btn-primary text-xs flex-1">
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setRescheduling(null)} className="btn btn-ghost text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      }
    </Layout>
  )
}
