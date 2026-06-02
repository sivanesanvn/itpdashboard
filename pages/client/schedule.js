import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, STATUS_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'
import { StatusBadge } from '../../components/StatusBadge'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, isSameDay, isSameMonth, isToday,
} from 'date-fns'

const NAV = [
  { href: '/client/requests',     label: 'Dashboard',    icon: '📊' },
  { href: '/client/all-requests', label: 'All Requests', icon: '📋' },
  { href: '/client/schedule',     label: 'Schedule',     icon: '📅' },
  { href: '/client/new',          label: 'New Request',  icon: '➕' },
]

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function ClientSchedule() {
  const router = useRouter()
  const [profile, setProfile]         = useState(null)
  const [requests, setRequests]       = useState([])
  const [view, setView]               = useState('month')
  const [current, setCurrent]         = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase
      .from('requests')
      .select('*, support_jobs(*)')
      .eq('client_id', u.id)
      .not('scheduled_date', 'is', null)
      .order('scheduled_date')
    setRequests(data || [])
  }

  function jobsForDay(date) {
    const d = format(date, 'yyyy-MM-dd')
    return requests.filter(r => r.scheduled_date === d)
  }

  function prev() {
    if (view === 'month') setCurrent(d => subMonths(d, 1))
    else if (view === 'week') setCurrent(d => subWeeks(d, 1))
    else setCurrent(d => subDays(d, 1))
  }
  function next() {
    if (view === 'month') setCurrent(d => addMonths(d, 1))
    else if (view === 'week') setCurrent(d => addWeeks(d, 1))
    else setCurrent(d => addDays(d, 1))
  }
  function goToday() { const t = new Date(); setCurrent(t); setSelectedDay(t) }

  function getMonthDays() {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 })
    const end   = endOfWeek(endOfMonth(current),     { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }
  function getWeekDays() {
    const start = startOfWeek(current, { weekStartsOn: 1 })
    const end   = endOfWeek(current,   { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  function periodLabel() {
    if (view === 'month') return format(current, 'MMMM yyyy')
    if (view === 'week') {
      const s = startOfWeek(current, { weekStartsOn: 1 })
      const e = endOfWeek(current,   { weekStartsOn: 1 })
      return `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`
    }
    return format(current, 'EEEE, d MMMM yyyy')
  }

  function chipColor(status) {
    return STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'
  }

  function selectDay(day) {
    setSelectedDay(prev => prev && isSameDay(prev, day) ? null : day)
  }

  const panelJobs = selectedDay ? jobsForDay(selectedDay) : []

  return (
    <Layout profile={profile} nav={NAV}>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="btn btn-ghost text-base px-2.5 py-1">‹</button>
          <span className="font-semibold text-sm min-w-[200px] text-center">{periodLabel()}</span>
          <button onClick={next} className="btn btn-ghost text-base px-2.5 py-1">›</button>
          <button onClick={goToday} className="btn btn-ghost text-xs ml-2">Today</button>
        </div>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {['day','week','month'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                ${view === v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Month view */}
      {view === 'month' && (() => {
        const days = getMonthDays()
        return (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
              {WEEK_DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-50">
              {days.map((day, i) => {
                const jobs       = jobsForDay(day)
                const inMonth    = isSameMonth(day, current)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const today      = isToday(day)
                return (
                  <div key={i} onClick={() => selectDay(day)}
                    className={`min-h-[88px] p-1.5 cursor-pointer transition-colors
                      ${!inMonth ? 'bg-gray-50/60' : isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${today ? 'bg-blue-700 text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {jobs.slice(0, 3).map(r => (
                        <div key={r.id} className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${chipColor(r.status)}`}>
                          {r.request_no}
                        </div>
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
        )
      })()}

      {/* Week view */}
      {view === 'week' && (() => {
        const days = getWeekDays()
        return (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 divide-x divide-gray-100">
              {days.map((day, i) => {
                const jobs       = jobsForDay(day)
                const today      = isToday(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                return (
                  <div key={i} onClick={() => selectDay(day)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <div className={`px-2 py-2.5 border-b border-gray-100 text-center ${today ? 'bg-blue-50' : ''}`}>
                      <div className="text-xs font-medium text-gray-400 uppercase">{format(day, 'EEE')}</div>
                      <div className={`text-xl font-bold leading-tight mt-0.5 ${today ? 'text-blue-700' : 'text-gray-800'}`}>
                        {format(day, 'd')}
                      </div>
                      {jobs.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">{jobs.length} job{jobs.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                    <div className="p-1.5 space-y-1 min-h-[140px]">
                      {jobs.map(r => (
                        <div key={r.id} className={`text-xs rounded-lg p-1.5 ${chipColor(r.status)}`}>
                          <div className="font-semibold truncate">{r.request_no}</div>
                          <div className="opacity-80 truncate">{r.ndt_method}</div>
                          {r.tech_name && <div className="opacity-60 truncate">👷 {r.tech_name}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Day view */}
      {view === 'day' && (() => {
        const jobs = jobsForDay(current)
        return jobs.length === 0
          ? <div className="card text-center text-gray-400 py-12">No jobs scheduled for this day.</div>
          : (
            <div className="space-y-3">
              {jobs.map(r => (
                <div key={r.id} className="card">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="font-semibold text-blue-700">{r.request_no}</span>
                    <span className="text-sm font-medium">{r.company}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                    {[
                      ['Method',     r.ndt_method],
                      ['Location',   r.location],
                      ['Equipment',  r.equipment_no],
                      ['Technician', r.tech_name],
                      ['Priority',   r.priority],
                      ['Notes',      r.manager_notes],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex gap-2">
                        <span className="text-gray-400 w-20 shrink-0">{k}</span>
                        <span className="text-gray-700">{v}</span>
                      </div>
                    ))}
                  </div>
                  {r.support_jobs?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
                      {r.support_jobs.map(sj => (
                        <div key={sj.id} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 w-28 shrink-0">{sj.job_type}</span>
                          <StatusBadge status={sj.status} />
                          {sj.contractor_name && <span className="text-gray-400">· {sj.contractor_name}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      })()}

      {/* Day detail panel (month / week click) */}
      {selectedDay && view !== 'day' && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold text-sm">{format(selectedDay, 'EEEE, d MMMM yyyy')}</h2>
            <span className="text-xs text-gray-400">
              {panelJobs.length} job{panelJobs.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => { setCurrent(selectedDay); setView('day') }}
              className="ml-auto text-xs text-blue-600 hover:underline">
              Full day view →
            </button>
          </div>

          {panelJobs.length === 0
            ? <div className="card text-center text-gray-400 py-6 text-sm">No jobs scheduled.</div>
            : (
              <div className="space-y-2">
                {panelJobs.map(r => (
                  <div key={r.id} className="card">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
                      <span className="text-sm">{r.company}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.ndt_method} · {r.location}
                      {r.tech_name ? ` · 👷 ${r.tech_name}` : ''}
                    </div>
                    {r.support_jobs?.map(sj => (
                      <div key={sj.id} className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                        <span>{sj.job_type}:</span><StatusBadge status={sj.status} />
                      </div>
                    ))}
                    {r.manager_notes && (
                      <p className="text-xs text-gray-400 italic mt-1.5">📝 {r.manager_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

    </Layout>
  )
}
