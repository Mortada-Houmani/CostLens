import { useState } from 'react'

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="rounded border border-white/15 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#46eedd] transition hover:bg-[#46eedd]/10"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
