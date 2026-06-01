import { useState } from 'react'
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'

const VIEWS = ['Day', 'Week', 'Month']

function getBuckets(view) {
  const now = new Date()
  if (view === 'Day') {
    return eachDayOfInterval({ start: subDays(now, 13), end: now })
      .map(d => ({ key: format(d, 'yyyy-MM-dd'), label: format(d, 'd MMM') }))
  }
  if (view === 'Week') {
    return Array.from({ length: 10 }, (_, i) => {
      const d = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 9 - i)
      return { key: format(d, 'yyyy-ww'), label: format(d, 'd MMM') }
    })
  }
  // Month
  return eachMonthOfInterval({ start: subMonths(now, 11), end: now })
    .map(d => ({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') }))
}

function getRequestKey(r, view) {
  const d = new Date(r.created_at)
  if (view === 'Day')   return format(d, 'yyyy-MM-dd')
  if (view === 'Week')  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-ww')
  return format(d, 'yyyy-MM')
}

export default function BarChart({ requests }) {
  const [view, setView] = useState('Month')
  const buckets = getBuckets(view)
  const counts  = buckets.map(b => requests.filter(r => getRequestKey(r, view) === b.key).length)
  const max     = Math.max(...counts, 1)
  const H = 80

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Requests over time</span>
        <div className="flex gap-1">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors
                ${view === v ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end gap-px" style={{ height: H + 28 }}>
        {buckets.map((b, i) => {
          const barH = counts[i] === 0 ? 2 : Math.max(4, Math.round((counts[i] / max) * H))
          return (
            <div key={b.key} className="flex flex-col items-center flex-1 group">
              <div className="relative flex items-end w-full justify-center" style={{ height: H }}>
                {counts[i] > 0 && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                    {counts[i]}
                  </div>
                )}
                <div className="w-full rounded-t transition-all"
                  style={{ height: barH, background: counts[i] > 0 ? '#185FA5' : '#e5e7eb' }} />
              </div>
              <span className="text-gray-400 mt-1 truncate w-full text-center"
                style={{ fontSize: 9 }}>
                {b.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
