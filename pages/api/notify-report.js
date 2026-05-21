// Email notification when Draft Report Submitted
// Uses Resend API (free tier: 100 emails/day)
// Set RESEND_API_KEY in Vercel environment variables

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { to, requestNo, company, method, location } = req.body
  if (!to || !requestNo) return res.status(400).json({ error: 'Missing required fields' })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email not sent')
    return res.status(200).json({ skipped: true, reason: 'No API key configured' })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cutech NDT Portal <noreply@cutech.com.sg>',
        to: [to],
        subject: `[${requestNo}] Draft NDT Report Ready for Review`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#0C447C;padding:24px 32px;border-radius:8px 8px 0 0">
              <h1 style="color:white;margin:0;font-size:20px">Cutech NDT Portal</h1>
              <p style="color:#B5D4F4;margin:4px 0 0;font-size:13px">Singapore · Inspection Management System</p>
            </div>
            <div style="background:#f8fafc;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
              <h2 style="color:#0C447C;margin:0 0 16px">Draft Report Ready for Review</h2>
              <p style="color:#374151;font-size:15px">Your NDT inspection report is ready for review.</p>
              <table style="width:100%;background:white;border:1px solid #e2e8f0;border-radius:6px;border-collapse:collapse;margin:20px 0">
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;width:140px">Request No</td>
                  <td style="padding:10px 16px;font-weight:600;color:#111827;font-size:13px">${requestNo}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Company</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${company || '—'}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Method</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${method || '—'}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px">Location</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px">${location || '—'}</td>
                </tr>
              </table>
              <p style="color:#374151;font-size:14px">Please log in to the portal to download and review the report. Once satisfied, click <strong>Accept Draft Report</strong> to confirm acceptance.</p>
              <a href="https://itpdashboard-sg.vercel.app/client/requests"
                style="display:inline-block;background:#185FA5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin:16px 0">
                Review Report →
              </a>
              <p style="color:#9CA3AF;font-size:12px;margin-top:24px">
                If you have questions, please contact your Cutech NDT Manager directly.<br>
                Cutech Complete Solution Provider · Singapore
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Resend API error')
    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('Email error:', err)
    return res.status(500).json({ error: err.message })
  }
}
