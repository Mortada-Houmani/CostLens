import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient, getApiErrorMessage } from '../api/client'
import { SeverityBadge } from '../components/SeverityBadge'
import { formatCurrency, formatDate } from '../utils/format'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type Service = 'EC2' | 'EBS' | 'S3' | 'RDS' | 'ECS'

interface Scan {
  id: string
  status: string
  findingsCount: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage?: string | null
}

interface Finding {
  id: string
  service: Service
  resourceId: string
  resourceName: string | null
  region: string
  severity: Severity
  type: string
  estimatedMonthlyWaste: string | null
}

export function ScanDetailsPage() {
  const { id } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadScan() {
      if (!id) {
        return
      }

      try {
        const scanResponse = await apiClient.get<Scan>(`/scans/${id}`)
        const nextScan = scanResponse.data

        setScan(nextScan)

        if (isTerminalStatus(nextScan.status)) {
          const findingsResponse = await apiClient.get<Finding[]>('/findings', {
            params: { scanId: id },
          })

          setFindings(findingsResponse.data)

          if (intervalId !== undefined) {
            window.clearInterval(intervalId)
          }
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      }
    }

    const intervalId = window.setInterval(() => {
      void loadScan()
    }, 3000)

    void loadScan()

    return () => {
      window.clearInterval(intervalId)
    }
  }, [id])

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <ErrorState message={error} />
      </div>
    )
  }

  if (!scan) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="h-40 animate-pulse rounded border border-white/10 bg-white/[0.04]" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <div>
        <Link
          to="/scans"
          className="inline-flex items-center text-xs font-bold uppercase tracking-[0.12em] text-[#859491] hover:text-[#46eedd]"
        >
          Back to scans
        </Link>
      </div>

      <section className="relative overflow-hidden rounded border border-white/10 bg-[#10131a] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/2 rounded-full bg-[#46eedd]/5 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[#e1e2eb]">
                Scan Details
              </h1>
              <StatusChip status={scan.status} />
            </div>
            <p className="mt-2 font-mono text-xs text-[#859491]">
              ID: <span className="text-[#46eedd]">{scan.id}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 md:grid-cols-5">
          <MetadataItem label="Created At" value={formatDate(scan.createdAt)} />
          <MetadataItem label="Started At" value={formatDate(scan.startedAt)} />
          <MetadataItem label="Finished At" value={formatDate(scan.finishedAt)} />
          <MetadataItem label="Findings" value={String(scan.findingsCount)} />
          <MetadataItem label="Status" value={scan.status} />
        </div>
      </section>

      {scan.errorMessage ? <ErrorState message={scan.errorMessage} /> : null}

      <section className="overflow-hidden rounded border border-white/10 bg-[#10131a]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#191c22] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
              Detected Findings
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
              Scan results
            </h2>
          </div>
        </div>

        {findings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#0b0e14]">
                <tr>
                  <ColumnHeader>Severity</ColumnHeader>
                  <ColumnHeader>Resource ID</ColumnHeader>
                  <ColumnHeader>Service</ColumnHeader>
                  <ColumnHeader>Issue Description</ColumnHeader>
                  <ColumnHeader align="right">Est. Monthly Cost</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {findings.map((finding) => (
                  <tr
                    key={finding.id}
                    className="relative transition-colors hover:bg-white/[0.05]"
                  >
                    <td className="px-4 py-4">
                      <SeverityBadge severity={finding.severity} />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs text-[#46eedd]">
                        {finding.resourceId}
                      </p>
                      <p className="mt-1 text-xs text-[#859491]">
                        {finding.resourceName ?? finding.region}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {finding.service}
                    </td>
                    <td className="px-4 py-4 text-[#e1e2eb]">{finding.type}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-[#ffb4ab]">
                      {formatCurrency(Number(finding.estimatedMonthlyWaste ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="This scan completed without saved findings." />
        )}
      </section>
    </div>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {label}
      </span>
      <span className="font-mono text-xs text-[#e1e2eb]">{value}</span>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const isFailed = normalized === 'failed'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs uppercase',
        isFailed
          ? 'border-[#ffb4ab]/30 bg-[#ffb4ab]/10 text-[#ffb4ab]'
          : 'border-[#46eedd]/30 bg-[#46eedd]/10 text-[#46eedd]',
      ].join(' ')}
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          isFailed ? 'bg-[#ffb4ab]' : 'bg-[#46eedd]',
        ].join(' ')}
      />
      {status}
    </span>
  )
}

function ColumnHeader({
  children,
  align = 'left',
}: {
  children: string
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={[
        'px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]',
        align === 'right' ? 'text-right' : 'text-left',
      ].join(' ')}
    >
      {children}
    </th>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-[#e1e2eb]">{text}</p>
      <p className="mt-1 text-sm text-[#859491]">
        Clean scans are good news. Run another scan after infrastructure changes.
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-[#ffb4ab]/30 bg-[#93000a]/30 px-4 py-3 text-sm text-[#ffdad6]">
      {message}
    </div>
  )
}

function isTerminalStatus(status: string) {
  const normalized = status.toLowerCase()

  return normalized === 'success' || normalized === 'failed'
}
