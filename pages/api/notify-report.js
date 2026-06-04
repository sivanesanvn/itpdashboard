import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { requestId } = req.body
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email not sent')
    return res.status(200).json({ skipped: true, reason: 'No API key configured' })
  }

  // Fetch the request
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('requests')
    .select('request_no, company, ndt_method, location, client_id, tech_id')
    .eq('id', requestId)
    .single()
  if (jobErr || !job) return res.status(404).json({ error: 'Request not found' })

  // Collect recipient profile IDs
  const profileIds = new Set()
  if (job.client_id) profileIds.add(job.client_id)
  if (job.tech_id) profileIds.add(job.tech_id)

  // All managers and coordinators
  const { data: staffProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('role', ['manager', 'coordinator'])
  ;(staffProfiles || []).forEach(p => profileIds.add(p.id))

  // Contractors with support jobs on this request
  const { data: supportJobs } = await supabaseAdmin
    .from('support_jobs')
    .select('contractor_id')
    .eq('request_id', requestId)
  ;(supportJobs || []).forEach(sj => { if (sj.contractor_id) profileIds.add(sj.contractor_id) })

  // Fetch emails for all collected IDs
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .in('id', [...profileIds])

  const emails = (profiles || []).map(p => p.email).filter(Boolean)
  if (!emails.length) return res.status(200).json({ skipped: true, reason: 'No recipients found' })

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cutech NDT Portal <noreply@cutech.com.sg>',
        to: emails,
        subject: `[${job.request_no}] NDT Report Uploaded`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0C447C;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">Cutech NDT Portal</h1>
              <p style="color:#B5D4F4;margin:4px 0 0;font-size:13px">Singapore · Inspection Management System</p>
            </div>
            <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
              <h2 style="color:#0C447C;margin:0 0 16px">NDT Report Uploaded</h2>
              <p style="color:#374151;font-size:15px">A new NDT report has been uploaded for the following inspection request.</p>
              <table style="width:100%;background:white;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;margin:20px 0">
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;width:140px">Request No</td>
                  <td style="padding:10px 16px;font-weight:600;color:#111827;font-size:13px">${job.request_no}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Company</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${job.company || '—'}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Method</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${job.ndt_method || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Location</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${job.location || '—'}</td>
                </tr>
              </table>
              <p style="color:#374151;font-size:14px">Please log in to the portal to view and download the report.</p>
              <a href="https://itpdashboard-sg.vercel.app"
                style="display:inline-block;background:#185FA5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0">
                Open Portal →
              </a>
              <p style="color:#9CA3AF;font-size:12px;margin-top:24px">
                Cutech Complete Solution Provider · Singapore
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Resend API error')
    return res.status(200).json({ success: true, id: data.id, recipients: emails.length })
  } catch (err) {
    console.error('Email error:', err)
    return res.status(500).json({ error: err.message })
  }
}
