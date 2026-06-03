import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase, ROLE_LABEL, ROLE_COLOR } from '../../lib/supabase'
import Layout from '../../components/Layout'

const NAV = (b) => [
  { href: '/manager/dashboard', label: 'Dashboard',    icon: '📊', badge: b },
  { href: '/manager/requests',  label: 'All Requests', icon: '📋' },
  { href: '/manager/schedule',  label: 'Schedule',     icon: '📅' },
  { href: '/manager/team',      label: 'Team',         icon: '👥' },
]

const ICONS = { tech: '🔧', scaffold: '🏗️', insulation: '🧱', painting: '🎨', client: '🏭', coordinator: '📋', manager: '🏢' }

const EMPTY_FORM = { full_name: '', email: '', role: 'client', company: '', phone: '', cert: '', position: '', department: '' }

export default function ManagerTeam() {
  const router = useRouter()
  const [profile, setProfile]   = useState(null)
  const [members, setMembers]   = useState([])
  const [inviteModal, setInviteModal] = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.role !== 'manager') { router.push('/'); return }
    setProfile(p)
    await loadMembers()
  }

  async function loadMembers() {
    const { data } = await supabase.from('profiles').select('*').order('role').order('full_name')
    setMembers(data || [])
  }

  function openEdit(member) {
    setEditTarget(member)
    setForm({
      full_name:  member.full_name  || '',
      email:      member.email      || '',
      role:       member.role       || 'client',
      company:    member.company    || '',
      phone:      member.phone      || '',
      cert:       member.cert       || '',
      position:   member.position   || '',
      department: member.department || '',
    })
    setMsg('')
  }

  async function saveEdit() {
    if (!form.full_name.trim()) { alert('Full name is required.'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles').update({
      full_name:  form.full_name.trim(),
      company:    form.company.trim(),
      phone:      form.phone.trim(),
      cert:       form.cert.trim(),
      position:   form.position.trim(),
      department: form.department.trim(),
      role:       form.role,
    }).eq('id', editTarget.id)

    if (error) {
      setMsg('❌ Error: ' + error.message)
    } else {
      setMsg('✅ Profile updated.')
      await loadMembers()
      setTimeout(() => { setEditTarget(null); setMsg('') }, 1200)
    }
    setSaving(false)
  }

  async function inviteUser() {
    if (!form.email || !form.full_name) { alert('Name and email are required.'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.admin?.createUser?.({
      email: form.email,
      password: Math.random().toString(36).slice(-10),
      email_confirm: true,
      user_metadata: { role: form.role, full_name: form.full_name }
    }) ?? { error: { message: 'Use Supabase Dashboard → Authentication → Invite user, then set their role in the profiles table.' } }

    if (error) {
      setMsg('ℹ️ To invite users: Go to Supabase Dashboard → Authentication → Users → Invite, then set their role and details below.')
    } else {
      setMsg('✅ User invited! They will receive a login email.')
    }
    setSaving(false)
  }

  const filtered = members.filter(m => {
    const matchRole   = !roleFilter || m.role === roleFilter
    const matchSearch = !search || [m.full_name, m.company, m.email, m.position, m.department]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.role]) acc[m.role] = []
    acc[m.role].push(m); return acc
  }, {})

  const roleOrder = ['manager','coordinator','client','tech','scaffold','insulation','painting']

  return (
    <Layout profile={profile} nav={NAV(0)}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold">👥 Team & Users</h1>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setMsg(''); setInviteModal(true) }}>+ Invite user</button>
      </div>

      {/* Search + role filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <input className="input pl-8 text-sm w-full" placeholder="Search by name, company, position…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <span className="absolute left-2.5 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>
        <select className="input text-sm py-1.5 w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {roleOrder.map(r => <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>)}
        </select>
      </div>

      {roleOrder.filter(r => grouped[r]?.length).map(role => (
        <div key={role} className="mb-5">
          <div className="section-title">{ICONS[role]} {ROLE_LABEL[role] || role}s ({grouped[role].length})</div>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                  {['client','coordinator'].includes(role) && <>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Position</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Department</th>
                  </>}
                  <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                  {role === 'tech' && <th className="px-3 py-2 text-left font-semibold text-gray-400 uppercase tracking-wide">Cert</th>}
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped[role].map(m => (
                  <tr key={m.id} className="hover:bg-blue-50/20">
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${ROLE_COLOR[m.role]}`}>
                          {m.full_name.slice(0,1)}
                        </div>
                        {m.full_name}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{m.company || '—'}</td>
                    {['client','coordinator'].includes(role) && <>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{m.position || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{m.department || <span className="text-gray-300">—</span>}</td>
                    </>}
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{m.email}</td>
                    {role === 'tech' && <td className="px-3 py-2.5 text-gray-400">{m.cert || '—'}</td>}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(m)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-10 text-sm">No users found.</div>
      )}

      {/* Invite modal */}
      {inviteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <h2 className="font-semibold mb-4">Invite user</h2>
            <div className="space-y-3">
              <div><label className="label">Full name *</label>
                <input className="input" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></div>
              <div><label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="client">Client Engineer</option>
                  <option value="coordinator">Client Coordinator</option>
                  <option value="tech">NDT Technician</option>
                  <option value="scaffold">Scaffold Contractor</option>
                  <option value="insulation">Insulation Contractor</option>
                  <option value="painting">Painting Contractor</option>
                </select></div>
              <div><label className="label">Company</label>
                <input className="input" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} /></div>
              {['client','coordinator'].includes(form.role) && <>
                <div><label className="label">Position / Designation</label>
                  <input className="input" placeholder="e.g. Inspection Engineer" value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value}))} /></div>
                <div><label className="label">Department</label>
                  <input className="input" placeholder="e.g. Inspection & Reliability" value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} /></div>
              </>}
              {form.role === 'tech' && (
                <div><label className="label">Certification (e.g. ASNT Level II UT/RT)</label>
                  <input className="input" value={form.cert} onChange={e => setForm(p => ({...p, cert: e.target.value}))} /></div>
              )}
              {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3">{msg}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost" onClick={() => setInviteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={inviteUser} disabled={saving}>{saving ? 'Saving…' : 'Send invite'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit profile modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Edit profile</h2>
              <span className="text-xs text-gray-400">{editTarget.email}</span>
            </div>
            <div className="space-y-3">
              <div><label className="label">Full name *</label>
                <input className="input" value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))} /></div>
              <div><label className="label">Role</label>
                <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="client">Client Engineer</option>
                  <option value="coordinator">Client Coordinator</option>
                  <option value="tech">NDT Technician</option>
                  <option value="scaffold">Scaffold Contractor</option>
                  <option value="insulation">Insulation Contractor</option>
                  <option value="painting">Painting Contractor</option>
                  <option value="manager">Manager</option>
                </select></div>
              <div><label className="label">Company</label>
                <input className="input" value={form.company} onChange={e => setForm(p => ({...p, company: e.target.value}))} /></div>
              <div><label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
              {['client','coordinator'].includes(form.role) && <>
                <div><label className="label">Position / Designation</label>
                  <input className="input" placeholder="e.g. Inspection Engineer" value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value}))} /></div>
                <div><label className="label">Department</label>
                  <input className="input" placeholder="e.g. Inspection & Reliability" value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} /></div>
              </>}
              {form.role === 'tech' && (
                <div><label className="label">Certification</label>
                  <input className="input" value={form.cert} onChange={e => setForm(p => ({...p, cert: e.target.value}))} /></div>
              )}
              {msg && (
                <div className={`text-xs rounded-lg p-3 border ${msg.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  {msg}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-ghost" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : '💾 Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
