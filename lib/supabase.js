// v1.5
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createPagesBrowserClient()

export const NDT_STATUSES = [
  'New request',
  'Scaffold erection in progress',
  'Insulation removal in progress',
  'Ready for NDT',
  'NDT scheduled',
  'NDT in progress',
  'Draft report submitted',
  'Draft report accepted',
  'Final report submitted',
  'Reinstatement in progress',
  'Closed',
  'Cancelled',
]

// Statuses that appear in the linear timeline (Cancelled is a side branch)
export const NDT_TIMELINE_STEPS = NDT_STATUSES.filter(s => s !== 'Cancelled')

export const JOB_CATEGORIES = ['Meridium', 'Turn Around', 'Ad-Hoc']

export const SUPPORT_STATUSES = {
  Scaffold:             ['Pending','Erection','Ready to use','Dismantling','Completed'],
  'Insulation Removal': ['Pending','In progress','Ready to use','Completed'],
  Painting:             ['Pending','In progress','Completed'],
}

export const STATUS_COLOR = {
  'New request':                   'bg-blue-100 text-blue-800',
  'Scaffold erection in progress': 'bg-orange-100 text-orange-800',
  'Insulation removal in progress':'bg-yellow-100 text-yellow-800',
  'Ready for NDT':                 'bg-teal-100 text-teal-800',
  'NDT scheduled':                 'bg-purple-100 text-purple-800',
  'NDT in progress':               'bg-amber-100 text-amber-800',
  'Draft report submitted':        'bg-indigo-100 text-indigo-800',
  'Draft report accepted':         'bg-violet-100 text-violet-800',
  'Final report submitted':        'bg-sky-100 text-sky-800',
  'Reinstatement in progress':     'bg-orange-100 text-orange-700',
  'Closed':                        'bg-green-200 text-green-900',
  'Cancelled':                     'bg-red-100 text-red-700',
  'Pending':                       'bg-gray-100 text-gray-600',
  'Erection':                      'bg-orange-100 text-orange-800',
  'Ready to use':                  'bg-green-100 text-green-800',
  'Dismantling':                   'bg-red-100 text-red-800',
  'Completed':                     'bg-green-200 text-green-900',
  'In progress':                   'bg-amber-100 text-amber-800',
}

export const PRIORITY_COLOR = {
  'Normal':                '',
  'Urgent':                'bg-red-100 text-red-700',
  'Shutdown / turnaround': 'bg-red-200 text-red-900',
}

export const ROLE_LABEL = {
  manager:    'NDT Manager',
  coordinator: 'NDT Coordinator',
  client:     'Client',
  tech:       'NDT Technician',
  scaffold:   'Scaffold Contractor',
  insulation: 'Insulation Contractor',
  painting:   'Painting Contractor',
}

export const ROLE_COLOR = {
  manager:    'bg-blue-100 text-blue-800',
  coordinator: 'bg-cyan-100 text-cyan-800',
  client:     'bg-purple-100 text-purple-800',
  tech:       'bg-teal-100 text-teal-800',
  scaffold:   'bg-orange-100 text-orange-800',
  insulation: 'bg-yellow-100 text-yellow-800',
  painting:   'bg-pink-100 text-pink-800',
}

export const NDT_METHODS = [
  'MT',
  'PT',
  'UTG',
  'UT',
  'RT-Profile',
  'RT-Weld',
  'DRT-Profile',
  'PAUT-Weld',
  'PAUT Corrosion Mapping',
  'RMS Corrosion Mapping',
  'TFM',
  'HTHA',
  'PMI',
  'Hardness',
  'LRUT',
  'MFL',
  'Tube Testing',
  'Drone',
  'ROV',
  'PEC',
  'Other',
]
