import { useEffect, useState } from 'react'
import { supabase, ROLE_LABEL, ROLE_COLOR } from '../lib/supabase'

export default function RequestComments({ requestId, profile }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [requestId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('request_comments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
    setComments(data || [])
    setLoading(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await supabase.from('request_comments').insert({
      request_id: requestId,
      user_id:    profile.id,
      user_name:  profile.full_name,
      user_role:  profile.role,
      body:       body.trim(),
    })
    setBody('')
    await load()
    setSaving(false)
  }

  return (
    <div className="card">
      <div className="section-title">💬 Comments & Notes</div>

      {loading ? (
        <p className="text-xs text-gray-400 mb-3">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">No comments yet. Be the first to add a note.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                {c.user_name?.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className="text-xs font-semibold">{c.user_name}</span>
                  <span className={`badge text-xs ${ROLE_COLOR[c.user_role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABEL[c.user_role] || c.user_role}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                    {new Date(c.created_at).toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Add a comment or note…"
          value={body}
          onChange={e => setBody(e.target.value)}
        />
        <button type="submit" className="btn btn-primary text-xs whitespace-nowrap"
          disabled={saving || !body.trim()}>
          {saving ? '…' : 'Post'}
        </button>
      </form>
    </div>
  )
}
