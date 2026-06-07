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

const COLUMNS = [
  { key: 'location',            label: 'Location *',                   required: true,  hint: 'e.g. Tuas Shipyard, Berth 7' },
  { key: 'ndt_method',          label: 'NDT Method *',                 required: true,  hint: NDT_METHODS.join(' | ') },
  { key: 'date_needed',         label: 'Date Needed * (YYYY-MM-DD)',   required: true,  hint: 'e.g. 2026-07-15' },
  { key: 'job_category',        label: 'Job Category',                 required: false, hint: JOB_CATEGORIES.join(' | ') },
  { key: 'equipment_no',        label: 'Equipment / Piping No.',       required: false, hint: 'e.g. V-1201' },
  { key: 'contact_name',        label: 'Site Contact Name',            required: false, hint: '' },
  { key: 'contact_phone',       label: 'Site Contact Phone',           required: false, hint: 'e.g. +65 9xxx xxxx' },
  { key: 'scope_qty',           label: 'Estimated Quantity',           required: false, hint: 'e.g. 50 weld joints' },
  { key: 'description',         label: 'Description of Scope',        required: false, hint: '' },
  { key: 'priority',            label: 'Priority',                     required: false, hint: 'Normal | Urgent | Shutdown / turnaround' },
  { key: 'high_temp',           label: 'High Temp (TRUE/FALSE)',       required: false, hint: 'TRUE or FALSE' },
  { key: 'needs_scaffold',      label: 'Needs Scaffold (TRUE/FALSE)',  required: false, hint: 'TRUE or FALSE' },
  { key: 'needs_insulation',    label: 'Needs Insulation (TRUE/FALSE)',required: false, hint: 'TRUE or FALSE' },
  { key: 'needs_painting',      label: 'Needs Painting (TRUE/FALSE)',  required: false, hint: 'TRUE or FALSE' },
  { key: 'material',            label: 'Material',                     required: false, hint: 'e.g. Carbon steel pipe' },
  { key: 'thickness_mm',        label: 'Thickness (mm)',               required: false, hint: 'e.g. 12.7' },
  { key: 'pipe_size',           label: 'Pipe / Vessel Size',           required: false, hint: 'e.g. 6" NB' },
  { key: 'p_number',            label: 'P-Number / Material Spec',     required: false, hint: 'e.g. P1, ASTM A106 Gr.B' },
  { key: 'code_standard',       label: 'Code / Standard',              required: false, hint: 'e.g. ASME B31.3' },
  { key: 'acceptance',          label: 'Acceptance Criteria',          required: false, hint: 'e.g. No linear indications' },
  { key: 'special_notes',       label: 'Special Notes',                required: false, hint: '' },
]

const BOOL_KEYS = ['high_temp','needs_scaffold','needs_insulation','needs_painting']

function parseBool(v) {
  if (!v) return false
  return v.toString().trim().toLowerCase() === 'true'
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // Handle quoted fields with commas inside
    const fields = []
    let cur = '', inQ = false
    for (let c = 0; c < line.length; c++) {
      if (line[c] === '"') { inQ = !inQ }
      else if (line[c] === ',' && !inQ) { fields.push(cur); cur = '' }
      else { cur += line[c] }
    }
    fields.push(cur)
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (fields[idx] || '').trim() })
    rows.push(obj)
  }
  return rows
}

function mapRow(row, profile, user) {
  // Match header label or key
  const get = (col) => {
    const byKey   = row[col.key]   ?? ''
    const byLabel = row[col.label] ?? ''
    return (byKey || byLabel).trim()
  }
  return {
    location:            get(COLUMNS[0]),
    ndt_method:          get(COLUMNS[1]),
    date_needed:         get(COLUMNS[2]),
    job_category:        get(COLUMNS[3]) || null,
    equipment_no:        get(COLUMNS[4]) || null,
    contact_name:        get(COLUMNS[5]) || null,
    contact_phone:       get(COLUMNS[6]) || null,
    scope_qty:           get(COLUMNS[7]) || null,
    description:         get(COLUMNS[8]) || null,
    priority:            get(COLUMNS[9]) || 'Normal',
    high_temp:           parseBool(get(COLUMNS[10])),
    needs_scaffold:      parseBool(get(COLUMNS[11])),
    needs_insulation:    parseBool(get(COLUMNS[12])),
    needs_painting:      parseBool(get(COLUMNS[13])),
    material:            get(COLUMNS[14]) || null,
    thickness_mm:        get(COLUMNS[15]) || null,
    pipe_size:           get(COLUMNS[16]) || null,
    p_number:            get(COLUMNS[17]) || null,
    code_standard:       get(COLUMNS[18]) || null,
    acceptance:          get(COLUMNS[19]) || null,
    special_notes:       get(COLUMNS[20]) || null,
  }
}

