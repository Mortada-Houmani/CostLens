type Severity = 'LOW' | 'MEDIUM' | 'HIGH'

const styles: Record<Severity, string> = {
  LOW: 'border-[#b6bbc4]/25 bg-[#b6bbc4]/10 text-[#d5d9df]',
  MEDIUM: 'border-[#ffd166]/30 bg-[#ffd166]/10 text-[#ffd166]',
  HIGH: 'border-[#ff6b6b]/35 bg-[#ff6b6b]/10 text-[#ffb4ab]',
}

const dots: Record<Severity, string> = {
  LOW: 'bg-[#b6bbc4]',
  MEDIUM: 'bg-[#ffd166]',
  HIGH: 'bg-[#ff6b6b]',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${styles[severity]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[severity]}`} />
      {severity}
    </span>
  )
}
