import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge, SupportJobBadge } from '../../components/StatusBadge'

const NAV = [
  { href: '/client/requests',  label: 'My Requests', icon: '📋' },
  { href: '/client/new',       label: 'New Request',  icon: '➕' },
  { href: '/client/schedule',  label: 'Schedule',     icon: '📅' },
]

export default function ClientSchedule() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || !['client', 'manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*)')
      .eq('client_id', user.id)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date')
    setRequests(data || [])
  }

  const grouped = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r); return acc
  }, {})

  return (
    <Layout profile={profile} nav={NAV}>
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
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {r.ndt_method} · {r.location}
                  </div>
                  {r.support_jobs?.map(sj => (
                    <div key={sj.id} className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <span>{sj.job_type}:</span><StatusBadge status={sj.status} />
                    </div>
                  ))}
                  {r.manager_notes && <p className="text-xs text-gray-400 italic mt-1.5">📝 {r.manager_notes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      }
    </Layout>
  )
}
