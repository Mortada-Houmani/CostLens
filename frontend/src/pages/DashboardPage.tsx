import { Component, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
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

interface AnalyticsResource {
  id: string
  name: string
  service: Service
}

interface AnalyticsResponse {
  range: AnalyticsRange
  points: TelemetryPoint[]
  source: {
    cost: string
    metrics: string
  }
}

type AnalyticsRange = 'weekly' | 'monthly'

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

const serviceLabels: Record<Service, string> = {
  EC2: 'EC2 Instances',
  ECS: 'ECS Services',
  RDS: 'RDS Databases',
  S3: 'S3 Buckets',
  EBS: 'EBS Volumes',
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(
    isDemoMode ? (mockDashboardSummary as DashboardSummary) : emptySummary,
  )
  const [isLoading, setIsLoading] = useState(!isDemoMode)
  const [error, setError] = useState<string | null>(null)
  const [analyticsService, setAnalyticsService] = useState<Service>('EC2')
  const [analyticsResource, setAnalyticsResource] = useState('')
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('weekly')
  const [liveAnalyticsResources, setLiveAnalyticsResources] = useState<
    AnalyticsResource[]
  >([])
  const [liveAnalyticsSeries, setLiveAnalyticsSeries] = useState<
    TelemetryPoint[]
  >([])
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(!isDemoMode)

  const analyticsResources = isDemoMode
    ? getAnalyticsResources(summary.latestFindings, analyticsService)
    : liveAnalyticsResources
  const selectedAnalyticsResource =
    analyticsResource || analyticsResources[0]?.id || ''
  const analyticsSeries = isDemoMode
    ? buildTelemetrySeries(analyticsService, selectedAnalyticsResource)
    : liveAnalyticsSeries

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

  useEffect(() => {
    setAnalyticsResource('')
  }, [analyticsService])

  useEffect(() => {
    if (isDemoMode) {
      return
    }

    async function loadResources() {
      setAnalyticsError(null)
      setIsAnalyticsLoading(true)

      try {
        const response = await apiClient.get<AnalyticsResource[]>(
          '/analytics/resources',
          {
            params: { service: analyticsService },
          },
        )
        const resources = normalizeAnalyticsResources(response.data)
        setLiveAnalyticsResources(resources)
        setAnalyticsResource(resources[0]?.id ?? '')
        setLiveAnalyticsSeries([])
      } catch (loadError) {
        setLiveAnalyticsResources([])
        setLiveAnalyticsSeries([])
        setAnalyticsError(getApiErrorMessage(loadError))
      } finally {
        setIsAnalyticsLoading(false)
      }
    }

    void loadResources()
  }, [analyticsService])

  useEffect(() => {
    if (isDemoMode) {
      return
    }

    if (!selectedAnalyticsResource) {
      setLiveAnalyticsSeries([])
      return
    }

    let isCurrentRequest = true

    async function loadMetrics() {
      setAnalyticsError(null)
      setIsAnalyticsLoading(true)

      try {
        const response = await apiClient.get<AnalyticsResponse>(
          '/analytics/metrics',
          {
            params: {
              service: analyticsService,
              resourceId: selectedAnalyticsResource,
              range: analyticsRange,
            },
          },
        )
        if (!isCurrentRequest) {
          return
        }

        setLiveAnalyticsSeries(normalizeTelemetryPoints(response.data?.points))
      } catch (loadError) {
        if (!isCurrentRequest) {
          return
        }

        setLiveAnalyticsSeries([])
        setAnalyticsError(getApiErrorMessage(loadError))
      } finally {
        if (isCurrentRequest) {
          setIsAnalyticsLoading(false)
        }
      }
    }

    void loadMetrics()

    return () => {
      isCurrentRequest = false
    }
  }, [analyticsRange, analyticsService, selectedAnalyticsResource])

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

      <section className="overflow-hidden rounded border border-white/10 bg-[#10131a]">
        <div className="border-b border-white/10 bg-[#272a31] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
            Resource Analytics
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#e1e2eb]">
                Service telemetry
              </h2>
              <p className="mt-1 text-sm text-[#859491]">
                Real CloudWatch metrics for the selected resource.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="inline-flex h-10 overflow-hidden rounded border border-white/10 bg-[#0b0e14]">
                {(['weekly', 'monthly'] as AnalyticsRange[]).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setAnalyticsRange(range)}
                    className={[
                      'px-3 text-xs font-bold uppercase tracking-[0.12em] transition',
                      analyticsRange === range
                        ? 'bg-[#00d1c1]/15 text-[#46eedd]'
                        : 'text-[#859491] hover:text-[#e1e2eb]',
                    ].join(' ')}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <select
                value={selectedAnalyticsResource}
                onChange={(event) => setAnalyticsResource(event.target.value)}
                disabled={analyticsResources.length === 0}
                className="h-10 rounded border border-white/10 bg-[#0b0e14] px-3 font-mono text-xs text-[#e1e2eb] outline-none focus:border-[#46eedd] focus:ring-2 focus:ring-[#46eedd]/20 sm:min-w-80"
              >
                {analyticsResources.length === 0 ? (
                  <option value="">No resources in latest scan</option>
                ) : null}
                {analyticsResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {(['EC2', 'ECS', 'RDS', 'S3', 'EBS'] as Service[]).map(
              (service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => setAnalyticsService(service)}
                  className={[
                    'whitespace-nowrap rounded border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition',
                    analyticsService === service
                      ? 'border-[#46eedd]/50 bg-[#00d1c1]/10 text-[#46eedd]'
                      : 'border-white/10 text-[#859491] hover:border-white/20 hover:text-[#e1e2eb]',
                  ].join(' ')}
                >
                  {service}
                </button>
              ),
            )}
          </div>
        </div>

        {analyticsError ? (
          <div className="mx-4 mt-4 rounded border border-[#ffb4ab]/30 bg-[#93000a]/30 px-4 py-3 text-sm text-[#ffdad6]">
            {analyticsError}
          </div>
        ) : null}

        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <TelemetryChart
            title={analyticsRange === 'weekly' ? 'Weekly Cost' : 'Monthly Cost'}
            unit="$"
            dataKey="cost"
            data={analyticsSeries}
            color="#46eedd"
            chartType="area"
            loading={isAnalyticsLoading}
          />
          <TelemetryChart
            title="CPU Utilization"
            unit="%"
            dataKey="cpu"
            data={analyticsSeries}
            color="#ffd166"
            chartType="line"
            loading={isAnalyticsLoading}
          />
          <TelemetryChart
            title="Memory Utilization"
            unit="%"
            dataKey="memory"
            data={analyticsSeries}
            color="#c7a7ff"
            chartType="line"
            loading={isAnalyticsLoading}
          />
          <TelemetryChart
            title={analyticsService === 'S3' || analyticsService === 'EBS' ? 'Storage Activity' : 'Network Throughput'}
            unit={analyticsService === 'S3' || analyticsService === 'EBS' ? 'GB' : 'MB/s'}
            dataKey="network"
            data={analyticsSeries}
            color="#8fb7ff"
            chartType="area"
            loading={isAnalyticsLoading}
          />
        </div>
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

function TelemetryChart({
  title,
  unit,
  dataKey,
  data,
  color,
  chartType,
  loading,
}: {
  title: string
  unit: string
  dataKey: 'cost' | 'cpu' | 'memory' | 'network'
  data: TelemetryPoint[]
  color: string
  chartType: 'line' | 'area'
  loading: boolean
}) {
  const chartData = normalizeTelemetryPoints(data)
  const hasMetricData = chartData.some((point) => point[dataKey] !== null)
  const latestValue = [...chartData]
    .reverse()
    .find((point) => point[dataKey] !== null)?.[dataKey]

  return (
    <TelemetryChartBoundary chartTitle={title}>
      <div className="rounded border border-white/10 bg-[#1d2026] p-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
            {title}
          </h3>
          <span className="font-mono text-xs text-[#46eedd]">
            {loading ? 'Loading' : formatTelemetryValue(latestValue, unit)}
          </span>
        </div>
        <div className="h-52">
          {loading ? (
            <div className="h-full animate-pulse rounded border border-white/5 bg-white/[0.04]" />
          ) : !hasMetricData ? (
            <div className="flex h-full items-center justify-center rounded border border-white/5 bg-[#0b0e14] px-4 text-center text-sm text-[#859491]">
              No CloudWatch datapoints found for this metric.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={chartData}
                  margin={{ left: -24, right: 8, top: 8, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#859491', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#859491', fontSize: 11 }}
                  />
                  <Tooltip content={<TelemetryTooltip unit={unit} />} />
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.16}
                    strokeWidth={2}
                    connectNulls
                  />
                </AreaChart>
              ) : (
                <LineChart
                  data={chartData}
                  margin={{ left: -24, right: 8, top: 8, bottom: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#859491', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#859491', fontSize: 11 }}
                  />
                  <Tooltip content={<TelemetryTooltip unit={unit} />} />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </TelemetryChartBoundary>
  )
}

class TelemetryChartBoundary extends Component<
  { children: ReactNode; chartTitle: string },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(previousProps: { chartTitle: string }) {
    if (
      this.state.hasError &&
      previousProps.chartTitle !== this.props.chartTitle
    ) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded border border-[#ffb4ab]/30 bg-[#1d2026] p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
            {this.props.chartTitle}
          </h3>
          <div className="mt-4 flex h-52 items-center justify-center rounded border border-[#ffb4ab]/20 bg-[#93000a]/20 px-4 text-center text-sm text-[#ffdad6]">
            Chart data could not be rendered for this metric.
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function displayValue(value: number, isLoading: boolean) {
  return isLoading ? 'Loading' : value
}

interface AnalyticsResource {
  id: string
  name: string
}

interface TelemetryPoint {
  label: string
  cost: number | null
  cpu: number | null
  memory: number | null
  network: number | null
}

function normalizeAnalyticsResources(
  resources: unknown,
): AnalyticsResource[] {
  if (!Array.isArray(resources)) {
    return []
  }

  return dedupeResources(
    resources
      .filter((resource): resource is Partial<AnalyticsResource> => {
        return Boolean(resource && typeof resource === 'object')
      })
      .map((resource) => ({
        id: String(resource.id ?? ''),
        name: String(resource.name ?? resource.id ?? 'Unnamed resource'),
        service: (resource.service ?? 'EC2') as Service,
      }))
      .filter((resource) => resource.id.length > 0),
  )
}

function normalizeTelemetryPoints(points: unknown): TelemetryPoint[] {
  if (!Array.isArray(points)) {
    return []
  }

  return points
    .filter((point): point is Partial<TelemetryPoint> => {
      return Boolean(point && typeof point === 'object')
    })
    .map((point) => ({
      label: String(point.label ?? ''),
      cost: toFiniteMetric(point.cost),
      cpu: toFiniteMetric(point.cpu),
      memory: toFiniteMetric(point.memory),
      network: toFiniteMetric(point.network),
    }))
    .filter((point) => point.label.length > 0)
}

function toFiniteMetric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : null
}

function getAnalyticsResources(
  findings: LatestFinding[],
  service: Service,
): AnalyticsResource[] {
  const resources = findings
    .filter((finding) => finding.service === service)
    .map((finding) => ({
      id: finding.resourceId,
      name: finding.resourceName ?? finding.resourceId,
      service,
    }))

  if (resources.length > 0) {
    return dedupeResources(resources)
  }

  return [
    {
      id: `${service.toLowerCase()}-demo-primary`,
      name: `${serviceLabels[service]} demo primary`,
      service,
    },
    {
      id: `${service.toLowerCase()}-demo-secondary`,
      name: `${serviceLabels[service]} demo secondary`,
      service,
    },
  ]
}

function dedupeResources(resources: AnalyticsResource[]) {
  const seen = new Set<string>()

  return resources.filter((resource) => {
    if (seen.has(resource.id)) {
      return false
    }

    seen.add(resource.id)
    return true
  })
}

function buildTelemetrySeries(
  service: Service,
  resourceId: string,
): TelemetryPoint[] {
  const seed = hashString(`${service}:${resourceId}`)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const baselines: Record<Service, { cost: number; cpu: number; memory: number; network: number }> = {
    EC2: { cost: 18, cpu: 42, memory: 58, network: 24 },
    ECS: { cost: 14, cpu: 36, memory: 64, network: 31 },
    RDS: { cost: 28, cpu: 31, memory: 72, network: 18 },
    S3: { cost: 5, cpu: 2, memory: 4, network: 86 },
    EBS: { cost: 9, cpu: 1, memory: 3, network: 64 },
  }
  const baseline = baselines[service]

  return labels.map((label, index) => {
    const variance = ((seed + index * 17) % 19) - 9

    return {
      label,
      cost: roundMetric(baseline.cost + variance * 0.7 + index * 0.9),
      cpu: clampMetric(baseline.cpu + variance + index * 1.8, 0, 100),
      memory: clampMetric(baseline.memory + variance * 0.8 + index, 0, 100),
      network: roundMetric(Math.max(0, baseline.network + variance * 2.4 + index * 3)),
    }
  })
}

function hashString(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
}

function clampMetric(value: number, min: number, max: number) {
  return roundMetric(Math.min(max, Math.max(min, value)))
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10
}

function formatTelemetryValue(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'No data'
  }

  return unit === '$' ? formatCurrency(value) : `${value}${unit}`
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

function TelemetryTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: Array<{ value?: number; name?: string }>
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) {
    return null
  }

  const point = payload[0]

  return (
    <div className="rounded border border-white/10 bg-[#0b0e14] px-3 py-2 shadow-xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#859491]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm text-[#46eedd]">
        {formatTelemetryValue(Number(point.value ?? 0), unit)}
      </p>
    </div>
  )
}
