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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function calDays(year, month) {
  let dow = new Date(year, month, 1).getDay(); dow = dow === 0 ? 6 : dow - 1
  const last = new Date(year, month + 1, 0).getDate()
  const days = Array(dow).fill(null)
  for (let d = 1; d <= last; d++) days.push(d)
  while (days.length % 7 !== 0) days.push(null)
  return days
}

export default function ManagerSchedule() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [calDate, setCalDate] = useState(() => new Date())
  const [calDay, setCalDay] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase.from('requests').select('*, support_jobs(*)')
      .not('scheduled_date', 'is', null).order('scheduled_date')
    setRequests(data || [])
  }

  const calMap = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r); return acc
  }, {})

  const todayStr = toDateStr(new Date())
  const days = calDays(calDate.getFullYear(), calDate.getMonth())

  return (
    <Layout profile={profile} nav={NAV(0)}>
      <h1 className="text-xl font-bold mb-4">📅 Schedule</h1>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1)); setCalDay(null) }}
            className="btn btn-ghost text-base px-3">‹</button>
          <span className="font-semibold">{MONTH_NAMES[calDate.getMonth()]} {calDate.getFullYear()}</span>
          <button onClick={() => { setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1)); setCalDay(null) }}
            className="btn btn-ghost text-base px-3">›</button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[44px]" />
            const dateStr = toDateStr(new Date(calDate.getFullYear(), calDate.getMonth(), day))
            const jobs = calMap[dateStr] || []
            const isToday = dateStr === todayStr
            const isSelected = calDay === dateStr
            return (
              <div key={i}
                onClick={() => jobs.length > 0 && setCalDay(isSelected ? null : dateStr)}
                className={`rounded-lg p-1 min-h-[44px] transition-colors text-center
                  ${jobs.length > 0 ? 'cursor-pointer' : ''}
                  ${isToday ? 'bg-blue-700' : isSelected ? 'bg-blue-50 border border-blue-200' : jobs.length > 0 ? 'hover:bg-blue-50' : ''}`}>
                <div className={`text-xs font-medium mt-0.5 ${isToday ? 'text-white' : 'text-gray-700'}`}>{day}</div>
                {jobs.length > 0 && (
                  <div className="mt-0.5 flex justify-center">
                    <span className={`text-xs font-semibold rounded-full w-4 h-4 flex items-center justify-center
                      ${isToday ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {jobs.length}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {calDay && calMap[calDay] ? (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-semibold">{calDay}</span>
            <span className="text-xs text-gray-400">{calMap[calDay].length} job{calMap[calDay].length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {calMap[calDay].map(r => (
              <div key={r.id} className="card">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
                  <span className="text-sm text-gray-600">{r.company}</span>
                  <StatusBadge status={r.status} />
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
              </div>
            ))}
          </div>
        </div>
      ) : (
        requests.length > 0
          ? <div className="text-center text-xs text-gray-400 py-4">Click a highlighted date to view scheduled jobs.</div>
          : <div className="card text-center text-gray-400 py-10">No scheduled jobs yet.</div>
      )}
    </Layout>
  )
}
