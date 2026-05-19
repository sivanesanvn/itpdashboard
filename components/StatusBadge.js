import { STATUS_COLOR, NDT_STATUSES } from '../lib/supabase'

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

export function NDTTimeline({ status }) {
  const current = NDT_STATUSES.indexOf(status)
  return (
    <div className="flex items-start mt-3">
      {NDT_STATUSES.map((s, i) => {
        const done = i < current, active = i === current
        return (
          <div key={s} className="flex-1 flex flex-col items-center relative">
            {i < NDT_STATUSES.length - 1 && (
              <div className={`absolute top-2.5 left-1/2 w-full h-0.5 z-0 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
            <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-gray-200 text-gray-400'}`}>
              {done ? '✓' : i + 1}
            </div>
            <div className={`text-center mt-1 leading-tight text-[9px] max-w-[52px] ${done || active ? 'text-gray-700' : 'text-gray-400'}`}>
              {s}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SupportJobBadge({ job }) {
  const typeColor = {
    Scaffold: 'bg-orange-100 text-orange-800',
    'Insulation Removal': 'bg-yellow-100 text-yellow-800',
    Painting: 'bg-pink-100 text-pink-800',
  }
  return (
    <div className="flex items-center gap-1.5 text-xs flex-wrap">
      <span className={`badge ${typeColor[job.job_type] || 'bg-gray-100 text-gray-600'}`}>{job.job_type}</span>
      <span className={`badge ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-500'}`}>{job.status}</span>
      {job.contractor_name && <span className="text-gray-400">· {job.contractor_name}</span>}
    </div>
  )
}
