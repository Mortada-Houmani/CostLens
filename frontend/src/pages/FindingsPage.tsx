import { useEffect, useState } from 'react'
import { apiClient, getApiErrorMessage } from '../api/client'
import { CopyButton } from '../components/CopyButton'
import { SeverityBadge } from '../components/SeverityBadge'
import { isDemoMode, mockFindings } from '../demo/mockData'
import { formatCurrency, formatDate } from '../utils/format'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type Service = 'EC2' | 'EBS' | 'S3' | 'RDS' | 'ECS'

interface Finding {
  id: string
  service: Service
  resourceId: string
  resourceName: string | null
  region: string
  severity: Severity
  type: string
  message: string
  estimatedMonthlyWaste: string | null
  recommendation: string
  fixCommand: string | null
  createdAt: string
  scan: {
    id: string
    status: string
  }
}

export function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [service, setService] = useState('')
  const [severity, setSeverity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (isDemoMode) {
      setFindings(
        (mockFindings as Finding[]).filter((finding) => {
          const serviceMatches = service ? finding.service === service : true
          const severityMatches = severity
            ? finding.severity === severity
            : true

          return serviceMatches && severityMatches
        }),
      )
      setIsLoading(false)
      return
    }

    async function loadFindings() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.get<Finding[]>('/findings', {
          params: {
            service: service || undefined,
            severity: severity || undefined,
          },
        })

        setFindings(response.data)
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadFindings()
  }, [service, severity])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <div className="flex items-end justify-between border-b border-white/10 pb-4">
        <PageHeader
          title="Active Findings"
          description={
            isDemoMode
              ? 'Explore sample security risks and cost optimizations.'
              : 'Review and remediate security risks and cost optimizations.'
          }
        />
      </div>

      {isDemoMode ? (
        <DemoBanner message="Demo mode is enabled. Findings are mocked and filters run in the browser." />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <section className="flex flex-wrap items-center gap-3 rounded border border-white/10 bg-[#10131a] p-3">
        <FilterSelect
          label="Service"
          value={service}
          onChange={setService}
          options={['EC2', 'EBS', 'S3', 'RDS', 'ECS']}
          allLabel="All Services"
        />
        <FilterSelect
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={['HIGH', 'MEDIUM', 'LOW']}
          allLabel="All Severities"
        />
        <button
          type="button"
          onClick={() => {
            setService('')
            setSeverity('')
          }}
          className="rounded border border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#46eedd] hover:bg-white/5"
        >
          Clear Filters
        </button>
      </section>

      <section className="overflow-hidden rounded border border-white/10 bg-[#10131a]">
        {isLoading ? (
          <LoadingRows />
        ) : findings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#32353c]">
                <tr>
                  <ColumnHeader>Service</ColumnHeader>
                  <ColumnHeader>Resource ID</ColumnHeader>
                  <ColumnHeader>Type</ColumnHeader>
                  <ColumnHeader>Severity</ColumnHeader>
                  <ColumnHeader>Estimated Waste</ColumnHeader>
                  <ColumnHeader>Recommendation</ColumnHeader>
                  <ColumnHeader>Fix Command</ColumnHeader>
                  <ColumnHeader>Created At</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {findings.map((finding) => (
                  <tr
                    key={finding.id}
                    className="relative align-top transition-colors hover:bg-white/[0.05]"
                  >
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      <div className={`absolute bottom-0 left-0 top-0 w-1 ${severityStrip(finding.severity)}`} />
                      {finding.service}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs text-[#46eedd]">
                        {finding.resourceId}
                      </p>
                      <p className="mt-1 text-xs text-[#859491]">
                        {finding.resourceName ?? finding.region}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[#e1e2eb]">{finding.type}</td>
                    <td className="px-4 py-4">
                      <SeverityBadge severity={finding.severity} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#e1e2eb]">
                      {formatCurrency(Number(finding.estimatedMonthlyWaste ?? 0))}
                    </td>
                    <td className="max-w-sm px-4 py-4 text-xs leading-5 text-[#bacac6]">
                      {finding.recommendation}
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      {finding.fixCommand ? (
                        <div className="space-y-2">
                          <div className="flex min-w-72 items-start gap-2">
                            <code className="block flex-1 break-words rounded bg-[#0b0e14] px-2 py-1 font-mono text-[11px] leading-5 text-[#46eedd]">
                              {finding.fixCommand}
                            </code>
                            <CopyButton value={finding.fixCommand} />
                          </div>
                          <p className="text-[11px] font-semibold text-[#ffb4ab]">
                            Review carefully before running this command.
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#859491]">Not available</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {formatDate(finding.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No findings match the current filters." />
        )}
      </section>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-white/10 bg-[#0b0e14] px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-sm text-[#e1e2eb] outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function PageHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#e1e2eb]">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#bacac6]">{description}</p>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-3">
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          className="h-20 animate-pulse rounded border border-white/5 bg-white/[0.04]"
        />
      ))}
    </div>
  )
}

function ColumnHeader({ children }: { children: string }) {
  return (
    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
      {children}
    </th>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-[#e1e2eb]">{text}</p>
      <p className="mt-1 text-sm text-[#859491]">
        Try clearing filters or running a fresh scan.
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

function DemoBanner({ message }: { message: string }) {
  return (
    <div className="rounded border border-[#46eedd]/30 bg-[#00d1c1]/10 px-4 py-3 text-sm text-[#bdf7f0]">
      {message}
    </div>
  )
}

function severityStrip(severity: Severity) {
  return {
    HIGH: 'bg-[#ffb4ab]',
    MEDIUM: 'bg-[#46eedd]',
    LOW: 'bg-[#b6bbc4]',
  }[severity]
}
