import { NDT_TIMELINE_STEPS, STATUS_COLOR } from '../lib/supabase'

export function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'
  return <span className={`badge ${color} text-xs`}>{status}</span>
}

// Parallel-track statuses that share the same progress position
const PARALLEL_PAIR = ['Final report submitted', 'Reinstatement in progress']

export function NDTTimeline({ status }) {
  const steps = NDT_TIMELINE_STEPS
  // Both parallel-track statuses map to the same visual index
  const si = PARALLEL_PAIR.includes(status)
    ? steps.indexOf('Final report submitted')
    : steps.indexOf(status)

  return (
    <div className="flex items-start mt-2.5 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i < si, active = i === si
        const isParallelStep = s === 'Final report submitted'
        const label = isParallelStep ? 'Report / Reinstate' : s
        return (
          <div key={s} className="flex-1 flex flex-col items-center relative min-w-[32px]">
            {i < steps.length - 1 && (
              <div className={`absolute top-2.5 left-1/2 w-full h-0.5 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
            <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {done ? '✓' : i + 1}
            </div>
            <div className={`text-center mt-1 leading-tight max-w-[44px]
              ${done || active ? 'text-gray-700' : 'text-gray-400'}`}
              style={{fontSize:'7px'}}>
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SupportJobBadge({ job }) {
  const typeColor = {
    'Scaffold': 'bg-orange-100 text-orange-800',
    'Insulation Removal': 'bg-yellow-100 text-yellow-800',
    'Painting': 'bg-pink-100 text-pink-800',
  }
  return (
    <span className="flex items-center gap-1 flex-wrap">
      <span className={`badge ${typeColor[job.job_type] || 'bg-gray-100 text-gray-600'} text-xs`}>{job.job_type}</span>
      <span className={`badge ${STATUS_COLOR[job.status] || 'bg-gray-100 text-gray-600'} text-xs`}>{job.status}</span>
      {job.contractor_name && <span className="text-xs text-gray-400">— {job.contractor_name}</span>}
    </span>
  )
}
