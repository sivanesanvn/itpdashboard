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

const COLUMNS = [
  {
    key: 'location',
    label: 'Location',
    required: true,
    hint: 'Site / plant / unit number',
    example: 'Tuas Shipyard, Berth 7',
  },
  {
    key: 'ndt_method',
    label: 'NDT Method',
    required: true,
    hint: 'Must match exactly one of the valid methods',
    example: 'MT',
    validValues: NDT_METHODS,
  },
  {
    key: 'date_needed',
    label: 'Date Needed',
    required: true,
    hint: 'Format: YYYY-MM-DD',
    example: '2026-07-15',
  },
  {
    key: 'job_category',
    label: 'Job Category',
    required: false,
    hint: 'Leave blank for none',
    example: 'Ad-Hoc',
    validValues: JOB_CATEGORIES,
  },
  {
    key: 'equipment_no',
    label: 'Equipment No',
    required: false,
    hint: 'Equipment or piping number',
    example: 'V-1201',
  },
  {
    key: 'contact_name',
    label: 'Site Contact Name',
    required: false,
    hint: 'Person on site',
    example: 'Ahmad',
  },
  {
    key: 'contact_phone',
    label: 'Site Contact Phone',
    required: false,
    hint: 'Phone or WhatsApp number',
    example: '+65 9123 4567',
  },
  {
    key: 'scope_qty',
    label: 'Estimated Quantity',
    required: false,
    hint: 'e.g. 50 weld joints, 200 m²',
    example: '50 weld joints',
  },
  {
    key: 'description',
    label: 'Description',
    required: false,
    hint: 'Scope of work, access conditions',
    example: 'MT of butt welds on pressure vessel nozzles',
  },
  {
    key: 'priority',
    label: 'Priority',
    required: false,
    hint: 'Leave blank for Normal',
    example: 'Normal',
    validValues: PRIORITIES,
  },
  {
    key: 'high_temp',
    label: 'High Temp',
    required: false,
    hint: 'Yes or No — above 50°C',
    example: 'No',
    validValues: ['Yes', 'No'],
  },
  {
    key: 'needs_scaffold',
    label: 'Scaffold Required',
    required: false,
    hint: 'Yes or No',
    example: 'No',
    validValues: ['Yes', 'No'],
  },
  {
    key: 'needs_insulation',
    label: 'Insulation Removal Required',
    required: false,
    hint: 'Yes or No',
    example: 'No',
    validValues: ['Yes', 'No'],
  },
  {
    key: 'needs_painting',
    label: 'Painting Required',
    required: false,
    hint: 'Yes or No',
    example: 'No',
    validValues: ['Yes', 'No'],
  },
  {
    key: 'special_notes',
    label: 'Special Notes',
    required: false,
    hint: 'Safety, permits, hazards',
    example: 'Radiation clearance required',
  },
]

// Accept yes/no/true/false/1/0/y/n — case insensitive
function parseYesNo(v) {
  if (!v) return false
  return ['yes', 'y', 'true', '1'].includes(v.toString().trim().toLowerCase())
}

// Case-insensitive match against a list; return the canonical value or the original
function matchValue(v, list) {
  if (!v) return ''
  const lower = v.trim().toLowerCase()
  return list.find(item => item.toLowerCase() === lower) || v.trim()
}

function downloadCSV(includeExample) {
  const headers = COLUMNS.map(c => c.label)
  const rows    = [headers]
  if (includeExample) rows.push(COLUMNS.map(c => c.example))
  const csv = rows.map(r => r.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = includeExample ? 'NDT_Bulk_Request_Sample.csv' : 'NDT_Bulk_Request_Template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []

  // Parse one CSV line respecting quoted fields
  function parseLine(line) {
    const fields = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        fields.push(cur); cur = ''
      } else {
        cur += ch
      }
    }
    fields.push(cur)
    return fields
  }

  const headers = parseLine(lines[0]).map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const fields = parseLine(line)
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (fields[idx] ?? '').trim() })
    rows.push(obj)
  }
  return rows
}

function mapRow(raw) {
  const get = (col) => {
    const v = raw[col.label] ?? raw[col.key] ?? ''
    return v.toString().trim()
  }
  return {
    location:         get(COLUMNS[0]),
    ndt_method:       matchValue(get(COLUMNS[1]), NDT_METHODS),
    date_needed:      get(COLUMNS[2]),
    job_category:     matchValue(get(COLUMNS[3]), JOB_CATEGORIES) || null,
    equipment_no:     get(COLUMNS[4])  || null,
    contact_name:     get(COLUMNS[5])  || null,
    contact_phone:    get(COLUMNS[6])  || null,
    scope_qty:        get(COLUMNS[7])  || null,
    description:      get(COLUMNS[8])  || null,
    priority:         matchValue(get(COLUMNS[9]), PRIORITIES) || 'Normal',
    high_temp:        parseYesNo(get(COLUMNS[10])),
    needs_scaffold:   parseYesNo(get(COLUMNS[11])),
    needs_insulation: parseYesNo(get(COLUMNS[12])),
    needs_painting:   parseYesNo(get(COLUMNS[13])),
    special_notes:    get(COLUMNS[14]) || null,
  }
}

