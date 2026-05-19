import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '../../components/Layout'
import { NDT_METHODS, PRIORITY_OPTIONS, SCAFFOLD_REASONS } from '../../lib/supabase'

export default function ClientNewRequest() {
  const supabase = useSupabaseClient()
  const user     = useUser()
  const router   = useRouter()

  const [profile, setProfile] = useState(null)
  const [step,    setStep]    = useState(1) // 1 | 2 | 'done'
  const [saving,  setSaving]  = useState(false)
  const [reqId,   setReqId]   = useState(null)
  const [reqNo,   setReqNo]   = useState(null)
  const [error,   setError]   = useState('')

  // Step 1 fields
  const [location,     setLocation]     = useState('')
  const [contactName,  setContactName]  = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [method,       setMethod]       = useState('')
  const [scopeQty,     setScopeQty]     = useState('')
  const [description,  setDescription]  = useState('')
  const [dateNeeded,   setDateNeeded]   = useState('')
  const [priority,     setPriority]     = useState('Normal')

  // Step 2 fields
  const [material,   setMaterial]   = useState('')
  const [thickness,  setThickness]  = useState('')
  const [pipeSize,   setPipeSize]   = useState('')
  const [pNumber,    setPNumber]    = useState('')
  const [code,       setCode]       = useState('')
  const [acceptance, setAcceptance] = useState('')
  const [notes,      setNotes]      = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.role !== 'client') { router.push('/'); return }
        setProfile(data)
      })
  }, [user])

  async function submitStep1(skipToSubmit = false) {
    setError('')
    if (!location || !method || !dateNeeded) {
      setError('Please fill in location, NDT method, and date needed.')
      return
    }
    setSaving(true)
    const { data, error: err } = await supabase.from('requests').insert({
      client_id:    user.id,
      company:      profile.company || profile.full_name,
      location,
      contact_name: contactName,
      contact_phone: contactPhone,
      ndt_method:   method,
      scope_qty:    scopeQty,
      description,
      date_needed:  dateNeeded,
      priority,
      step2_complete: false,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }
    setReqId(data.id)
    setReqNo(data.request_no)
    setSaving(false)

    if (skipToSubmit) setStep('done')
    else setStep(2)
  }

  async function submitStep2() {
    if (!reqId) return
    setSaving(true)
    await supabase.from('requests').update({
      material,
      thickness_mm: thickness,
      pipe_size:    pipeSize,
      p_number:     pNumber,
      code_standard: code,
      acceptance,
      special_notes: notes,
      step2_complete: true,
    }).eq('id', reqId)
    setSaving(false)
    setStep('done')
  }

  if (!profile) return <div className="flex items-center justify-center h-screen text-sm text-gray-400">Loading…</div>

  return (
    <Layout profile={profile}>
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-1">New NDT request</h2>
        <p className="text-sm text-gray-500 mb-5">{profile.company}</p>

        {step !== 'done' && (
          <StepIndicator step={step} />
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div className="card mb-4">
              <div className="section-title">Site information</div>
              <label className="label">Site / plant location *</label>
              <input className="input" value={location} onChange={e=>setLocation(e.target.value)}
                placeholder="e.g. Jurong Island, Train 2, Area B" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contact person on site</label>
                  <input className="input" value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="label">Contact phone / WhatsApp</label>
                  <input className="input" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="+65 9xxx xxxx" />
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="section-title">NDT scope</div>
              <label className="label">NDT method required *</label>
              <select className="input" value={method} onChange={e=>setMethod(e.target.value)}>
                <option value="">Select method…</option>
                {NDT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Estimated no. of welds / area</label>
                  <input className="input" value={scopeQty} onChange={e=>setScopeQty(e.target.value)} placeholder="e.g. 50 welds, 200 m²" />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={priority} onChange={e=>setPriority(e.target.value)}>
                    {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <label className="label">Brief description</label>
              <textarea className="input" rows={2} value={description} onChange={e=>setDescription(e.target.value)}
                placeholder="What needs to be inspected and why?" />
            </div>

            <div className="card mb-4">
              <div className="section-title">Scheduling</div>
              <label className="label">Date needed by *</label>
              <input type="date" className="input max-w-xs" value={dateNeeded} onChange={e=>setDateNeeded(e.target.value)} />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">You can add technical details in the next step, or submit now.</p>
              <div className="flex gap-2">
                <button className="btn" onClick={() => submitStep1(true)} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit basic only'}
                </button>
                <button className="btn btn-primary" onClick={() => submitStep1(false)} disabled={saving}>
                  {saving ? 'Saving…' : 'Next: Technical details →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div className="card mb-4">
              <div className="section-title">Material & component</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Material / component type</label>
                  <input className="input" value={material} onChange={e=>setMaterial(e.target.value)}
                    placeholder="e.g. Carbon steel pipe, SS316L" />
                </div>
                <div>
                  <label className="label">Wall thickness (mm)</label>
                  <input className="input" value={thickness} onChange={e=>setThickness(e.target.value)} placeholder="e.g. 12.7" />
                </div>
                <div>
                  <label className="label">Pipe / vessel size</label>
                  <input className="input" value={pipeSize} onChange={e=>setPipeSize(e.target.value)} placeholder='e.g. 6" NB, DN150' />
                </div>
                <div>
                  <label className="label">P-number / material spec</label>
                  <input className="input" value={pNumber} onChange={e=>setPNumber(e.target.value)} placeholder="e.g. P1, ASTM A106 Gr.B" />
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="section-title">Standards & acceptance</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Applicable code / standard</label>
                  <input className="input" value={code} onChange={e=>setCode(e.target.value)}
                    placeholder="e.g. ASME B31.3, AWS D1.1" />
                </div>
                <div>
                  <label className="label">Acceptance criteria</label>
                  <input className="input" value={acceptance} onChange={e=>setAcceptance(e.target.value)}
                    placeholder="e.g. No linear indications > 3mm" />
                </div>
              </div>
              <label className="label">Special requirements / notes</label>
              <textarea className="input" rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
                placeholder="Radiation clearance, confined space, PTW, scaffold needed, etc." />
            </div>

            <div className="flex items-center justify-between">
              <button className="btn" onClick={() => setStep(1)}>← Back</button>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setStep('done')}>Skip & submit</button>
                <button className="btn btn-success" onClick={submitStep2} disabled={saving}>
                  {saving ? 'Submitting…' : '✓ Submit request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="card text-center py-8">
            <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-teal-600 text-xl">✓</span>
            </div>
            <h3 className="font-semibold text-base">{reqNo} submitted</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Our team will review your request and contact you to confirm the schedule.
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn btn-primary" onClick={() => router.push('/client/requests')}>
                View my requests
              </button>
              <button className="btn" onClick={() => {
                setStep(1); setLocation(''); setMethod(''); setDateNeeded(''); setDescription('')
                setScopeQty(''); setContactName(''); setContactPhone(''); setPriority('Normal')
                setMaterial(''); setThickness(''); setCode(''); setNotes(''); setReqId(null)
              }}>
                Submit another
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: 'Basic info' },
    { n: 2, label: 'Technical details' },
    { n: 3, label: 'Submit' },
  ]
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
              ${step > s.n ? 'bg-teal-500 text-white' :
                step === s.n ? 'bg-blue-700 text-white' :
                               'bg-gray-200 text-gray-500'}`}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span className={`text-xs ${step === s.n ? 'font-medium text-gray-800' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-2" />}
        </div>
      ))}
    </div>
  )
}
