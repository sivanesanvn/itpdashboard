import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, ROLE_LABEL, ROLE_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'

const NAV = (b) => [
  { href: '/manager/dashboard', label: 'Dashboard', icon: '📊', badge: b },
  { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
  { href: '/manager/schedule',  label: 'Schedule', icon: '📅' },
  { href: '/manager/team',      label: 'Team', icon: '👥' },
]

const ICONS = { tech: '🔧', scaffold: '🏗️', insulation: '🧱', painting: '🎨', client: '🏭', manager: '🏢' }

export default function ManagerTeam() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [members, setMembers] = useState([])
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ full_name: '', email: '', role: 'client', company: '', phone: '', cert: '' })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setMembers(data || [])
  }

  async function inviteUser() {
    if (!form.email || !form.full_name) { alert('Name and email are required.'); return }
    setSaving(true); setMsg('')
    // In production: use Supabase Admin API or send invite email
    // Here we create user via signUp with metadata
    const { error } = await supabase.auth.admin?.createUser?.({
      email: form.email,
      password: Math.random().toString(36).slice(-10),
      email_confirm: true,
      user_metadata: { role: form.role, full_name: form.full_name }
    }) ?? { error: { message: 'Use Supabase Dashboard → Authentication → Invite user, then update their profile role.' } }

    if (error) {
      setMsg('ℹ️ To invite users: Go to Supabase Dashboard → Authentication → Users → Invite, then set their role in the profiles table. Or use the Supabase service role key in your backend.')
    } else {
      setMsg('✅ User invited! They will receive a login email.')
    }
    setSaving(false)
  }

  const grouped = members.reduce((acc, m) => {
    if (!acc[m.role]) acc[m.role] = []
    acc[m.role].push(m); return acc
  }, {})

  return (
    <Layout profile={profile} nav={NAV(0)}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">👥 Team & Contractors</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Invite user</button>
      </div>

      {Object.keys(grouped).map(role => (
        <div key={role} className="mb-5">
          <div className="section-title">{ICONS[role]} {ROLE_LABEL[role]}s</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {grouped[role].map(m => (
              <div key={m.id} className="card flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${ROLE_COLOR[m.role]} font-semibold`}>
                  {m.full_name.slice(0,1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{m.full_name}</div>
                  <div className="text-xs text-gray-400">{m.company || m.email}</div>
                  {m.cert && <div className="text-xs text-gray-400">{m.cert}</div>}
                </div>
                <div className={`w-2 h-2 rounded-full ${m.available ? 'bg-emerald-400' : 'bg-gray-300'}`} title={m.available ? 'Available' : 'Busy'} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h2 className="font-semibold mb-4">Invite user</h2>
            <div className="space-y-3">
              <div><label className="label">Full name</label>
                <input className="input" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
              <div><label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="client">Client</option>
                  <option value="tech">NDT Technician</option>
                  <option value="scaffold">Scaffold Contractor</option>
                  <option value="insulation">Insulation Contractor</option>
                  <option value="painting">Painting Contractor</option>
                </select></div>
              <div><label className="label">Company</label>
                <input className="input" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} /></div>
              {form.role === 'tech' && (
                <div><label className="label">Certification (e.g. ASNT Level II UT/RT)</label>
                  <input className="input" value={form.cert} onChange={e => setForm(p => ({...p, cert: e.target.value}))} /></div>
              )}
              {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3">{msg}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={inviteUser} disabled={saving}>{saving ? 'Saving…' : 'Send invite'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
