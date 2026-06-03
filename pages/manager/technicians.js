import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import Layout from '../../components/Layout'

export default function ManagerTechnicians() {
  const supabase = useSupabaseClient()
  const user     = useUser()
  const router   = useRouter()

  const [profile,  setProfile]  = useState(null)
  const [techs,    setTechs]    = useState([])
  const [scaffs,   setScaffs]   = useState([])
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof?.role !== 'manager') { router.push('/'); return }
    setProfile(prof)
    const [{ data: techList }, { data: scaffList }, { data: reqs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role','tech'),
      supabase.from('profiles').select('*').eq('role','scaffold'),
      supabase.from('requests').select('tech_id,status').in('status',['NDT scheduled','NDT in progress']),
    ])
    setTechs(techList ?? [])
    setScaffs(scaffList ?? [])
    setRequests(reqs ?? [])
    setLoading(false)
  }

  async function toggleAvailable(techId, current) {
    await supabase.from('profiles').update({ available: !current }).eq('id', techId)
    load()
  }

  if (loading || !profile) return <div className="flex items-center justify-center h-screen text-sm text-gray-400">Loading…</div>
  const newCount = 0

  function activeCount(techId) {
    return requests.filter(r => r.tech_id === techId).length
  }

  return (
    <Layout profile={profile} newCount={newCount}>
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-5">Team roster</h2>

        <div className="section-title">NDT Technicians</div>
        {techs.map(t => (
          <div key={t.id} className="card mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {t.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{t.full_name}</div>
              <div className="text-xs text-gray-400">{t.cert}</div>
              {activeCount(t.id) > 0 && (
                <div className="text-xs text-amber-600">{activeCount(t.id)} active job{activeCount(t.id)>1?'s':''}</div>
              )}
            </div>
            <button
              onClick={() => toggleAvailable(t.id, t.available)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors
                ${t.available
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}>
              {t.available ? 'Available' : 'Busy'}
            </button>
          </div>
        ))}
        {techs.length === 0 && <p className="text-sm text-gray-400 mb-4">No technicians added yet.</p>}

        <div className="section-title mt-5">Scaffold contractors</div>
        {scaffs.map(s => (
          <div key={s.id} className="card mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {s.full_name.split(' ').map(n=>n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{s.full_name}</div>
              <div className="text-xs text-gray-400">{s.company}</div>
              <div className="text-xs text-gray-400">{s.phone}</div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
              Scaffold
            </span>
          </div>
        ))}
        {scaffs.length === 0 && <p className="text-sm text-gray-400">No scaffold contractors added yet.</p>}
      </div>
    </Layout>
  )
}
