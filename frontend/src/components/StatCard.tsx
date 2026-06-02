interface StatCardProps {
  label: string
  value: string | number
  helper?: string
  tone?: 'default' | 'primary' | 'danger'
  loading?: boolean
}

export function StatCard({ label, value, helper, tone = 'default', loading = false }: StatCardProps) {
  const toneClasses = {
    default: 'border-white/10 hover:border-[#46eedd]/50',
    primary: 'border-[#46eedd]/30 hover:border-[#46eedd]',
    danger: 'border-[#ffb4ab]/30',
  }
  const valueClasses = {
    default: 'text-[#e1e2eb]',
    primary: 'text-[#46eedd]',
    danger: 'text-[#ffb4ab]',
  }

  return (
    <div
      className={`relative overflow-hidden rounded border bg-[#191c22] p-4 transition-colors ${toneClasses[tone]}`}
    >
      {tone === 'danger' ? (
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#ffb4ab]" />
      ) : null}
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {label}
      </p>
      {loading ? (
        <div className="mt-4 h-7 w-24 animate-pulse rounded bg-white/10" />
      ) : (
        <p className={`mt-3 font-mono text-2xl font-semibold ${valueClasses[tone]}`}>
          {value}
        </p>
      )}
      {helper ? <p className="mt-1 text-xs text-[#859491]">{helper}</p> : null}
    </div>
  )
}
