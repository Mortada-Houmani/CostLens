import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiClient, getApiErrorMessage } from '../api/client'
import { SeverityBadge } from '../components/SeverityBadge'
import { StatCard } from '../components/StatCard'
import { isDemoMode, mockDashboardSummary } from '../demo/mockData'
import { formatCurrency } from '../utils/format'

type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type Service = 'EC2' | 'EBS' | 'S3' | 'RDS' | 'ECS'

interface LatestFinding {
  id: string
  service: Service
  resourceId: string
  resourceName: string | null
  region: string
  severity: Severity
  type: string
  estimatedMonthlyWaste: string | null
  createdAt: string
  scan: {
    id: string
    status: string
  }
}

interface DashboardSummary {
  totalFindings: number
  highSeverity: number
  mediumSeverity: number
  lowSeverity: number
  estimatedMonthlyWaste: number
  findingsByService: Record<Service, number>
  latestScan: {
    id: string
    status: string
    startedAt: string | null
    finishedAt: string | null
  } | null
  totalScans: number
  failedScans: number
  successfulScans: number
  latestFindings: LatestFinding[]
}

const emptySummary: DashboardSummary = {
  totalFindings: 0,
  highSeverity: 0,
  mediumSeverity: 0,
  lowSeverity: 0,
  estimatedMonthlyWaste: 0,
  findingsByService: { EC2: 0, EBS: 0, S3: 0, RDS: 0, ECS: 0 },
  latestScan: null,
  totalScans: 0,
  failedScans: 0,
  successfulScans: 0,
  latestFindings: [],
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(
    isDemoMode ? (mockDashboardSummary as DashboardSummary) : emptySummary,
  )
  const [isLoading, setIsLoading] = useState(!isDemoMode)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      return
    }

    async function loadSummary() {
      try {
        const response =
          await apiClient.get<DashboardSummary>('/dashboard/summary')
        setSummary(response.data)
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadSummary()
  }, [])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Environment Overview"
        description={
          isDemoMode
            ? 'Demo data showing representative cloud findings.'
            : 'Real-time analysis of active AWS infrastructure.'
        }
      />

      {isDemoMode ? (
        <DemoBanner message="Demo mode is enabled. Dashboard metrics are sample data and no API request was made." />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Est. Monthly Waste"
          value={formatCurrency(summary.estimatedMonthlyWaste)}
          helper="Monthly"
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Total Findings"
          value={displayValue(summary.totalFindings, isLoading)}
          loading={isLoading}
        />
        <StatCard
          label="High Severity"
          value={displayValue(summary.highSeverity, isLoading)}
          tone="danger"
          loading={isLoading}
        />
        <StatCard
          label="Medium Severity"
          value={displayValue(summary.mediumSeverity, isLoading)}
          tone="primary"
          loading={isLoading}
        />
        <StatCard
          label="Low Severity"
          value={displayValue(summary.lowSeverity, isLoading)}
          loading={isLoading}
        />
        <StatCard
          label="Latest Scan Status"
          value={
            isLoading
              ? 'Loading'
              : summary.latestScan?.status ?? 'No scans'
          }
          tone={
            summary.latestScan?.status?.toLowerCase() === 'failed'
              ? 'danger'
              : 'default'
          }
          loading={isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Findings By Service">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={toServiceChartData(summary.findingsByService)}
                margin={{ left: -24, right: 8, top: 8, bottom: 0 }}
              >
                <XAxis
                  dataKey="service"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#859491', fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#859491', fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff0a' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {toServiceChartData(summary.findingsByService).map((entry) => (
                    <Cell key={entry.service} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Severity Mix">
          <div className="grid min-h-64 gap-4 md:grid-cols-[1fr_180px] md:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={toSeverityChartData(summary)}
                    dataKey="count"
                    nameKey="severity"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {toSeverityChartData(summary).map((entry) => (
                      <Cell key={entry.severity} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {toSeverityChartData(summary).map((entry) => (
                <MetricRow
                  key={entry.severity}
                  label={entry.severity}
                  value={entry.count}
                  tone={entry.tone}
                />
              ))}
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Latest Scan">
          {summary.latestScan ? (
            <div className="space-y-3">
              <Link
                to={`/scans/${summary.latestScan.id}`}
                className="block truncate font-mono text-xs text-[#46eedd] hover:underline"
              >
                {summary.latestScan.id}
              </Link>
              <MetricRow label="Status" value={summary.latestScan.status} mono />
              <MetricRow label="Successful" value={summary.successfulScans} />
            </div>
          ) : (
            <EmptyState text="No scans have run yet." compact />
          )}
        </Panel>

        <Panel title="Scan Totals">
          <div className="space-y-3">
            <MetricRow label="Total scans" value={summary.totalScans} />
            <MetricRow label="Successful scans" value={summary.successfulScans} tone="primary" />
            <MetricRow label="Failed scans" value={summary.failedScans} tone="danger" />
          </div>
        </Panel>
      </section>

      <section className="overflow-hidden rounded border border-white/10 bg-[#10131a]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#272a31] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
              Recent Signals
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
              Latest Findings
            </h2>
          </div>
          <Link
            to="/findings"
            className="rounded border border-white/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#46eedd] hover:bg-white/5"
          >
            View All
          </Link>
        </div>
        {summary.latestFindings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#191c22]">
                <tr>
                  <ColumnHeader>Resource</ColumnHeader>
                  <ColumnHeader>Service</ColumnHeader>
                  <ColumnHeader>Severity</ColumnHeader>
                  <ColumnHeader>Waste</ColumnHeader>
                  <ColumnHeader>Scan</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {summary.latestFindings.map((finding) => (
                  <tr
                    key={finding.id}
                    className="transition-colors hover:bg-white/[0.05]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium text-[#e1e2eb]">
                        {finding.resourceName ?? finding.resourceId}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-[#859491]">
                        {finding.type}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {finding.service}
                    </td>
                    <td className="px-4 py-4">
                      <SeverityBadge severity={finding.severity} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#46eedd]">
                      {formatCurrency(Number(finding.estimatedMonthlyWaste ?? 0))}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/scans/${finding.scan.id}`}
                        className="font-mono text-xs text-[#e1e2eb] hover:text-[#46eedd]"
                      >
                        {finding.scan.status}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No findings yet." />
        )}
      </section>
    </div>
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
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-[#e1e2eb]">
        {title}
      </h1>
      <p className="mt-1 text-sm text-[#bacac6]">{description}</p>
    </header>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded border border-white/10 bg-[#1d2026] p-4">
      <h2 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {title}
      </h2>
      {children}
    </div>
  )
}

function MetricRow({
  label,
  value,
  tone = 'default',
  mono = false,
}: {
  label: string
  value: number | string
  tone?: 'default' | 'primary' | 'danger'
  mono?: boolean
}) {
  const color = {
    default: 'text-[#e1e2eb]',
    primary: 'text-[#46eedd]',
    danger: 'text-[#ffb4ab]',
  }[tone]

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-[#bacac6]">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : 'text-sm font-semibold'} ${color}`}>
        {value}
      </span>
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

function EmptyState({
  text,
  compact = false,
}: {
  text: string
  compact?: boolean
}) {
  return (
    <p className={`${compact ? 'py-2' : 'px-4 py-10 text-center'} text-sm text-[#859491]`}>
      {text}
    </p>
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

function displayValue(value: number, isLoading: boolean) {
  return isLoading ? 'Loading' : value
}

function toServiceChartData(findingsByService: Record<Service, number>) {
  const colors: Record<Service, string> = {
    EC2: '#46eedd',
    EBS: '#ffd166',
    S3: '#8fb7ff',
    RDS: '#ffb4ab',
    ECS: '#c7a7ff',
  }

  return Object.entries(findingsByService).map(([service, count]) => ({
    service,
    count,
    color: colors[service as Service],
  }))
}

function toSeverityChartData(summary: DashboardSummary) {
  return [
    {
      severity: 'HIGH',
      count: summary.highSeverity,
      color: '#ff6b6b',
      tone: 'danger' as const,
    },
    {
      severity: 'MEDIUM',
      count: summary.mediumSeverity,
      color: '#ffd166',
      tone: 'primary' as const,
    },
    {
      severity: 'LOW',
      count: summary.lowSeverity,
      color: '#b6bbc4',
      tone: 'default' as const,
    },
  ]
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: { service?: string; severity?: string } }>
}) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]
  const label = point.payload?.service ?? point.payload?.severity ?? point.name

  return (
    <div className="rounded border border-white/10 bg-[#0b0e14] px-3 py-2 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#859491]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-[#46eedd]">{point.value}</p>
    </div>
  )
}
