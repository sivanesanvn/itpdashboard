import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_METHODS, JOB_CATEGORIES } from '../../lib/supabase'
import Layout from '../../components/Layout'

const CLIENT_NAV = [
  { href: '/client/requests',     label: 'Dashboard',    icon: '📊' },
  { href: '/client/all-requests', label: 'All Requests', icon: '📋' },
  { href: '/client/new',          label: 'New Request',  icon: '➕' },
  { href: '/client/bulk',         label: 'Bulk Upload',  icon: '📤' },
]

const COORDINATOR_NAV = [
  { href: '/coordinator/dashboard', label: 'Dashboard',    icon: '📊' },
  { href: '/coordinator/requests',  label: 'All Requests', icon: '📋' },
  { href: '/client/new',            label: 'New Request',  icon: '➕' },
  { href: '/client/bulk',           label: 'Bulk Upload',  icon: '📤' },
]

const PRIORITIES = ['Normal', 'Urgent', 'Shutdown / turnaround']
const YES_NO     = ['Yes', 'No']

// Columns in the data sheet (no technical fields)
const COLUMNS = [
  { key: 'location',       label: 'Location',                required: true  },
  { key: 'ndt_method',     label: 'NDT Method',              required: true  },
  { key: 'date_needed',    label: 'Date Needed (YYYY-MM-DD)', required: true  },
  { key: 'job_category',   label: 'Job Category',            required: false },
  { key: 'equipment_no',   label: 'Equipment / Piping No.',  required: false },
  { key: 'contact_name',   label: 'Site Contact Name',       required: false },
  { key: 'contact_phone',  label: 'Site Contact Phone',      required: false },
  { key: 'scope_qty',      label: 'Estimated Quantity',      required: false },
  { key: 'description',    label: 'Description of Scope',    required: false },
  { key: 'priority',       label: 'Priority',                required: false },
  { key: 'high_temp',      label: 'High Temperature Job',    required: false },
  { key: 'needs_scaffold', label: 'Scaffold Required',       required: false },
  { key: 'needs_insulation', label: 'Insulation Removal Required', required: false },
  { key: 'needs_painting', label: 'Painting Required',       required: false },
  { key: 'special_notes',  label: 'Special Notes / Safety',  required: false },
]

function parseYesNo(v) {
  if (!v) return false
  return v.toString().trim().toLowerCase() === 'yes'
}

async function downloadTemplate() {
  try {
    const XLSX = (await import('xlsx')).default

    // Inline dropdown strings (work with free SheetJS)
    const ndtList = '"' + NDT_METHODS.join(',') + '"'
    const catList = '"' + JOB_CATEGORIES.join(',') + '"'
    const priList = '"' + PRIORITIES.join(',') + '"'
    const ynList  = '"Yes,No"'

    // ── Data sheet ──────────────────────────────────────────────────────
    const headers = COLUMNS.map(c => c.label)
    const dataWs  = XLSX.utils.aoa_to_sheet([headers])

    // Column widths
    dataWs['!cols'] = COLUMNS.map(c => ({
      wch: ['location','description','special_notes'].includes(c.key) ? 42 : 24,
    }))

    // Freeze header row
    dataWs['!freeze'] = { xSplit: 0, ySplit: 1 }

    // Style header row: white bold text on brand blue (#185FA5)
    COLUMNS.forEach((_, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: ci })
      if (!dataWs[addr]) return
      dataWs[addr].s = {
        font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill:      { fgColor: { rgb: '185FA5' }, patternType: 'solid' },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      }
    })

    // Data-validation dropdowns (rows 2–201)
    const colLetter = (key) => XLSX.utils.encode_col(COLUMNS.findIndex(c => c.key === key))
    const dv = (key, list) => ({
      sqref: `${colLetter(key)}2:${colLetter(key)}201`,
      type: 'list', formula1: list,
      showErrorMessage: true, errorTitle: 'Invalid value', error: 'Please select from the dropdown list.',
    })

    dataWs['!dataValidation'] = [
      dv('ndt_method',       ndtList),
      dv('job_category',     catList),
      dv('priority',         priList),
      dv('high_temp',        ynList),
      dv('needs_scaffold',   ynList),
      dv('needs_insulation', ynList),
      dv('needs_painting',   ynList),
    ]

    // ── Guide sheet ─────────────────────────────────────────────────────
    const noteFor = (key) => ({
      ndt_method:       'Select from dropdown — ' + NDT_METHODS.join(', '),
      job_category:     'Select from dropdown — ' + JOB_CATEGORIES.join(', '),
      priority:         'Select from dropdown — Normal / Urgent / Shutdown / turnaround (default: Normal)',
      high_temp:        'Select Yes or No',
      needs_scaffold:   'Select Yes or No',
      needs_insulation: 'Select Yes or No',
      needs_painting:   'Select Yes or No',
      date_needed:      'Format: YYYY-MM-DD  e.g. 2026-07-15',
      location:         'e.g. Tuas Shipyard, Berth 7 / Unit 3',
      equipment_no:     'e.g. V-1201, P-4401A',
      contact_phone:    'e.g. +65 9123 4567',
      scope_qty:        'e.g. 50 weld joints, 200 m²',
    })[key] || ''

    const guideRows = [
      ['NDT Bulk Request Form — How to Fill'],
      [],
      ['STEP 1', 'Open the "Requests" sheet (tab at the bottom). Each row = one NDT request.'],
      ['STEP 2', 'Click any dropdown cell to pick from the list. Fill in text fields directly.'],
      ['STEP 3', 'Save the file, then upload it on the NDT portal Bulk Upload page.'],
      [],
      ['Column', 'Required?', 'Notes'],
      ...COLUMNS.map(c => [c.label, c.required ? 'YES *' : 'Optional', noteFor(c.key)]),
      [],
      ['* Rows missing required fields will be skipped during upload.'],
    ]

    const guideWs = XLSX.utils.aoa_to_sheet(guideRows)
    guideWs['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 72 }]
    if (guideWs['A1']) guideWs['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '185FA5' } } }
    ;['A7','B7','C7'].forEach(addr => {
      if (!guideWs[addr]) return
      guideWs[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '185FA5' }, patternType: 'solid' },
      }
    })

    // ── Assemble workbook ───────────────────────────────────────────────
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, dataWs,  'Requests')
    XLSX.utils.book_append_sheet(wb, guideWs, 'Guide')

    XLSX.writeFile(wb, 'NDT_Bulk_Request_Template.xlsx', { cellStyles: true })
  } catch (err) {
    alert('Could not generate template: ' + err.message)
  }
}

