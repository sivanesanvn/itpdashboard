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

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function ManagerSchedule() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [requests, setRequests] = useState([])
  const [selected, setSelected] = useState(null)
  const today = new Date()
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() })

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

  const { year, month } = cur
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDate = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r)
    return acc
  }, {})

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  function prevMonth() { setCur(c => c.month === 0  ? { year: c.year-1, month: 11 } : { ...c, month: c.month-1 }) }
  function nextMonth() { setCur(c => c.month === 11 ? { year: c.year+1, month: 0  } : { ...c, month: c.month+1 }) }

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={NAV(0)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">📅 Schedule</h1>
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost px-3 py-1 text-base" onClick={prevMonth}>‹</button>
          <span className="font-semibold w-44 text-center">{MONTHS[month]} {year}</span>
          <button className="btn btn-ghost px-3 py-1 text-base" onClick={nextMonth}>›</button>
          <button className="btn btn-ghost px-3 py-1 text-xs ml-2"
            onClick={() => setCur({ year: today.getFullYear(), month: today.getMonth() })}>
            Today
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="card p-0 overflow-hidden mb-4">
        {/* Day name headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return (
              <div key={`empty-${idx}`} className="min-h-[88px] border-r border-b border-gray-100 bg-gray-50/40" />
            )
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const jobs    = byDate[dateStr] || []
            const isToday = dateStr === todayStr
            const isWeekend = (idx % 7 === 0 || idx % 7 === 6)
            return (
              <div key={day}
                className={`min-h-[88px] border-r border-b border-gray-100 p-1.5 ${isWeekend ? 'bg-gray-50/60' : ''}`}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-700 text-white' : 'text-gray-500'}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {jobs.slice(0, 3).map(r => (
                    <button key={r.id}
                      onClick={() => setSelected(selected?.id === r.id ? null : r)}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded font-medium truncate transition-colors
                        ${selected?.id === r.id
                          ? 'bg-blue-700 text-white'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}>
                      {r.request_no}
                    </button>
                  ))}
                  {jobs.length > 3 && (
                    <div className="text-xs text-gray-400 pl-1">+{jobs.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Job detail panel */}
      {selected && (
        <div className="card relative">
          <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={() => setSelected(null)}>×</button>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="font-bold text-blue-700 text-base">{selected.request_no}</span>
            <StatusBadge status={selected.status} />
            {selected.priority && selected.priority !== 'Normal' && (
              <span className="badge bg-orange-100 text-orange-700">{selected.priority}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ['Company',     selected.company],
              ['Scheduled',   selected.scheduled_date],
              ['Method',      selected.ndt_method],
              ['Location',    selected.location],
              ['Technician',  selected.tech_name ? `👷 ${selected.tech_name}` : null],
              ['Scope',       selected.scope_qty],
            ].filter(([,v]) => v).map(([label, val]) => (
              <div key={label}>
                <div className="text-xs text-gray-400">{label}</div>
                <div className="font-medium">{val}</div>
              </div>
            ))}
          </div>
          {selected.support_jobs?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-1.5">Support jobs</div>
              <div className="flex flex-wrap gap-2">
                {selected.support_jobs.map(sj => (
                  <div key={sj.id} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded-lg px-2 py-1">
                    <span className="text-gray-500">{sj.job_type}</span>
                    <StatusBadge status={sj.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {selected.manager_notes && (
            <p className="text-xs text-gray-400 italic mt-3 pt-3 border-t border-gray-100">📝 {selected.manager_notes}</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {requests.length === 0 && (
        <div className="card text-center text-gray-400 py-10">No scheduled jobs yet.</div>
      )}
    </Layout>
  )
}
