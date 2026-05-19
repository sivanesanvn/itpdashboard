import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, NDT_METHODS } from '../../lib/supabase'
import Layout from '../../components/Layout'

const NAV = [
  { href: '/client/requests', label: 'My Requests', icon: '📋' },
  { href: '/client/new',      label: 'New Request',  icon: '➕' },
]

export default function ClientNew() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser]       = useState(null)
  const [step, setStep]       = useState(1)   // 1 | 2 | 'done'
  const [saving, setSaving]   = useState(false)
  const [draftId, setDraftId] = useState(null) // id of saved step-1 request

  // Step 1 fields
  const [s1, setS1] = useState({
    location: '', contact_name: '', contact_phone: '', contact_email: '',
    ndt_method: '', scope_qty: '', description: '',
    date_needed: '', priority: 'Normal',
    needs_scaffold: false, needs_insulation: false, needs_painting: false,
  })

  // Step 2 fields
  const [s2, setS2] = useState({
    material: '', thickness_mm: '', pipe_size: '',
    p_number: '', code_standard: '', acceptance: '', special_notes: '',
  })

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || p.role !== 'client') { router.push('/'); return }
    setProfile(p); setUser(u)

    // If coming from "Add technical details" link
    if (router.query.step2) {
      const { data: r } = await supabase.from('requests').select('*').eq('id', router.query.step2).single()
      if (r) { setDraftId(r.id); setStep(2) }
    }
  }

  async function submitStep1(goStep2 = false) {
    if (!s1.location || !s1.ndt_method || !s1.date_needed) {
      alert('Please fill in: location, NDT method, and date needed.'); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('requests').insert({
      client_id:    user.id,
      company:      profile.company || profile.full_name,
      location:     s1.location,
      contact_name: s1.contact_name,
      contact_phone: s1.contact_phone,
      contact_email: s1.contact_email,
      ndt_method:   s1.ndt_method,
      scope_qty:    s1.scope_qty,
      description:  s1.description,
      date_needed:  s1.date_needed,
      priority:     s1.priority,
      needs_scaffold:   s1.needs_scaffold,
      needs_insulation: s1.needs_insulation,
      needs_painting:   s1.needs_painting,
      step2_complete: false,
    }).select().single()
    setSaving(false)
    if (error) { alert('Error submitting: ' + error.message); return }
    if (goStep2) { setDraftId(data.id); setStep(2) }
    else setStep('done')
  }

  async function submitStep2() {
    setSaving(true)
    const { error } = await supabase.from('requests').update({
      ...s2,
      step2_complete: true,
    }).eq('id', draftId)
    setSaving(false)
    if (error) { alert('Error saving: ' + error.message); return }
    setStep('done')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={NAV}>
      <div className="max-w-xl mx-auto">
        {/* Step indicator */}
        {step !== 'done' && (
          <div className="flex items-center gap-0 mb-6">
            {['Basic info', 'Technical details'].map((label, i) => {
              const num = i + 1
              const done = step > num
              const active = step === num
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                      ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {done ? '✓' : num}
                    </div>
                    <span className={`text-sm ${active ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 1 && <div className={`flex-1 h-0.5 mx-3 ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                </div>
              )
            })}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <h1 className="text-xl font-bold mb-5">New NDT Request</h1>

            <div className="card mb-4">
              <div className="section-title">📍 Site information</div>
              <label className="label">Site / plant location *</label>
              <input className="input" placeholder="e.g. Tuas Shipyard, Berth 7"
                value={s1.location} onChange={e => setS1(p => ({...p, location: e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contact person on site</label>
                  <input className="input" placeholder="Full name"
                    value={s1.contact_name} onChange={e => setS1(p => ({...p, contact_name: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Phone / WhatsApp</label>
                  <input className="input" placeholder="+65 9xxx xxxx"
                    value={s1.contact_phone} onChange={e => setS1(p => ({...p, contact_phone: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="section-title">🔍 NDT scope</div>
              <label className="label">NDT method required *</label>
              <select className="input" value={s1.ndt_method} onChange={e => setS1(p => ({...p, ndt_method: e.target.value}))}>
                <option value="">Select method…</option>
                {NDT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
              <label className="label">Estimated quantity</label>
              <input className="input" placeholder="e.g. 50 weld joints, 200 m²"
                value={s1.scope_qty} onChange={e => setS1(p => ({...p, scope_qty: e.target.value}))} />
              <label className="label">Description of scope</label>
              <textarea className="input" rows={3} placeholder="What needs to be inspected? Any access conditions or hazards?"
                value={s1.description} onChange={e => setS1(p => ({...p, description: e.target.value}))} />
            </div>

            <div className="card mb-4">
              <div className="section-title">📅 Scheduling</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date needed by *</label>
                  <input className="input" type="date" value={s1.date_needed}
                    onChange={e => setS1(p => ({...p, date_needed: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={s1.priority} onChange={e => setS1(p => ({...p, priority: e.target.value}))}>
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Shutdown / turnaround</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card mb-5">
              <div className="section-title">🏗️ Support work needed?</div>
              <p className="text-xs text-gray-400 mb-3">If the job requires scaffolding, insulation removal, or painting, the NDT company will coordinate these contractors.</p>
              <div className="space-y-2">
                {[
                  { key: 'needs_scaffold',   icon: '🏗️', label: 'Scaffold erection / dismantling' },
                  { key: 'needs_insulation', icon: '🧱', label: 'Insulation removal & reinstatement' },
                  { key: 'needs_painting',   icon: '🎨', label: 'Painting / surface preparation' },
                ].map(({ key, icon, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <input type="checkbox" checked={s1[key]} onChange={e => setS1(prev => ({...prev, [key]: e.target.checked}))}
                      className="w-4 h-4 rounded accent-blue-600" />
                    <span className="text-sm">{icon} {label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button className="btn btn-ghost" onClick={() => submitStep1(false)} disabled={saving}>
                Submit basic only
              </button>
              <button className="btn btn-primary" onClick={() => submitStep1(true)} disabled={saving}>
                {saving ? 'Saving…' : 'Next: Technical details →'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <h1 className="text-xl font-bold mb-5">Technical Details</h1>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-800">
              ✅ Basic info saved. Add technical details for a faster quote, or skip and submit now.
            </div>

            <div className="card mb-4">
              <div className="section-title">🔩 Material & component</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Material / component type</label>
                  <input className="input" placeholder="e.g. Carbon steel pipe"
                    value={s2.material} onChange={e => setS2(p => ({...p, material: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Wall thickness (mm)</label>
                  <input className="input" placeholder="e.g. 12.7"
                    value={s2.thickness_mm} onChange={e => setS2(p => ({...p, thickness_mm: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Pipe / vessel size</label>
                  <input className="input" placeholder='e.g. 6" NB, DN150'
                    value={s2.pipe_size} onChange={e => setS2(p => ({...p, pipe_size: e.target.value}))} />
                </div>
                <div>
                  <label className="label">P-number / material spec</label>
                  <input className="input" placeholder="e.g. P1, ASTM A106 Gr.B"
                    value={s2.p_number} onChange={e => setS2(p => ({...p, p_number: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="card mb-5">
              <div className="section-title">📐 Standards & acceptance</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Applicable code / standard</label>
                  <input className="input" placeholder="e.g. ASME B31.3, AWS D1.1"
                    value={s2.code_standard} onChange={e => setS2(p => ({...p, code_standard: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Acceptance criteria</label>
                  <input className="input" placeholder="e.g. No linear indications"
                    value={s2.acceptance} onChange={e => setS2(p => ({...p, acceptance: e.target.value}))} />
                </div>
              </div>
              <label className="label">Special requirements / safety notes</label>
              <textarea className="input" rows={3}
                placeholder="Radiation clearance needed, confined space, hot work permit, etc."
                value={s2.special_notes} onChange={e => setS2(p => ({...p, special_notes: e.target.value}))} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button className="btn btn-ghost" onClick={() => setStep('done')} disabled={saving}>
                Skip & submit
              </button>
              <button className="btn btn-success" onClick={submitStep2} disabled={saving}>
                {saving ? 'Saving…' : '✅ Submit with details'}
              </button>
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2">Request submitted!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Our NDT team will review your request and contact you to confirm the schedule.
              You can track progress from your requests page.
            </p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => router.push('/client/requests')}>
                View my requests →
              </button>
              <button className="btn btn-ghost" onClick={() => { setStep(1); setS1({ location:'',contact_name:'',contact_phone:'',contact_email:'',ndt_method:'',scope_qty:'',description:'',date_needed:'',priority:'Normal',needs_scaffold:false,needs_insulation:false,needs_painting:false }); setS2({ material:'',thickness_mm:'',pipe_size:'',p_number:'',code_standard:'',acceptance:'',special_notes:'' }) }}>
                Submit another
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
