import { NDT_STATUSES } from '../lib/supabase'

export default function PrintRequest({ request: r, onClose }) {
  const si = NDT_STATUSES.indexOf(r.status)

  function openPrintTab() {
    const win = window.open('', '_blank')
    if (!win) { alert('Please allow popups for this site to print.'); return }
    win.document.write(generatePrintHTML(r, si))
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  const createdDate = r.created_at
    ? new Date(r.created_at).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold">Print / Save as PDF</h2>
            <p className="text-xs text-gray-400 mt-0.5">Opens in a new tab — use browser Print to save as PDF</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openPrintTab} className="btn btn-primary text-sm">🖨️ Open print view</button>
            <button onClick={onClose} className="btn btn-ghost text-sm">Close</button>
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-100">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b-2 border-gray-800 flex items-start justify-between rounded-t-xl">
              <div>
                <img src="/cutech_logo.png" alt="Cutech" style={{ height: '32px', width: 'auto', marginBottom: '6px' }} />
                <div className="text-xl font-black text-gray-900 leading-tight">NDT Inspection Request</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Request ID</div>
                <div className="text-2xl font-black text-[#185FA5] tracking-tight">{r.request_no}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Issued: {createdDate}</div>
              </div>
            </div>

            {/* Status + tags row */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Status:</span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-700 text-white">{r.status}</span>
              {r.priority && r.priority !== 'Normal' && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">⚡ {r.priority}</span>
              )}
            </div>

            <div className="p-6 space-y-5">

              {/* Section A: Requester */}
              <Section title="A. Requester Information">
                <TwoCol>
                  <Field label="Full Name" value={r.requested_by_name} />
                  <Field label="Email" value={r.requester_email} />
                  <Field label="Company / Organisation" value={r.company} />
                  <Field label="Department" value={r.requester_department} />
                  <Field label="Position / Designation" value={r.requester_position} />
                  <Field label="Job Category" value={r.job_category} />
                </TwoCol>
              </Section>

              {/* Section B: Site */}
              <Section title="B. Site & Equipment">
                <TwoCol>
                  <Field label="Site / Plant Location / Unit No." value={r.location} />
                  <Field label="Equipment / Piping No." value={r.equipment_no} />
                  <Field label="Site Contact Person" value={r.contact_name} />
                  <Field label="Contact Phone / WhatsApp" value={r.contact_phone} />
                </TwoCol>
              </Section>

              {/* Section C: NDT Scope */}
              <Section title="C. NDT Scope">
                <TwoCol>
                  <Field label="NDT Method" value={r.ndt_method} />
                  <Field label="Estimated Quantity" value={r.scope_qty} />
                  <Field label="Description of Scope" value={r.description} span />
                </TwoCol>
              </Section>

              {/* Section D: Scheduling */}
              <Section title="D. Scheduling & Priority">
                <TwoCol>
                  <Field label="Date Needed By" value={r.date_needed} />
                  <Field label="Priority" value={r.priority} />
                  {r.high_temp && <Field label="High Temperature Job" value="Yes — surfaces above 50°C" span />}
                  {r.scheduled_date && <Field label="Scheduled Date" value={r.scheduled_date} />}
                  {r.tech_name && <Field label="Assigned Technician" value={r.tech_name} />}
                </TwoCol>
              </Section>

              {/* Support Work */}
              {(r.needs_scaffold || r.needs_insulation || r.needs_painting || r.support_jobs?.length > 0) && (
                <Section title="E. Support Work">
                  <div className="space-y-1">
                    {r.needs_scaffold   && <div className="text-xs font-medium">🏗️ Scaffold erection / dismantling{r.support_jobs?.find(s=>s.job_type==='Scaffold') ? ` — ${r.support_jobs.find(s=>s.job_type==='Scaffold').status}` : ''}</div>}
                    {r.needs_insulation && <div className="text-xs font-medium">🧱 Insulation removal &amp; reinstatement{r.support_jobs?.find(s=>s.job_type==='Insulation') ? ` — ${r.support_jobs.find(s=>s.job_type==='Insulation').status}` : ''}</div>}
                    {r.needs_painting   && <div className="text-xs font-medium">🎨 Painting / surface preparation{r.support_jobs?.find(s=>s.job_type==='Painting') ? ` — ${r.support_jobs.find(s=>s.job_type==='Painting').status}` : ''}</div>}
                  </div>
                </Section>
              )}

              {/* Section F: Technical */}
              {r.step2_complete && (
                <Section title="F. Technical Details">
                  <TwoCol>
                    <Field label="Material / Component Type" value={r.material} />
                    <Field label="Wall Thickness (mm)" value={r.thickness_mm ? r.thickness_mm + ' mm' : null} />
                    <Field label="Pipe / Vessel Size" value={r.pipe_size} />
                    <Field label="P-Number / Material Spec" value={r.p_number} />
                    <Field label="Applicable Code / Standard" value={r.code_standard} />
                    <Field label="Acceptance Criteria" value={r.acceptance} />
                    {r.special_notes && <Field label="Special Requirements / Safety Notes" value={r.special_notes} span />}
                  </TwoCol>
                </Section>
              )}

              {/* Section F: Attachments */}
              {r.documents?.length > 0 && (
                <Section title="F. Attached Documents">
                  <div className="space-y-1">
                    {r.documents.map((doc, i) => (
                      <div key={doc.id} className="flex gap-2 text-xs">
                        <span className="text-gray-400 w-4">{i + 1}.</span>
                        <span className="font-medium flex-1">{doc.file_name}</span>
                        <span className="text-gray-400">{doc.uploader_name}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Manager notes */}
              {r.manager_notes && (
                <Section title="Manager Notes">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-gray-700">{r.manager_notes}</div>
                </Section>
              )}

            </div>

            {/* Computer-generated notice */}
            <div className="px-6 py-2 border-t border-gray-100 text-center text-[9px] text-gray-400 italic">
              This document is computer-generated and therefore does not require an authorized signature.
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end items-center text-[10px] text-gray-400">
              <span>Generated: {new Date().toLocaleString('en-SG')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pb-1 border-b border-gray-100">{title}</div>
      {children}
    </div>
  )
}

function TwoCol({ children }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>
}

function Field({ label, value, span }) {
  if (!value) return null
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs font-medium text-gray-800">{value}</div>
    </div>
  )
}

function generatePrintHTML(r, si) {
  const statuses = NDT_STATUSES
  const createdDate = r.created_at
    ? new Date(r.created_at).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const timelineHTML = statuses.map((s, i) => {
    const done = i < si, active = i === si
    const bg = done ? '#10b981' : active ? '#185FA5' : '#e5e7eb'
    const fg = (done || active) ? '#fff' : '#9ca3af'
    const labelChar = done ? '✓' : String(i + 1)
    const lineColor = done ? '#10b981' : '#e5e7eb'
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative">
      ${i < statuses.length - 1 ? `<div style="position:absolute;top:9px;left:50%;width:100%;height:2px;background:${lineColor}"></div>` : ''}
      <div style="width:18px;height:18px;border-radius:50%;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;position:relative;z-index:1">${labelChar}</div>
      <div style="font-size:8px;color:${done || active ? '#374151' : '#9ca3af'};margin-top:3px;text-align:center;max-width:52px;line-height:1.3;font-weight:${active ? '600' : '400'}">${s}</div>
    </div>`
  }).join('')

  const row = (k, v) => v ? `<tr>
    <td style="color:#6b7280;padding:4px 10px 4px 0;width:160px;white-space:nowrap;vertical-align:top;font-size:10px">${k}</td>
    <td style="font-weight:600;padding:4px 0;font-size:11px;color:#111">${v}</td>
  </tr>` : ''

  const sectionTitle = (letter, title) =>
    `<div style="font-size:10px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:.08em;border-bottom:1.5px solid #185FA5;padding-bottom:4px;margin-bottom:8px">${letter}. ${title}</div>`

  const grid2open = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:4px">`
  const grid2close = `</div>`

  const cell = (label, value) => value ? `<div>
    <div style="font-size:8px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${label}</div>
    <div style="font-size:11px;font-weight:600;color:#111">${value}</div>
  </div>` : ''

  const cellSpan = (label, value) => value ? `<div style="grid-column:span 2">
    <div style="font-size:8px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${label}</div>
    <div style="font-size:11px;font-weight:600;color:#111">${value}</div>
  </div>` : ''

  const attachmentsHTML = r.documents?.length ? `
    <div style="margin-bottom:16px">
      ${sectionTitle('F', 'Attached Documents')}
      ${(r.documents || []).map((doc, i) => `<div style="display:flex;gap:8px;font-size:10px;padding:2px 0">
        <span style="color:#9ca3af;width:16px">${i + 1}.</span>
        <span style="font-weight:600;flex:1">${doc.file_name}</span>
        <span style="color:#6b7280">${doc.uploader_name || '—'}</span>
      </div>`).join('')}
    </div>` : ''

  const supportTypes = [
    r.needs_scaffold   ? { type: 'Scaffold',   label: '🏗️ Scaffold erection / dismantling' }   : null,
    r.needs_insulation ? { type: 'Insulation', label: '🧱 Insulation removal & reinstatement' } : null,
    r.needs_painting   ? { type: 'Painting',   label: '🎨 Painting / surface preparation' }     : null,
  ].filter(Boolean)

  const supportHTML = supportTypes.length ? `
    <div style="margin-bottom:16px">
      ${sectionTitle('E', 'Support Work')}
      ${supportTypes.map(({ type, label }) => {
        const job = r.support_jobs?.find(s => s.job_type === type)
        const detail = job ? ` &nbsp;<span style="color:#6b7280;font-weight:400">${job.contractor_name ? job.contractor_name + ' — ' : ''}${job.status}</span>` : ''
        return `<div style="font-size:10px;font-weight:600;padding:2px 0">${label}${detail}</div>`
      }).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>NDT Inspection Request — ${r.request_no}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>

  <!-- Header -->
  <div style="padding:14px 20px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;margin-bottom:0">
    <div>
      <img src="/cutech_logo.png" alt="Cutech" style="height:28px;width:auto;margin-bottom:5px;display:block" />
      <div style="font-size:20px;font-weight:900;letter-spacing:-.3px;color:#111">NDT Inspection Request</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:9px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:2px">Request ID</div>
      <div style="font-size:26px;font-weight:900;letter-spacing:-1px;color:#185FA5">${r.request_no}</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:2px">Issued: ${createdDate}</div>
    </div>
  </div>

  <!-- Status bar -->
  <div style="background:#f9fafb;padding:7px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;margin-bottom:16px">
    <span style="font-size:9px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:.06em">Status:</span>
    <span style="background:#185FA5;color:#fff;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700">${r.status}</span>
    ${r.priority && r.priority !== 'Normal' ? `<span style="background:#ffedd5;color:#c2410c;border:1px solid #fdba74;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700">⚡ ${r.priority}</span>` : ''}
  </div>

  <!-- Section A: Requester -->
  <div style="margin-bottom:18px">
    ${sectionTitle('A', 'Requester Information')}
    ${grid2open}
      ${cell('Full Name', r.requested_by_name)}
      ${cell('Email', r.requester_email)}
      ${cell('Company / Organisation', r.company)}
      ${cell('Department', r.requester_department)}
      ${cell('Position / Designation', r.requester_position)}
      ${cell('Job Category', r.job_category)}
    ${grid2close}
  </div>

  <!-- Section B: Site -->
  <div style="margin-bottom:18px">
    ${sectionTitle('B', 'Site & Equipment')}
    ${grid2open}
      ${cell('Site / Plant Location / Unit No.', r.location)}
      ${cell('Equipment / Piping No.', r.equipment_no)}
      ${cell('Site Contact Person', r.contact_name)}
      ${cell('Contact Phone / WhatsApp', r.contact_phone)}
    ${grid2close}
  </div>

  <!-- Section C: NDT Scope -->
  <div style="margin-bottom:18px">
    ${sectionTitle('C', 'NDT Scope')}
    ${grid2open}
      ${cell('NDT Method Required', r.ndt_method)}
      ${cell('Estimated Quantity', r.scope_qty)}
      ${cellSpan('Description of Scope', r.description)}
    ${grid2close}
  </div>

  <!-- Section D: Scheduling -->
  <div style="margin-bottom:18px">
    ${sectionTitle('D', 'Scheduling & Priority')}
    ${grid2open}
      ${cell('Date Needed By', r.date_needed)}
      ${cell('Priority', r.priority)}
      ${r.high_temp ? cell('High Temperature Job', 'Yes — surfaces above 50°C') : ''}
      ${cell('Scheduled Date', r.scheduled_date)}
      ${cell('Assigned Technician', r.tech_name)}
    ${grid2close}
  </div>

  ${supportHTML}

  ${r.step2_complete ? `
  <!-- Section F: Technical -->
  <div style="margin-bottom:18px">
    ${sectionTitle('F', 'Technical Details')}
    ${grid2open}
      ${cell('Material / Component Type', r.material)}
      ${cell('Wall Thickness', r.thickness_mm ? r.thickness_mm + ' mm' : null)}
      ${cell('Pipe / Vessel Size', r.pipe_size)}
      ${cell('P-Number / Material Spec', r.p_number)}
      ${cell('Applicable Code / Standard', r.code_standard)}
      ${cell('Acceptance Criteria', r.acceptance)}
      ${cellSpan('Special Requirements / Safety Notes', r.special_notes)}
    ${grid2close}
  </div>` : ''}

  ${attachmentsHTML}

  ${r.manager_notes ? `
  <div style="margin-bottom:18px">
    ${sectionTitle('', 'Manager Notes')}
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;font-size:11px">${r.manager_notes}</div>
  </div>` : ''}

  <!-- Computer-generated notice -->
  <div style="text-align:center;font-size:9px;color:#6b7280;font-style:italic;margin-bottom:10px;padding:6px 0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">
    This document is computer-generated and therefore does not require an authorized signature.
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:flex-end;font-size:9px;color:#9ca3af">
    <span>Generated: ${new Date().toLocaleString('en-SG')}</span>
  </div>

</body>
</html>`
}
