import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createPagesBrowserClient()

export const NDT_STATUSES = [
  'New request',
  'Scheduled',
  'Site Work On-going',
  'Site work completed',
  'Draft Report Submitted',
  'Revision Required',
  'Draft Report Accepted',
  'Report accepted',
]

export const JOB_CATEGORIES = ['Meridium', 'Turn Around', 'Ad-Hoc']

export const SUPPORT_STATUSES = {
  Scaffold:             ['Pending','Erection','Ready to use','Dismantling','Completed'],
  'Insulation Removal': ['Pending','In progress','Ready to use','Completed'],
  Painting:             ['Pending','In progress','Completed'],
}

export const STATUS_COLOR = {
  'New request':          'bg-blue-100 text-blue-800',
  'Scheduled':            'bg-purple-100 text-purple-800',
  'Site Work On-going':   'bg-amber-100 text-amber-800',
  'Site work completed':  'bg-teal-100 text-teal-800',
  'Draft Report Submitted': 'bg-indigo-100 text-indigo-800',
  'Revision Required':    'bg-red-100 text-red-800',
  'Draft Report Accepted':'bg-green-100 text-green-800',
  'Report accepted':      'bg-green-200 text-green-900',
  'Pending':              'bg-gray-100 text-gray-600',
  'Erection':             'bg-orange-100 text-orange-800',
  'Ready to use':         'bg-green-100 text-green-800',
  'Dismantling':          'bg-red-100 text-red-800',
  'Completed':            'bg-green-200 text-green-900',
  'In progress':          'bg-amber-100 text-amber-800',
}

export const PRIORITY_COLOR = {
  'Normal':                '',
  'Urgent':                'bg-red-100 text-red-700',
  'Shutdown / turnaround': 'bg-red-200 text-red-900',
}

export const ROLE_LABEL = {
  manager:    'NDT Manager',
  client:     'Client',
  tech:       'NDT Technician',
  scaffold:   'Scaffold Contractor',
  insulation: 'Insulation Contractor',
  painting:   'Painting Contractor',
}

export const ROLE_COLOR = {
  manager:    'bg-blue-100 text-blue-800',
  client:     'bg-purple-100 text-purple-800',
  tech:       'bg-teal-100 text-teal-800',
  scaffold:   'bg-orange-100 text-orange-800',
  insulation: 'bg-yellow-100 text-yellow-800',
  painting:   'bg-pink-100 text-pink-800',
}

export const NDT_METHODS = [
  'UT — Ultrasonic Testing',
  'RT — Radiographic Testing',
  'MT — Magnetic Particle Testing',
  'PT — Penetrant Testing',
  'VT — Visual Testing',
  'TOFD',
  'Phased Array UT',
  'MFL — Magnetic Flux Leakage',
  'Other / Not sure',
]