function parseXLSX(buffer) {
  const XLSX = require('xlsx')
  const wb   = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws   = wb.Sheets['Requests']
  if (!ws) throw new Error('No "Requests" sheet found in the uploaded file.')
  const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return raw
}

function mapRow(raw) {
  const get = (label) => {
    const col = COLUMNS.find(c => c.label === label)
    const v   = raw[label] ?? raw[col?.key] ?? ''
    return v.toString().trim()
  }
  return {
    location:         get('Location'),
    ndt_method:       get('NDT Method'),
    date_needed:      get('Date Needed (YYYY-MM-DD)'),
    job_category:     get('Job Category')  || null,
    equipment_no:     get('Equipment / Piping No.')  || null,
    contact_name:     get('Site Contact Name')       || null,
    contact_phone:    get('Site Contact Phone')      || null,
    scope_qty:        get('Estimated Quantity')      || null,
    description:      get('Description of Scope')   || null,
    priority:         get('Priority') || 'Normal',
    high_temp:        parseYesNo(get('High Temperature Job')),
    needs_scaffold:   parseYesNo(get('Scaffold Required')),
    needs_insulation: parseYesNo(get('Insulation Removal Required')),
    needs_painting:   parseYesNo(get('Painting Required')),
    special_notes:    get('Special Notes / Safety') || null,
  }
}

function validateRow(r) {
  const errs = []
  if (!r.location)   errs.push('Location required')
  if (!r.ndt_method) errs.push('NDT Method required')
  else if (!NDT_METHODS.includes(r.ndt_method))
    errs.push(`Unknown NDT method "${r.ndt_method}"`)
  if (!r.date_needed) errs.push('Date Needed required')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_needed))
    errs.push('Date must be YYYY-MM-DD')
  if (r.job_category && !JOB_CATEGORIES.includes(r.job_category))
    errs.push(`Unknown category "${r.job_category}"`)
  if (r.priority && !PRIORITIES.includes(r.priority))
    errs.push(`Unknown priority "${r.priority}"`)
  return errs
}

