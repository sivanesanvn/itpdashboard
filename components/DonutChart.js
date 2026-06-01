export default function DonutChart({ data, size = 120 }) {
  // data: [{ label, value, color }]
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 40
  const cx = size / 2
  const cy = size / 2
  const stroke = 14

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fill="#9ca3af">No data</text>
      </svg>
    )
  }

  let offset = -90
  const segments = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total
    const angle = pct * 360
    const startRad = (offset * Math.PI) / 180
    const endRad = ((offset + angle) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
    offset += angle
    return { ...d, path, pct }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      {segments.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeLinecap="butt" />
      ))}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="16" fontWeight="600" fill="#111827">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#6b7280">total</text>
    </svg>
  )
}
