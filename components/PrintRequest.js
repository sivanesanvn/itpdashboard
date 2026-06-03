import { NDT_TIMELINE_STEPS } from '../lib/supabase'

export default function PrintRequest({ request: r, docs = [], onClose }) {
  const si = NDT_TIMELINE_STEPS.indexOf(r.status)

  function openPrintTab() {
    const html = generatePrintHTML(r, si, docs)
    const win = window.open('', '_blank')
    if (!win) { alert('Please allow popups for this site to print.'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 500)
  }

  const supportFlags = [
    r.needs_scaffold   && '🏗️ Scaffold',
    r.needs_insulation && '🧱 Insulation removal',
    r.needs_painting   && '🎨 Painting',
  ].filter(Boolean)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold">Print / Save as PDF</h2>
              <p className="text-xs text-gray-400 mt-0.5">Opens in a new tab — use browser Print to save as PDF</p>
            </div>
            <div className="flex gap-2">
              <button onClick={openPrintTab} className="btn btn-primary text-sm">🖨️ Open print view</button>
              <button onClick={onClose} className="btn btn-ghost text-sm">Close</button>
            </div>
          </div>

          {/* Preview inside modal */}
          <div className="p-6 bg-gray-50">
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-sm shadow-sm">

              {/* Header */}
              <div className="flex items-start justify-between mb-5 pb-4 border-b-2 border-gray-800">
                <div>
                  <h1 className="text-xl font-bold">NDT Inspection Request</h1>
                  <p className="text-gray-500 text-xs mt-1">Singapore · Inspection Management System</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-700">{r.request_no}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString('en-SG')}</div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{r.status}</span>
              </div>

              {/* Requester */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Requested by</div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Name',        r.requested_by_name],
                      ['Company',     r.company],
                      ['Email',       r.contact_email],
                      ['Designation', r.requester_position],
                      ['Department',  r.requester_department],
                    ].map(([k, v]) => v && (
                      <tr key={k}><td className="text-gray-400 pr-2 py-0.5 w-28">{k}</td><td className="font-medium">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Site & Scheduling */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Site information</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        ['Location',     r.location],
                        ['Equipment',    r.equipment_no],
                        ['Job category', r.job_category],
                        ['Contact',      r.contact_name],
                        ['Phone',        r.contact_phone],
                      ].map(([k, v]) => v && (
                        <tr key={k}><td className="text-gray-400 pr-2 py-0.5 w-24">{k}</td><td className="font-medium">{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Scheduling</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        ['Date needed',    r.date_needed],
                        ['Priority',       r.priority],
                        ['Scheduled date', r.scheduled_date],
                        ['Technician',     r.tech_name],
                      ].map(([k, v]) => v && (
                        <tr key={k}><td className="text-gray-400 pr-2 py-0.5 w-28">{k}</td><td className="font-medium">{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* NDT Scope */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">NDT Scope</div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['Method',      r.ndt_method],
                      ['Scope / Qty', r.scope_qty],
                      ['Description', r.description],
                    ].map(([k, v]) => v && (
                      <tr key={k}><td className="text-gray-400 pr-2 py-0.5 w-24">{k}</td><td className="font-medium">{v}</td></tr>
                    ))}
                    {r.high_temp && (
                      <tr><td className="text-gray-400 pr-2 py-0.5 w-24">High temp</td><td className="font-medium text-red-600">🌡️ Yes — above 50°C</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Support work requested */}
              {supportFlags.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Support work requested</div>
                  <div className="flex gap-2 flex-wrap">
                    {supportFlags.map(f => (
                      <span key={f} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical details */}
              {r.step2_complete && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Technical details</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        ['Material',      r.material],
                        ['Thickness',     r.thickness_mm ? r.thickness_mm + ' mm' : null],
                        ['Pipe size',     r.pipe_size],
                        ['P-Number',      r.p_number],
                        ['Code/Standard', r.code_standard],
                        ['Acceptance',    r.acceptance],
                        ['Special notes', r.special_notes],
                      ].map(([k, v]) => v && (
                        <tr key={k}><td className="text-gray-400 pr-2 py-0.5 w-28">{k}</td><td className="font-medium">{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Support jobs */}
              {r.support_jobs?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Support work status</div>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1">Type</th>
                        <th className="text-left px-2 py-1">Contractor</th>
                        <th className="text-left px-2 py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.support_jobs.map(sj => (
                        <tr key={sj.id} className="border-t border-gray-100">
                          <td className="px-2 py-1 font-medium">{sj.job_type}</td>
                          <td className="px-2 py-1 text-gray-500">{sj.contractor_name || '—'}</td>
                          <td className="px-2 py-1">{sj.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Attachments */}
              {docs.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attachments</div>
                  <table className="w-full text-xs border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1">File name</th>
                        <th className="text-left px-2 py-1">Type</th>
                        <th className="text-left px-2 py-1">Uploaded by</th>
                        <th className="text-left px-2 py-1">Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(d => (
                        <tr key={d.id} className="border-t border-gray-100">
                          <td className="px-2 py-1 font-medium">{d.file_name}</td>
                          <td className="px-2 py-1 text-gray-500 capitalize">{d.file_type}</td>
                          <td className="px-2 py-1 text-gray-500">{d.uploader_name}</td>
                          <td className="px-2 py-1 text-gray-400">{d.file_size ? (d.file_size / 1024).toFixed(0) + ' KB' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {r.manager_notes && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Manager notes</div>
                  <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">{r.manager_notes}</div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-400">
                <span>NDT Portal · Singapore</span>
                <span>Generated: {new Date().toLocaleString('en-SG')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function generatePrintHTML(r, si, docs) {
  const statuses = NDT_TIMELINE_STEPS
  const timelineHTML = statuses.map((s, i) => {
    const done = i < si, active = i === si
    const bg    = done ? '#1D9E75' : active ? '#185FA5' : '#e5e7eb'
    const color = (done || active) ? '#fff' : '#9ca3af'
    const label = done ? '✓' : String(i + 1)
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;position:relative">
      ${i < statuses.length - 1 ? `<div style="position:absolute;top:10px;left:50%;width:100%;height:2px;background:${done ? '#1D9E75' : '#e5e7eb'}"></div>` : ''}
      <div style="width:20px;height:20px;border-radius:50%;background:${bg};color:${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;position:relative;z-index:1">${label}</div>
      <div style="font-size:8px;color:${done || active ? '#374151' : '#9ca3af'};margin-top:4px;text-align:center;max-width:50px;line-height:1.2">${s}</div>
    </div>`
  }).join('')

  const row = (k, v) => v ? `<tr><td style="color:#6b7280;padding:3px 8px 3px 0;width:130px;white-space:nowrap;vertical-align:top">${k}</td><td style="font-weight:500;padding:3px 0">${v}</td></tr>` : ''

  const supportFlags = [
    r.needs_scaffold   && '🏗️ Scaffold',
    r.needs_insulation && '🧱 Insulation removal',
    r.needs_painting   && '🎨 Painting',
  ].filter(Boolean)

  const supportFlagsHTML = supportFlags.length ? `
    <div style="margin-bottom:16px">
      <div class="section-title">Support work requested</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${supportFlags.map(f => `<span style="font-size:11px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:2px 8px;border-radius:4px">${f}</span>`).join('')}
      </div>
    </div>` : ''

  const supportJobsHTML = r.support_jobs?.length ? `
    <div style="margin-bottom:16px">
      <div class="section-title">Support work status</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;border:1px solid #e5e7eb">
        <thead><tr style="background:#f9fafb">
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Type</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Contractor</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Status</th>
        </tr></thead>
        <tbody>${r.support_jobs.map(sj => `<tr style="border-top:1px solid #f3f4f6">
          <td style="padding:5px 8px;font-weight:500">${sj.job_type}</td>
          <td style="padding:5px 8px;color:#6b7280">${sj.contractor_name || '—'}</td>
          <td style="padding:5px 8px">${sj.status}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''

  const attachmentsHTML = docs.length ? `
    <div style="margin-bottom:16px">
      <div class="section-title">Attachments</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse;border:1px solid #e5e7eb">
        <thead><tr style="background:#f9fafb">
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">File name</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Type</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Uploaded by</th>
          <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb">Size</th>
        </tr></thead>
        <tbody>${docs.map(d => `<tr style="border-top:1px solid #f3f4f6">
          <td style="padding:5px 8px;font-weight:500">${d.file_name}</td>
          <td style="padding:5px 8px;color:#6b7280;text-transform:capitalize">${d.file_type}</td>
          <td style="padding:5px 8px;color:#6b7280">${d.uploader_name || '—'}</td>
          <td style="padding:5px 8px;color:#9ca3af">${d.file_size ? Math.round(d.file_size / 1024) + ' KB' : '—'}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>NDT Request ${r.request_no}</title>
<style>
  @page { margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
  h1 { font-size: 20px; font-weight: bold; margin: 0 0 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  .req-no { font-size: 24px; font-weight: bold; color: #185FA5; }
  .section-title { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  table { width: 100%; font-size: 11px; border-collapse: collapse; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <img src="/cutech_logo.png" style="height:28px;width:auto" alt="Cutech"/>
        <div style="height:28px;width:1px;background:#e5e7eb"></div>
        <div><div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">NDT Portal</div><div style="font-size:9px;color:#6b7280">Singapore · Complete Solution Provider</div></div>
      </div>
      <h1>NDT Inspection Request</h1>
      <div style="margin-top:8px"><span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600">${r.status}</span></div>
    </div>
    <div style="text-align:right">
      <div class="req-no">${r.request_no}</div>
      <div style="color:#6b7280;font-size:11px;margin-top:4px">${new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <div style="margin-bottom:16px">
    <div class="section-title">Progress</div>
    <div style="display:flex;align-items:flex-start">${timelineHTML}</div>
  </div>

  <div style="margin-bottom:16px">
    <div class="section-title">Requested by</div>
    <table><tbody>
      ${row('Name',        r.requested_by_name)}
      ${row('Company',     r.company)}
      ${row('Email',       r.contact_email)}
      ${row('Designation', r.requester_position)}
      ${row('Department',  r.requester_department)}
    </tbody></table>
  </div>

  <div class="grid2">
    <div>
      <div class="section-title">Site information</div>
      <table><tbody>
        ${row('Location',     r.location)}
        ${row('Equipment',    r.equipment_no)}
        ${row('Job category', r.job_category)}
        ${row('Contact',      r.contact_name)}
        ${row('Phone',        r.contact_phone)}
      </tbody></table>
    </div>
    <div>
      <div class="section-title">Scheduling</div>
      <table><tbody>
        ${row('Date needed',    r.date_needed)}
        ${row('Priority',       r.priority)}
        ${row('Scheduled date', r.scheduled_date)}
        ${row('Technician',     r.tech_name)}
      </tbody></table>
    </div>
  </div>

  <div style="margin-bottom:16px">
    <div class="section-title">NDT scope</div>
    <table><tbody>
      ${row('Method',      r.ndt_method)}
      ${row('Scope / Qty', r.scope_qty)}
      ${row('Description', r.description)}
      ${r.high_temp ? row('High temperature', '🌡️ Yes — above 50°C') : ''}
    </tbody></table>
  </div>

  ${supportFlagsHTML}

  ${r.step2_complete ? `<div style="margin-bottom:16px">
    <div class="section-title">Technical details</div>
    <table><tbody>
      ${row('Material',      r.material)}
      ${row('Thickness',     r.thickness_mm ? r.thickness_mm + ' mm' : null)}
      ${row('Pipe size',     r.pipe_size)}
      ${row('P-Number',      r.p_number)}
      ${row('Code/Standard', r.code_standard)}
      ${row('Acceptance',    r.acceptance)}
      ${row('Special notes', r.special_notes)}
    </tbody></table>
  </div>` : ''}

  ${supportJobsHTML}

  ${attachmentsHTML}

  ${r.manager_notes ? `<div style="margin-bottom:16px">
    <div class="section-title">Manager notes</div>
    <div style="background:#f9fafb;padding:8px 10px;border-radius:4px;font-size:11px">${r.manager_notes}</div>
  </div>` : ''}

  <div class="footer">
    <span>NDT Portal · Singapore · Inspection Management System</span>
    <span>Generated: ${new Date().toLocaleString('en-SG')}</span>
  </div>
</body>
</html>`
}