export default function BulkUpload() {
  const router  = useRouter()
  const fileRef = useRef()
  const [profile,    setProfile]    = useState(null)
  const [user,       setUser]       = useState(null)
  const [rows,       setRows]       = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [results,    setResults]    = useState([])
  const [submitted,  setSubmitted]  = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager','coordinator'].includes(p.role)) { router.push('/'); return }
    setProfile(p); setUser(u)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseXLSX(ev.target.result)
        const mapped = parsed.map((raw) => {
          const data   = mapRow(raw)
          const errors = validateRow(data)
          return { data, errors }
        }).filter(r => r.data.location || r.data.ndt_method) // skip fully empty rows
        setRows(mapped)
        setResults([])
        setSubmitted(false)
      } catch (err) {
        alert('Could not read file: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const validRows   = rows.filter(r => r.errors.length === 0)
  const invalidRows = rows.filter(r => r.errors.length > 0)

  async function submitAll() {
    if (!validRows.length) return
    setSubmitting(true)
    const res = []
    for (const row of rows) {
      if (row.errors.length > 0) { res.push({ skipped: true }); continue }
      const { data: r, error } = await supabase.from('requests').insert({
        client_id:            user.id,
        company:              profile.company || profile.full_name,
        location:             row.data.location,
        equipment_no:         row.data.equipment_no,
        contact_name:         row.data.contact_name,
        contact_phone:        row.data.contact_phone,
        contact_email:        user.email,
        requested_by_id:      user.id,
        requested_by_name:    profile.full_name,
        ndt_method:           row.data.ndt_method,
        scope_qty:            row.data.scope_qty,
        description:          row.data.description,
        date_needed:          row.data.date_needed,
        priority:             row.data.priority,
        high_temp:            row.data.high_temp,
        needs_scaffold:       row.data.needs_scaffold,
        needs_insulation:     row.data.needs_insulation,
        needs_painting:       row.data.needs_painting,
        job_category:         row.data.job_category,
        requester_position:   profile.position   || null,
        requester_department: profile.department || null,
        special_notes:        row.data.special_notes,
        step2_complete:       false,
      }).select().single()
      res.push({ ok: !error, requestNo: r?.request_no, error: error?.message })
    }
    setResults(res)
    setSubmitting(false)
    setSubmitted(true)
  }

  function reset() {
    setRows([]); setResults([]); setSubmitted(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const nav = profile.role === 'coordinator' ? COORDINATOR_NAV : CLIENT_NAV

  return (
    <Layout profile={profile} nav={nav}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Bulk Upload Requests</h1>
        <p className="text-sm text-gray-500 mb-6">
          Download the Excel template, fill in your requests (one row per request), then upload to create them all at once.
        </p>

        {/* Step 1 — Download */}
        <div className="card mb-5">
          <div className="section-title">① Download Excel template</div>
          <p className="text-sm text-gray-500 mb-3">
            The template includes dropdown selections for NDT method, category, priority and yes/no fields, plus a Guide sheet with instructions.
          </p>
          <button className="btn btn-primary" onClick={downloadTemplate}>
            ⬇ Download Excel Template (.xlsx)
          </button>
        </div>

        {/* Step 2 — Upload */}
        <div className="card mb-5">
          <div className="section-title">② Upload filled Excel file</div>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm text-gray-600 font-medium">Click to select your filled Excel file</div>
            <div className="text-xs text-gray-400 mt-1">.xlsx or .xls · Max 10 MB</div>
          </div>
        </div>

        {/* Preview */}
        {rows.length > 0 && !submitted && (
          <div className="card mb-5">
            <div className="section-title flex items-center justify-between">
              <span>③ Preview — {rows.length} row{rows.length !== 1 ? 's' : ''} found</span>
              <span className="text-xs font-normal normal-case tracking-normal">
                {validRows.length > 0   && <span className="text-emerald-600 mr-2">✓ {validRows.length} valid</span>}
                {invalidRows.length > 0 && <span className="text-red-500">✗ {invalidRows.length} with errors (will be skipped)</span>}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-400 font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Location</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">NDT Method</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Date Needed</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Priority</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Category</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Equipment</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${row.errors.length ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2 max-w-[160px] truncate" title={row.data.location}>{row.data.location || '—'}</td>
                      <td className="py-2 px-2">{row.data.ndt_method || '—'}</td>
                      <td className="py-2 px-2">{row.data.date_needed || '—'}</td>
                      <td className="py-2 px-2">{row.data.priority || 'Normal'}</td>
                      <td className="py-2 px-2">{row.data.job_category || '—'}</td>
                      <td className="py-2 px-2 max-w-[120px] truncate" title={row.data.equipment_no}>{row.data.equipment_no || '—'}</td>
                      <td className="py-2 px-2">
                        {row.errors.length === 0
                          ? <span className="badge bg-emerald-100 text-emerald-700">✓ Ready</span>
                          : <span className="badge bg-red-100 text-red-700" title={row.errors.join(', ')}>✗ {row.errors[0]}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-xs text-red-700">
                <div className="font-semibold mb-1">Rows with errors (will be skipped):</div>
                {rows.map((r, i) => r.errors.length > 0 && (
                  <div key={i}>Row {i + 1}: {r.errors.join(' · ')}</div>
                ))}
              </div>
            )}

            {validRows.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                <button className="btn btn-primary" onClick={submitAll} disabled={submitting}>
                  {submitting ? 'Creating requests…' : `✅ Create ${validRows.length} request${validRows.length !== 1 ? 's' : ''}`}
                </button>
                <button className="btn btn-ghost" onClick={reset}>Clear</button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {submitted && (
          <div className="card mb-5">
            <div className="section-title">Results</div>
            <div className="space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${
                  r.skipped ? 'bg-gray-50 text-gray-400'
                  : r.ok    ? 'bg-emerald-50 text-emerald-800'
                  :           'bg-red-50 text-red-700'
                }`}>
                  <span className="font-medium w-16">Row {i + 1}</span>
                  {r.skipped             && <span>Skipped (validation error)</span>}
                  {!r.skipped &&  r.ok   && <span>✓ Created — <span className="font-semibold">{r.requestNo}</span></span>}
                  {!r.skipped && !r.ok   && <span>✗ Failed: {r.error}</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-primary" onClick={() => router.push(profile.role === 'coordinator' ? '/coordinator/requests' : '/client/requests')}>
                View all requests →
              </button>
              <button className="btn btn-ghost" onClick={reset}>Upload another file</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
