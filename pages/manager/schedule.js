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

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getMonthGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), outside: true })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), outside: false })
  let next = 1
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, next++), outside: true })
  return cells
}

function getWeekDays(ref) {
  const dow = ref.getDay()
  return Array.from({ length: 7 }, (_, i) =>
    new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow + i)
  )
}

function RequestCard({ r, rescheduling, form, saving, techs, onReschedule, onFormChange, onSave, onCancel }) {
  const editing = rescheduling === r.id
  return (
    <div className="card">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-blue-700">{r.request_no}</span>
        <span className="text-sm">{r.company}</span>
        <StatusBadge status={r.status} />
        <button onClick={() => editing ? onCancel() : onReschedule(r)} className="ml-auto btn btn-ghost text-xs">
          {editing ? 'Cancel' : '📅 Reschedule'}
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
      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <label className="label">New date</label>
            <input type="date" className="input" value={form.date}
              onChange={e => onFormChange({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Technician</label>
            <select className="input" value={form.techId}
              onChange={e => onFormChange({ ...form, techId: e.target.value })}>
              <option value="">— Unassigned —</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Manager notes</label>
            <textarea className="input" rows={2} value={form.notes}
              onChange={e => onFormChange({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => onSave(r)} disabled={saving || !form.date} className="btn btn-primary text-xs flex-1">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={onCancel} className="btn btn-ghost text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ManagerSchedule() {
  const router = useRouter()
  const [profile, setProfile]       = useState(null)
  const [requests, setRequests]     = useState([])
  const [techs, setTechs]           = useState([])
  const [view, setView]             = useState('month')
  const [refDate, setRefDate]       = useState(new Date())
  const [rescheduling, setRescheduling] = useState(null)
  const [form, setForm]             = useState({ date: '', techId: '', notes: '' })
  const [saving, setSaving]         = useState(false)

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

  const byDate = requests.reduce((acc, r) => {
    if (!acc[r.scheduled_date]) acc[r.scheduled_date] = []
    acc[r.scheduled_date].push(r); return acc
  }, {})

  function navigate(dir) {
    setRefDate(prev => {
      const d = new Date(prev)
      if (view === 'month')     d.setMonth(d.getMonth() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else                      d.setDate(d.getDate() + dir)
      return d
    })
  }

  function selectDay(date) {
    setRefDate(date)
    setView('day')
  }

  function headerLabel() {
    if (view === 'month') return `${MONTHS[refDate.getMonth()]} ${refDate.getFullYear()}`
    if (view === 'week') {
      const days = getWeekDays(refDate)
      const s = days[0], e = days[6]
      return s.getMonth() === e.getMonth()
        ? `${MONTHS[s.getMonth()]} ${s.getFullYear()}`
        : `${MONTHS[s.getMonth()]} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
    }
    return refDate.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const todayStr   = toDateStr(new Date())
  const cardProps  = {
    rescheduling, form, saving, techs,
    onReschedule: startReschedule,
    onFormChange: setForm,
    onSave: saveReschedule,
    onCancel: () => setRescheduling(null),
  }

  return (
    <Layout profile={profile} nav={NAV(0)}>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="btn btn-ghost text-lg px-2 leading-none">‹</button>
          <span className="font-semibold text-base min-w-[210px] text-center">{headerLabel()}</span>
          <button onClick={() => navigate(1)}  className="btn btn-ghost text-lg px-2 leading-none">›</button>
          <button onClick={() => setRefDate(new Date())} className="btn btn-ghost text-xs ml-2">Today</button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[['month','Month'],['week','Week'],['day','Day']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
                ${view === v ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Month view ── */}
      {view === 'month' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-100">
            {getMonthGrid(refDate.getFullYear(), refDate.getMonth()).map((cell, i) => {
              const ds      = toDateStr(cell.date)
              const dayReqs = byDate[ds] || []
              const isToday = ds === todayStr
              return (
                <div key={i} onClick={() => selectDay(cell.date)}
                  className={`border-r border-b border-gray-100 min-h-[90px] p-1.5 cursor-pointer hover:bg-blue-50 transition-colors
                    ${cell.outside ? 'bg-gray-50/60' : 'bg-white'}`}>
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-700 text-white' : cell.outside ? 'text-gray-300' : 'text-gray-700'}`}>
                    {cell.date.getDate()}
                  </div>
                  {dayReqs.slice(0, 3).map(r => (
                    <div key={r.id} className="text-xs bg-blue-100 text-blue-700 rounded px-1 mb-0.5 truncate leading-4">
                      {r.request_no}
                    </div>
                  ))}
                  {dayReqs.length > 3 && (
                    <div className="text-xs text-gray-400">+{dayReqs.length - 3} more</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Week view ── */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays(refDate).map((day, i) => {
            const ds      = toDateStr(day)
            const dayReqs = byDate[ds] || []
            const isToday = ds === todayStr
            return (
              <div key={i}>
                <div onClick={() => selectDay(day)}
                  className={`text-center py-1.5 rounded-lg mb-2 cursor-pointer select-none
                    ${isToday ? 'bg-blue-700 text-white' : 'bg-gray-50 text-gray-600 hover:bg-blue-50'}`}>
                  <div className="text-xs">{DAYS[day.getDay()]}</div>
                  <div className="text-sm font-semibold">{day.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {dayReqs.map(r => (
                    <div key={r.id} onClick={() => selectDay(day)}
                      className="bg-blue-50 border border-blue-100 rounded p-1.5 cursor-pointer hover:bg-blue-100">
                      <div className="text-xs font-semibold text-blue-700 truncate">{r.request_no}</div>
                      <div className="text-xs text-gray-500 truncate">{r.ndt_method}</div>
                      {r.tech_name && <div className="text-xs text-gray-400 truncate">👷 {r.tech_name}</div>}
                    </div>
                  ))}
                  {dayReqs.length === 0 && (
                    <div className="text-xs text-gray-300 text-center pt-3">—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Day view ── */}
      {view === 'day' && (() => {
        const ds      = toDateStr(refDate)
        const dayReqs = byDate[ds] || []
        return dayReqs.length === 0
          ? <div className="card text-center text-gray-400 py-10">No jobs scheduled for this day.</div>
          : <div className="space-y-3">{dayReqs.map(r => <RequestCard key={r.id} r={r} {...cardProps} />)}</div>
      })()}

    </Layout>
  )
}
