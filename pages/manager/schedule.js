import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'
import {
  format, addDays, addWeeks, addMonths,
  subDays, subWeeks, subMonths,
  startOfWeek, isToday, getDay, getDaysInMonth,
} from 'date-fns'

const NAV = (b) => [
  { href: '/manager/dashboard', label: 'Dashboard', icon: '📊', badge: b },
  { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
  { href: '/manager/schedule',  label: 'Schedule', icon: '📅' },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function jobStyle(r) {
  if (r.priority === 'Shutdown / turnaround') return { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-l-red-500'    }
  if (r.priority === 'Urgent')                return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-l-orange-500' }
  return                                             { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-l-blue-500'   }
}

export default function ManagerSchedule() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [view, setView]       = useState('month')
  const [anchor, setAnchor]   = useState(new Date())
  const [selected, setSelected] = useState(null)

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

  // date-string → jobs map (keyed as 'yyyy-MM-dd')
  const byDate = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r)
    return acc
  }, {})

  function getJobs(d) { return byDate[format(d, 'yyyy-MM-dd')] || [] }

  function goBack()    { setAnchor(a => view === 'day' ? subDays(a,1) : view === 'week' ? subWeeks(a,1) : subMonths(a,1)) }
  function goForward() { setAnchor(a => view === 'day' ? addDays(a,1) : view === 'week' ? addWeeks(a,1) : addMonths(a,1)) }

  function periodLabel() {
    if (view === 'day')  return format(anchor, 'EEEE, d MMMM yyyy')
    if (view === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 })
      return `${format(ws, 'd MMM')} – ${format(addDays(ws, 6), 'd MMM yyyy')}`
    }
    return format(anchor, 'MMMM yyyy')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={NAV(0)}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost px-2.5 py-1 text-xl leading-none" onClick={goBack}>‹</button>
          <span className="font-semibold text-sm sm:text-base w-52 text-center">{periodLabel()}</span>
          <button className="btn btn-ghost px-2.5 py-1 text-xl leading-none" onClick={goForward}>›</button>
          <button className="btn btn-ghost px-2.5 py-1 text-xs ml-1"
            onClick={() => { setAnchor(new Date()); setSelected(null) }}>
            Today
          </button>
        </div>

        {/* View switcher — Day | Week | Month */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {['Day', 'Week', 'Month'].map(v => (
            <button key={v}
              onClick={() => { setView(v.toLowerCase()); setSelected(null) }}
              className={`px-4 py-1.5 text-sm font-medium transition-colors
                ${view === v.toLowerCase()
                  ? 'bg-[#185FA5] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Views ── */}
      {view === 'month' && (
        <MonthView anchor={anchor} byDate={byDate} selected={selected}
          setSelected={setSelected} setAnchor={setAnchor} setView={setView} />
      )}
      {view === 'week' && (
        <WeekView anchor={anchor} getJobs={getJobs} selected={selected}
          setSelected={setSelected} setAnchor={setAnchor} setView={setView} />
      )}
      {view === 'day' && (
        <DayView anchor={anchor} getJobs={getJobs} selected={selected} setSelected={setSelected} />
      )}

      {/* Detail panel (month + week only; day view has inline cards) */}
      {selected && view !== 'day' && (
        <DetailPanel job={selected} onClose={() => setSelected(null)} />
      )}

    </Layout>
  )
}

/* ══════════════════════════════════════════════════════
   MONTH VIEW
══════════════════════════════════════════════════════ */
function MonthView({ anchor, byDate, selected, setSelected, setAnchor, setView }) {
  const year  = anchor.getFullYear()
  const month = anchor.getMonth()
  const firstDay    = getDay(new Date(year, month, 1))
  const daysInMonth = getDaysInMonth(anchor)
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="card p-0 overflow-hidden">
      {/* Day-name header row */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2.5 tracking-wide">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return (
            <div key={`e-${idx}`} className="min-h-[88px] border-r border-b border-gray-100 bg-gray-50/40 last:border-r-0" />
          )
          const date    = new Date(year, month, day)
          const dateStr = format(date, 'yyyy-MM-dd')
          const jobs    = byDate[dateStr] || []
          const _today  = isToday(date)
          const weekend = idx % 7 === 0 || idx % 7 === 6

          return (
            <div key={day}
              className={`min-h-[88px] border-r border-b border-gray-100 p-1.5 last:border-r-0
                ${weekend ? 'bg-gray-50/60' : 'bg-white'}`}>

              {/* Date number — tap goes to day view */}
              <div
                onClick={() => { setAnchor(date); setView('day') }}
                className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-colors
                  ${_today
                    ? 'bg-[#185FA5] text-white'
                    : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700'}`}>
                {day}
              </div>

              {/* Job pills */}
              <div className="space-y-0.5">
                {jobs.slice(0, 3).map(r => {
                  const s = jobStyle(r)
                  return (
                    <button key={r.id}
                      onClick={() => setSelected(selected?.id === r.id ? null : r)}
                      className={`w-full text-left text-xs px-1.5 py-0.5 rounded font-medium truncate transition-colors
                        ${selected?.id === r.id ? 'bg-[#185FA5] text-white' : `${s.bg} ${s.text} hover:opacity-75`}`}>
                      {r.request_no}
                    </button>
                  )
                })}
                {jobs.length > 3 && (
                  <button onClick={() => { setAnchor(date); setView('day') }}
                    className="text-xs text-gray-400 pl-1 hover:text-blue-600 transition-colors">
                    +{jobs.length - 3} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   WEEK VIEW
══════════════════════════════════════════════════════ */
function WeekView({ anchor, getJobs, selected, setSelected, setAnchor, setView }) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="card p-0 overflow-hidden">
      <div className="grid grid-cols-7">
        {days.map(d => {
          const jobs   = getJobs(d)
          const _today = isToday(d)

          return (
            <div key={d.toISOString()}
              className={`border-r border-gray-100 last:border-r-0 ${_today ? 'bg-blue-50/40' : ''}`}>

              {/* Day header — tap goes to day view */}
              <div
                onClick={() => { setAnchor(d); setView('day') }}
                className={`text-center pt-3 pb-2 border-b border-gray-100 cursor-pointer transition-colors
                  hover:bg-blue-50/60 ${_today ? 'bg-blue-50/60' : ''}`}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {format(d, 'EEE')}
                </div>
                <div className={`text-2xl font-bold mt-1 mx-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors
                  ${_today ? 'bg-[#185FA5] text-white' : 'text-gray-700 hover:bg-blue-100'}`}>
                  {format(d, 'd')}
                </div>
                {jobs.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{jobs.length} job{jobs.length > 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Job cards */}
              <div className="p-1.5 space-y-1.5 min-h-[240px]">
                {jobs.map(r => {
                  const s   = jobStyle(r)
                  const sel = selected?.id === r.id
                  return (
                    <button key={r.id}
                      onClick={() => setSelected(sel ? null : r)}
                      className={`w-full text-left rounded-xl p-2 transition-all border-l-4
                        ${sel ? 'bg-[#185FA5] border-[#185FA5] text-white' : `${s.bg} ${s.border} hover:opacity-80`}`}>
                      <div className={`text-xs font-bold truncate ${sel ? 'text-white' : s.text}`}>
                        {r.request_no}
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${sel ? 'text-blue-200' : 'text-gray-500'}`}>
                        {r.ndt_method}
                      </div>
                      {r.tech_name && (
                        <div className={`text-xs truncate mt-0.5 ${sel ? 'text-blue-200' : 'text-gray-400'}`}>
                          👷 {r.tech_name}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   DAY VIEW
══════════════════════════════════════════════════════ */
function DayView({ anchor, getJobs, selected, setSelected }) {
  const jobs   = getJobs(anchor)
  const _today = isToday(anchor)

  return (
    <div>
      {/* Date hero */}
      <div className={`rounded-2xl text-center py-7 mb-5 ${_today ? 'bg-blue-50' : 'bg-gray-50'}`}>
        <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {format(anchor, 'EEEE')}
        </div>
        <div className={`text-8xl font-bold leading-none mt-2 ${_today ? 'text-[#185FA5]' : 'text-gray-800'}`}>
          {format(anchor, 'd')}
        </div>
        <div className="text-sm text-gray-400 mt-2">{format(anchor, 'MMMM yyyy')}</div>
        {_today && (
          <span className="inline-block mt-3 bg-[#185FA5] text-white text-xs px-3 py-1 rounded-full font-semibold">
            Today
          </span>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-400 text-sm">No jobs scheduled for this day</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            {jobs.length} job{jobs.length > 1 ? 's' : ''} scheduled
          </div>
          {jobs.map(r => {
            const s   = jobStyle(r)
            const sel = selected?.id === r.id
            return (
              <div key={r.id}
                onClick={() => setSelected(sel ? null : r)}
                className={`card cursor-pointer transition-all border-l-4
                  ${sel ? 'border-[#185FA5] bg-blue-50' : `${s.border} hover:shadow-md`}`}>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="font-bold text-[#185FA5]">{r.request_no}</span>
                  <StatusBadge status={r.status} />
                  {r.priority && r.priority !== 'Normal' && (
                    <span className={`badge ${s.bg} ${s.text} text-xs`}>{r.priority}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    ['Company',    r.company],
                    ['Method',     r.ndt_method],
                    ['Location',   r.location],
                    ['Technician', r.tech_name ? `👷 ${r.tech_name}` : null],
                    ['Scope',      r.scope_qty],
                    ['Category',   r.job_category],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label}>
                      <div className="text-xs text-gray-400">{label}</div>
                      <div className="font-medium">{val}</div>
                    </div>
                  ))}
                </div>

                {r.support_jobs?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5">
                    {r.support_jobs.map(sj => (
                      <div key={sj.id} className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">
                        <span className="text-gray-500">{sj.job_type}</span>
                        <StatusBadge status={sj.status} />
                      </div>
                    ))}
                  </div>
                )}

                {r.manager_notes && (
                  <p className="text-xs text-gray-400 italic mt-2.5 pt-2.5 border-t border-gray-100">
                    📝 {r.manager_notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   DETAIL PANEL  (used by Month + Week views)
══════════════════════════════════════════════════════ */
function DetailPanel({ job: r, onClose }) {
  const s = jobStyle(r)
  return (
    <div className={`card relative mt-4 border-l-4 ${s.border}`}>
      <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl leading-none"
        onClick={onClose}>×</button>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-bold text-[#185FA5] text-base">{r.request_no}</span>
        <StatusBadge status={r.status} />
        {r.priority && r.priority !== 'Normal' && (
          <span className={`badge ${s.bg} ${s.text}`}>{r.priority}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {[
          ['Company',    r.company],
          ['Scheduled',  r.scheduled_date],
          ['Method',     r.ndt_method],
          ['Location',   r.location],
          ['Technician', r.tech_name ? `👷 ${r.tech_name}` : null],
          ['Scope',      r.scope_qty],
        ].filter(([, v]) => v).map(([label, val]) => (
          <div key={label}>
            <div className="text-xs text-gray-400">{label}</div>
            <div className="font-medium">{val}</div>
          </div>
        ))}
      </div>

      {r.support_jobs?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400 mb-1.5">Support jobs</div>
          <div className="flex flex-wrap gap-2">
            {r.support_jobs.map(sj => (
              <div key={sj.id} className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                <span className="text-gray-500">{sj.job_type}</span>
                <StatusBadge status={sj.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {r.manager_notes && (
        <p className="text-xs text-gray-400 italic mt-3 pt-3 border-t border-gray-100">
          📝 {r.manager_notes}
        </p>
      )}
    </div>
  )
}
