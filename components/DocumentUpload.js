import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const FILE_ICONS = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'image/gif': '🖼️',
}

function fileIcon(type) {
  return FILE_ICONS[type] || '📎'
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

export default function DocumentUpload({ requestId, profile, fileType = 'document', label = 'Supporting documents', existingDocs = [], onUploaded, notifyOnUpload = false }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()
  const bucket = fileType === 'report' ? 'reports' : 'documents'

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true); setError('')

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${requestId}/${fileType}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file)
      if (upErr) { setError('Upload failed: ' + upErr.message); continue }

      await supabase.from('request_documents').insert({
        request_id:    requestId,
        uploaded_by:   profile.id,
        uploader_name: profile.full_name,
        uploader_role: profile.role,
        file_name:     file.name,
        file_path:     path,
        file_size:     file.size,
        file_type:     fileType,
        bucket,
      })
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    if (fileType === 'report' && notifyOnUpload) {
      fetch('/api/notify-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      }).catch(e => console.warn('Report notification failed:', e))
    }
    if (onUploaded) onUploaded()
  }

  async function handleDownload(doc) {
    const { data, error } = await supabase.storage.from(doc.bucket).createSignedUrl(doc.file_path, 3600)
    if (error) { alert('Download failed: ' + error.message); return }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  async function handleDelete(doc) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    await supabase.storage.from(doc.bucket).remove([doc.file_path])
    await supabase.from('request_documents').delete().eq('id', doc.id)
    if (onUploaded) onUploaded()
  }

  const canDelete = (doc) => {
    return profile.role === 'manager' || doc.uploaded_by === profile.id
  }

  // For reports: clients can only download, not upload
  const canUpload = fileType === 'report'
    ? ['manager', 'tech'].includes(profile.role)
    : true // everyone can upload supporting docs

  // For reports: clients can only download after report is uploaded
  const myDocs = existingDocs.filter(d => d.file_type === fileType)

  return (
    <div>
      <div className="section-title">{label}</div>

      {/* File list */}
      {myDocs.length > 0 && (
        <div className="space-y-2 mb-3">
          {myDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-lg">{fileIcon(doc.file_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{doc.file_name}</div>
                <div className="text-xs text-gray-400">
                  {fileSize(doc.file_size)} · {doc.uploader_name} · {new Date(doc.created_at).toLocaleDateString('en-SG')}
                </div>
              </div>
              <button onClick={() => handleDownload(doc)}
                className="btn btn-ghost btn-sm text-xs flex-shrink-0">
                ⬇ Download
              </button>
              {canDelete(doc) && (
                <button onClick={() => handleDelete(doc)}
                  className="text-red-400 hover:text-red-600 text-xs px-1">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {myDocs.length === 0 && (
        <p className="text-xs text-gray-400 mb-3">No {fileType === 'report' ? 'reports' : 'documents'} uploaded yet.</p>
      )}

      {/* Upload button */}
      {canUpload && (
        <div>
          <input ref={inputRef} type="file" multiple className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleUpload} />
          <button onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn btn-ghost text-xs border-dashed w-full justify-center">
            {uploading ? '⏳ Uploading…' : `📎 Upload ${fileType === 'report' ? 'report' : 'file'} (PDF, Word, Excel, Image)`}
          </button>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  )
}
