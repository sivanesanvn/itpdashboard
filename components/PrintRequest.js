import { NDT_STATUSES } from '../lib/supabase'

export default function PrintRequest({ request: r, onClose }) {
  const si = NDT_STATUSES.indexOf(r.status)

  function print() {
    window.print()
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 no-print">
            <h2 className="font-semibold">Print / Save as PDF</h2>
            <div className="flex gap-2">
              <button onClick={print} className="btn btn-primary text-sm">🖨️ Print / Save PDF</button>
              <button onClick={onClose} className="btn btn-ghost text-sm">Close</button>
            </div>
          </div>

          {/* Printable content */}
          <div id="print-area" className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-800">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">NDT Inspection Request</h1>
                <p className="text-gray-500 text-sm mt-1">Singapore · Inspection Management System</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-700">{r.request_no}</div>
                <div className="text-xs text-gray-500 mt-1">Date: {new Date().toLocaleDateString('en-SG')}</div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Status</div>
              <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {r.status}
              </div>
            </div>

            {/* Status timeline */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Progress</div>
              <div className="flex items-start">
                {NDT_STATUSES.map((s, i) => {
                  const done = i < si, active = i === si
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center relative">
                      {i < NDT_STATUSES.length - 1 && (
                        <div className={`absolute top-3 left-1/2 w-full h-0.5 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <div className={`text-center mt-1 text-[9px] leading-tight max-w-[52px] ${done || active ? 'text-gray-700' : 'text-gray-400'}`}>
                        {s}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Client & Site */}
            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Client Information</div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Company', r.company],
                      ['Contact', r.contact_name],
                      ['Phone', r.contact_phone],
                      ['Email', r.contact_email],
                      ['Location', r.location],
                    ].map(([k, v]) => v && (
                      <tr key={k}>
                        <td className="text-gray-500 pr-3 py-0.5 whitespace-nowrap">{k}</td>
                        <td className="font-medium py-0.5">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Scheduling</div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Date needed', r.date_needed],
                      ['Priority', r.priority],
                      ['Scheduled', r.scheduled_date],
                      ['Technician', r.tech_name],
                    ].map(([k, v]) => v && (
                      <tr key={k}>
                        <td className="text-gray-500 pr-3 py-0.5 whitespace-nowrap">{k}</td>
                        <td className="font-medium py-0.5">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* NDT Scope */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">NDT Scope</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Method', r.ndt_method],
                    ['Scope / Qty', r.scope_qty],
                    ['Description', r.description],
                  ].map(([k, v]) => v && (
                    <tr key={k}>
                      <td className="text-gray-500 pr-3 py-0.5 w-32 whitespace-nowrap">{k}</td>
                      <td className="font-medium py-0.5">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Technical details */}
            {r.step2_complete && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technical Details</div>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['Material', r.material],
                      ['Thickness', r.thickness_mm ? r.thickness_mm + ' mm' : null],
                      ['Pipe size', r.pipe_size],
                      ['P-Number', r.p_number],
                      ['Code / Standard', r.code_standard],
                      ['Acceptance', r.acceptance],
                      ['Special notes', r.special_notes],
                    ].map(([k, v]) => v && (
                      <tr key={k}>
                        <td className="text-gray-500 pr-3 py-0.5 w-32 whitespace-nowrap">{k}</td>
                        <td className="font-medium py-0.5">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Support jobs */}
            {r.support_jobs?.length > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Support Work</div>
                <table className="w-full text-sm border border-gray-200 rounded">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Type</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Contractor</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.support_jobs.map(sj => (
                      <tr key={sj.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium">{sj.job_type}</td>
                        <td className="px-3 py-2 text-gray-600">{sj.contractor_name || '—'}</td>
                        <td className="px-3 py-2">{sj.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Manager notes */}
            {r.manager_notes && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Manager Notes</div>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{r.manager_notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
              <span>NDT Portal · Singapore · Inspection Management System</span>
              <span>Generated: {new Date().toLocaleString('en-SG')}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
