import { useState, useRef, useEffect } from 'react'
import { NDT_METHODS } from '../lib/supabase'

export default function MethodSelect({ value, onChange, placeholder = 'Search NDT method…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef()
  const containerRef = useRef()

  const filtered = NDT_METHODS.filter(m =>
    m.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(m) {
    onChange(m)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className={`input flex items-center gap-2 cursor-pointer ${open ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}>
        {open
          ? <input ref={inputRef} className="flex-1 outline-none bg-transparent text-sm"
              placeholder={placeholder} value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()} />
          : <span className={`flex-1 text-sm ${value ? 'text-gray-800' : 'text-gray-400'}`}>
              {value || placeholder}
            </span>
        }
        {value && !open && (
          <button className="text-gray-300 hover:text-gray-500 text-xs"
            onClick={e => { e.stopPropagation(); onChange('') }}>✕</button>
        )}
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0
            ? <div className="px-4 py-3 text-xs text-gray-400">No methods found</div>
            : filtered.map(m => (
                <button key={m} onClick={() => select(m)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors
                    ${value === m ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {m}
                </button>
              ))
          }
        </div>
      )}
    </div>
  )
}