function validateRow(r) {
  const errs = []
  if (!r.location)
    errs.push('Location is required')
  if (!r.ndt_method)
    errs.push('NDT Method is required')
  else if (!NDT_METHODS.includes(r.ndt_method))
    errs.push(`"${r.ndt_method}" is not a valid NDT method — valid: ${NDT_METHODS.join(', ')}`)
  if (!r.date_needed)
    errs.push('Date Needed is required')
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_needed))
    errs.push(`Date "${r.date_needed}" must be YYYY-MM-DD (e.g. 2026-07-15)`)
  if (r.job_category && !JOB_CATEGORIES.includes(r.job_category))
    errs.push(`"${r.job_category}" is not a valid category — valid: ${JOB_CATEGORIES.join(', ')}`)
  if (r.priority && !PRIORITIES.includes(r.priority))
    errs.push(`"${r.priority}" is not a valid priority — valid: ${PRIORITIES.join(', ')}`)
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
  const [guideOpen,  setGuideOpen]  = useState(false)

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
      const mapped = parsed
        .map(raw => { const data = mapRow(raw); return { data, errors: validateRow(data) } })
        .filter(r => r.data.location || r.data.ndt_method) // skip blank rows
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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold mb-1">Bulk Upload Requests</h1>
        <p className="text-sm text-gray-500 mb-6">
          Download the CSV template, fill in your requests (one row per request), then upload to create them all at once.
        </p>

        {/* Step 1 — Download */}
        <div className="card mb-4">
          <div className="section-title">① Get the template</div>
          <p className="text-sm text-gray-500 mb-4">
            Download the blank template and fill it in, or download the sample to see a filled example first.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => downloadCSV(false)}>
              ⬇ Blank Template (.csv)
            </button>
            <button className="btn btn-ghost" onClick={() => downloadCSV(true)}>
              ⬇ Sample with example row (.csv)
            </button>
          </div>
        </div>

        {/* Field reference guide */}
        <div className="card mb-4">
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => setGuideOpen(o => !o)}
          >
            <span className="section-title mb-0">📋 Field reference guide</span>
            <span className="text-gray-400 text-sm">{guideOpen ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {guideOpen && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b-2 border-gray-100">
                    <th className="py-2 px-2 text-gray-500 font-semibold">Column</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold">Required</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold">Example</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold">Valid values / notes</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNS.map(c => (
                    <tr key={c.key} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 font-semibold text-gray-700 whitespace-nowrap">{c.label}</td>
                      <td className="py-2 px-2">
                        {c.required
                          ? <span className="badge bg-red-100 text-red-700">Required</span>
                          : <span className="text-gray-300">Optional</span>}
                      </td>
                      <td className="py-2 px-2 text-gray-500 italic whitespace-nowrap">{c.example}</td>
                      <td className="py-2 px-2 text-gray-500">
                        {c.validValues
                          ? <span className="flex flex-wrap gap-1">
                              {c.validValues.map(v => (
                                <span key={v} className="badge bg-gray-100 text-gray-600">{v}</span>
                              ))}
                            </span>
                          : c.hint}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Step 2 — Upload */}
        <div className="card mb-4">
          <div className="section-title">② Upload your filled CSV</div>
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) { fileRef.current.files = e.dataTransfer.files; handleFile({ target: { files: e.dataTransfer.files } }) } }}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <div className="text-3xl mb-2">📂</div>
            <div className="text-sm text-gray-700 font-medium">Click to select or drag and drop your CSV file</div>
            <div className="text-xs text-gray-400 mt-1">CSV files only</div>
          </div>
        </div>

        {/* Preview */}
        {rows.length > 0 && !submitted && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">③ Preview</div>
              <div className="text-xs flex items-center gap-3">
                {validRows.length > 0   && <span className="text-emerald-600 font-medium">✓ {validRows.length} ready</span>}
                {invalidRows.length > 0 && <span className="text-red-500 font-medium">✗ {invalidRows.length} will be skipped</span>}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    {['#','Location','NDT Method','Date Needed','Priority','Category','Equipment','Status'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-50 ${row.errors.length ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2 max-w-[160px] truncate" title={row.data.location}>{row.data.location || '—'}</td>
                      <td className="py-2 px-2">{row.data.ndt_method || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{row.data.date_needed || '—'}</td>
                      <td className="py-2 px-2">{row.data.priority || 'Normal'}</td>
                      <td className="py-2 px-2">{row.data.job_category || '—'}</td>
                      <td className="py-2 px-2 max-w-[100px] truncate" title={row.data.equipment_no}>{row.data.equipment_no || '—'}</td>
                      <td className="py-2 px-2">
                        {row.errors.length === 0
                          ? <span className="badge bg-emerald-100 text-emerald-700">✓ Ready</span>
                          : <span className="badge bg-red-100 text-red-700">✗ Error</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error detail */}
            {invalidRows.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 space-y-1">
                <div className="font-semibold mb-1">Rows with errors (will be skipped on submit):</div>
                {rows.map((r, i) => r.errors.length > 0 && (
                  <div key={i} className="flex gap-2">
                    <span className="font-medium shrink-0">Row {i + 1}:</span>
                    <span>{r.errors.join(' · ')}</span>
                  </div>
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
          <div className="card mb-4">
            <div className="section-title">Results</div>
            <div className="space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg ${
                  r.skipped ? 'bg-gray-50 text-gray-400'
                  : r.ok    ? 'bg-emerald-50 text-emerald-800'
                  :           'bg-red-50 text-red-700'
                }`}>
                  <span className="font-medium w-14 shrink-0">Row {i + 1}</span>
                  {r.skipped           && <span>Skipped — validation error</span>}
                  {!r.skipped && r.ok  && <span>✓ Created — <span className="font-semibold">{r.requestNo}</span></span>}
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
      </div>
    </Layout>
  )
}
