import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, JOB_CATEGORIES } from '../../lib/supabase'
import MethodSelect from '../../components/MethodSelect'
import Layout from '../../components/Layout'

const NAV = [
  { href: '/client/requests', label: 'My Requests', icon: '📋' },
  { href: '/client/new',      label: 'New Request',  icon: '➕' },
]

export default function ClientNew() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [user, setUser]       = useState(null)
  const [step, setStep]       = useState(1)
  const [saving, setSaving]   = useState(false)
  const [draftId, setDraftId] = useState(null)

  const [s1, setS1] = useState({
    location: '', equipment_no: '', contact_name: '', contact_phone: '', contact_email: '',
    ndt_method: '', scope_qty: '', attachments: [], description: '',
    date_needed: '', priority: 'Normal',
    needs_scaffold: false, needs_insulation: false, needs_painting: false,
    requester_name: '', requester_position: '', requester_department: '',
  })

  const [s2, setS2] = useState({
    material: '', thickness_mm: '', pipe_size: '',
    p_number: '', code_standard: '', acceptance: '', special_notes: '',
  })

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    if (!p || !['client','manager'].includes(p.role)) { router.push('/'); return }
    setProfile(p); setUser(u)
    setS1(prev => ({
      ...prev,
      requester_name:       p.full_name  || '',
      requester_position:   p.position   || '',
      requester_department: p.department || '',
    }))
    if (router.query.step2) {
      const { data: r } = await supabase.from('requests').select('*').eq('id', router.query.step2).single()
      if (r) { setDraftId(r.id); setStep(2) }
    }
  }

  async function uploadAttachments(requestId) {
    if (!s1.attachments || !s1.attachments.length) return
    for (const file of s1.attachments) {
      const path = `${requestId}/document/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (!upErr) {
        await supabase.from('request_documents').insert({
          request_id: requestId, uploaded_by: user.id,
          uploader_name: profile.full_name, uploader_role: profile.role,
          file_name: file.name, file_path: path,
          file_size: file.size, file_type: 'document', bucket: 'documents',
        })
      }
    }
  }

  async function submitStep1(goStep2 = false) {
    if (!s1.location || !s1.ndt_method || !s1.date_needed) {
      alert('Please fill in: location, NDT method, and date needed.'); return
    }
    setSaving(true)
    if (s1.requester_position || s1.requester_department) {
      await supabase.from('profiles').update({
        position:   s1.requester_position   || null,
        department: s1.requester_department || null,
      }).eq('id', user.id)
    }
    const { data, error } = await supabase.from('requests').insert({
      client_id:         user.id,
      company:           profile.company || profile.full_name,
      location:          s1.location,
      equipment_no:      s1.equipment_no,
      contact_name:      s1.contact_name,
      contact_phone:     s1.contact_phone,
      contact_email:     s1.contact_email,
      requested_by_id:   user.id,
      requested_by_name: s1.requester_name || profile.full_name,
      ndt_method:        s1.ndt_method,
      scope_qty:         s1.scope_qty,
      description:       s1.description,
      date_needed:       s1.date_needed,
      priority:          s1.priority,
      needs_scaffold:       s1.needs_scaffold,
      needs_insulation:     s1.needs_insulation,
      needs_painting:       s1.needs_painting,
      job_category:         s1.job_category,
      high_temp:            s1.high_temp,
      requester_position:   s1.requester_position,
      requester_department: s1.requester_department,
      step2_complete:       false,
    }).select().single()
    if (error) { setSaving(false); alert('Error submitting: ' + error.message); return }
    await uploadAttachments(data.id)
    setSaving(false)
    if (goStep2) { setDraftId(data.id); setStep(2) }
    else setStep('done')
  }

  async function submitStep2() {
    setSaving(true)
    const { error } = await supabase.from('requests').update({
      ...s2, step2_complete: true,
    }).eq('id', draftId)
    setSaving(false)
    if (error) { alert('Error saving: ' + error.message); return }
    setStep('done')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  return (
    <Layout profile={profile} nav={NAV}>
      <div className="max-w-xl mx-auto">
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

        {step === 1 && (
          <>
            <h1 className="text-xl font-bold mb-5">New NDT Request</h1>

            {/* Requested by */}
            <div className="card mb-4">
              <div className="section-title">👤 Requested by</div>
              <div className="mb-3">
                <label className="label">Name</label>
                <input className="input" placeholder="Your full name"
                  value={s1.requester_name}
                  onChange={e => setS1(p => ({...p, requester_name: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Your position / designation</label>
                  <input className="input" placeholder="e.g. Inspection Engineer"
                    value={s1.requester_position}
                    onChange={e => setS1(p => ({...p, requester_position: e.target.value}))} />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" placeholder="e.g. Maintenance, Operations"
                    value={s1.requester_department}
                    onChange={e => setS1(p => ({...p, requester_department: e.target.value}))} />
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="section-title">📍 Site information</div>
              <label className="label">Site / plant location / unit number *</label>
              <input className="input" placeholder="e.g. Tuas Shipyard, Berth 7 / Unit 3"
                value={s1.location} onChange={e => setS1(p => ({...p, location: e.target.value}))} />
              <label className="label">Job category *</label>
              <div className="grid grid-cols-3 gap-2 mb-1">
                {JOB_CATEGORIES.map(cat => (
                  <label key={cat} className={`flex items-center justify-center gap-2 cursor-pointer p-2.5 rounded-lg border-2 transition-colors text-sm font-medium
                    ${s1.job_category === cat ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    <input type="radio" name="category" value={cat} checked={s1.job_category === cat}
                      onChange={() => setS1(p => ({...p, job_category: cat}))} className="hidden" />
                    {cat === 'Meridium' ? '🔄' : cat === 'Turn Around' ? '⚙️' : '📋'} {cat}
                  </label>
                ))}
              </div>

              <label className="label">Equipment / piping number</label>
              <input className="input" placeholder="e.g. V-1201, P-4401A, L-101-3&quot;-CS-1A"
                value={s1.equipment_no} onChange={e => setS1(p => ({...p, equipment_no: e.target.value}))} />
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
              <MethodSelect value={s1.ndt_method} onChange={v => setS1(p => ({...p, ndt_method: v}))} />
              <label className="label">Estimated quantity</label>
              <input className="input" placeholder="e.g. 50 weld joints, 200 m²"
                value={s1.scope_qty} onChange={e => setS1(p => ({...p, scope_qty: e.target.value}))} />

              {/* File upload */}
              <label className="label">Upload drawings / specifications / notes (optional)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-300 transition-colors">
                <input type="file" multiple id="step1-files" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.dxf"
                  onChange={e => setS1(p => ({...p, attachments: Array.from(e.target.files)}))} />
                <label htmlFor="step1-files" className="cursor-pointer block">
                  <div className="text-2xl mb-1">📎</div>
                  <div className="text-sm text-gray-500">Click to upload drawings, specs, or notes</div>
                  <div className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images, DWG — max 50MB each</div>
                </label>
                {s1.attachments?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {s1.attachments.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-blue-50 rounded px-3 py-1.5 text-xs">
                        <span className="text-blue-700 font-medium truncate">📄 {f.name}</span>
                        <span className="text-gray-400 ml-2 flex-shrink-0">{(f.size/1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="label">Description of scope</label>
              <textarea className="input" rows={3} placeholder="What needs to be inspected? Any access conditions or hazards?"
                value={s1.description} onChange={e => setS1(p => ({...p, description: e.target.value}))} />
              <label className={`flex items-center gap-3 cursor-pointer mt-2 p-3 rounded-lg border-2 transition-colors
                ${s1.high_temp ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}>
                <input type="checkbox" checked={s1.high_temp}
                  onChange={e => setS1(p => ({...p, high_temp: e.target.checked}))}
                  className="w-4 h-4 rounded accent-red-600" />
                <div>
                  <div className="text-sm font-medium text-red-700">🌡️ High temperature job (above 50°C)</div>
                  <div className="text-xs text-gray-400">Tick if the inspection area involves high temperature surfaces</div>
                </div>
              </label>
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
              <button className="btn btn-ghost" onClick={() => setStep('done')} disabled={saving}>Skip & submit</button>
              <button className="btn btn-success" onClick={submitStep2} disabled={saving}>
                {saving ? 'Saving…' : '✅ Submit with details'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2">Request submitted!</h2>
            <p className="text-gray-500 text-sm mb-6">Our NDT team will review and contact you to confirm the schedule.</p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn-primary" onClick={() => router.push('/client/requests')}>View my requests →</button>
              <button className="btn btn-ghost" onClick={() => {
                setStep(1)
                setS1({ location:'',equipment_no:'',contact_name:'',contact_phone:'',contact_email:'',ndt_method:'',scope_qty:'',attachments:[],description:'',date_needed:'',priority:'Normal',needs_scaffold:false,needs_insulation:false,needs_painting:false })
                setS2({ material:'',thickness_mm:'',pipe_size:'',p_number:'',code_standard:'',acceptance:'',special_notes:'' })
              }}>Submit another</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