function validateRow(r, idx) {
  const errs = []
  if (!r.location)    errs.push('Location required')
  if (!r.ndt_method)  errs.push('NDT Method required')
  if (!NDT_METHODS.includes(r.ndt_method) && r.ndt_method)
    errs.push(`Unknown NDT method "${r.ndt_method}"`)
  if (!r.date_needed) errs.push('Date Needed required')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_needed))
    errs.push('Date must be YYYY-MM-DD')
  if (r.job_category && !JOB_CATEGORIES.includes(r.job_category))
    errs.push(`Unknown job category "${r.job_category}"`)
  return errs
}

function downloadTemplate() {
  const keys = COLUMNS.map(c => c.key)
  const labels = COLUMNS.map(c => c.label)
  const hints  = COLUMNS.map(c => c.hint)
  // 3 rows: header, hint row (commented), one example row
  const example = [
    'Tuas Shipyard Berth 7',
    'MT',
    '2026-07-15',
    'Ad-Hoc',
    'V-1201',
    'Ahmad',
    '+65 9123 4567',
    '50 weld joints',
    'Visual and MT of welds',
    'Normal',
    'FALSE',
    'FALSE',
    'FALSE',
    'FALSE',
    'Carbon steel pipe',
    '12.7',
    '6" NB',
    'P1',
    'ASME B31.3',
    'No linear indications',
    'Radiation area — obtain clearance',
  ]

  const csvContent = [
    labels.join(','),
    hints.map(h => `"${h}"`).join(','),
    example.map(v => `"${v}"`).join(','),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'ndt_bulk_request_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function BulkUpload() {
  const router = useRouter()
  const fileRef = useRef()
  const [profile, setProfile] = useState(null)
  const [user, setUser]       = useState(null)
  const [rows, setRows]       = useState([])   // parsed rows with validation
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults]       = useState([]) // per-row submit result
  const [submitted, setSubmitted]   = useState(false)

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
      const parsed = parseCSV(ev.target.result)
      const mapped = parsed.map((raw, i) => {
        const data   = mapRow(raw, profile, user)
        const errors = validateRow(data, i)
        return { data, errors, raw }
      })
      setRows(mapped)
      setResults([])
      setSubmitted(false)
    }
    reader.readAsText(file)
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
        material:             row.data.material,
        thickness_mm:         row.data.thickness_mm,
        pipe_size:            row.data.pipe_size,
        p_number:             row.data.p_number,
        code_standard:        row.data.code_standard,
        acceptance:           row.data.acceptance,
        special_notes:        row.data.special_notes,
        step2_complete:       !!(row.data.material || row.data.code_standard),
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
        <p className="text-sm text-gray-500 mb-6">Download the CSV template, fill in your requests (one per row), then upload to create them all at once.</p>

        {/* Step 1 — Download template */}
        <div className="card mb-5">
          <div className="section-title">① Download template</div>
          <p className="text-sm text-gray-500 mb-3">
            The CSV has columns for all request fields. The second row contains hints — delete it before uploading.
          </p>
          <button className="btn btn-primary" onClick={downloadTemplate}>
            ⬇ Download CSV Template
          </button>
        </div>

        {/* Step 2 — Upload filled CSV */}
        <div className="card mb-5">
          <div className="section-title">② Upload filled CSV</div>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm text-gray-600 font-medium">Click to select your filled CSV file</div>
            <div className="text-xs text-gray-400 mt-1">CSV files only · Max 5 MB</div>
          </div>
        </div>

        {/* Preview table */}
        {rows.length > 0 && !submitted && (
          <div className="card mb-5">
            <div className="section-title flex items-center justify-between">
              <span>③ Preview — {rows.length} row{rows.length !== 1 ? 's' : ''} found</span>
              <span className="text-xs font-normal normal-case tracking-normal">
                {validRows.length > 0 && <span className="text-emerald-600 mr-2">✓ {validRows.length} valid</span>}
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
                          : <span className="badge bg-red-100 text-red-700" title={row.errors.join(', ')}>✗ {row.errors[0]}</span>
                        }
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
                  r.skipped ? 'bg-gray-50 text-gray-400' :
                  r.ok      ? 'bg-emerald-50 text-emerald-800' :
                              'bg-red-50 text-red-700'
                }`}>
                  <span className="font-medium w-16">Row {i + 1}</span>
                  {r.skipped && <span>Skipped (validation error)</span>}
                  {!r.skipped && r.ok && <span>✓ Created — <span className="font-semibold">{r.requestNo}</span></span>}
                  {!r.skipped && !r.ok && <span>✗ Failed: {r.error}</span>}
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

        {/* Column reference */}
        <details className="card mb-5 cursor-pointer">
          <summary className="section-title cursor-pointer select-none">📋 Column reference</summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Column</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Required</th>
                  <th className="text-left py-1.5 px-2 text-gray-400 font-medium">Accepted values / hint</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map(c => (
                  <tr key={c.key} className="border-b border-gray-50">
                    <td className="py-1.5 px-2 font-medium text-gray-700">{c.label}</td>
                    <td className="py-1.5 px-2">{c.required ? <span className="badge bg-red-100 text-red-700">Yes</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="py-1.5 px-2 text-gray-500 max-w-xs truncate" title={c.hint}>{c.hint || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </Layout>
  )
}
