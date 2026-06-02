import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, getApiErrorMessage } from '../api/client'
import { isDemoMode, mockAwsAccounts, mockScans } from '../demo/mockData'
import { formatDate } from '../utils/format'

interface AwsAccount {
  id: string
  accountName: string
  region: string
}

interface Scan {
  id: string
  status: string
  findingsCount: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  errorMessage?: string | null
}

interface ScanStartResponse {
  id: string
  status: string
}

export function ScansPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AwsAccount[]>(
    isDemoMode ? mockAwsAccounts : [],
  )
  const [scans, setScans] = useState<Scan[]>(isDemoMode ? mockScans : [])
  const [selectedAccountId, setSelectedAccountId] = useState(
    isDemoMode ? mockAwsAccounts[0]?.id ?? '' : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isDemoMode)
  const [isStarting, setIsStarting] = useState(false)

  async function loadData() {
    const [accountsResponse, scansResponse] = await Promise.all([
      apiClient.get<AwsAccount[]>('/aws-accounts'),
      apiClient.get<Scan[]>('/scans'),
    ])

    setAccounts(accountsResponse.data)
    setScans(scansResponse.data)
    setSelectedAccountId((current) => current || accountsResponse.data[0]?.id || '')
  }

  useEffect(() => {
    if (isDemoMode) {
      return
    }

    async function loadInitialData() {
      try {
        await loadData()
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadInitialData()
  }, [])

  async function startScan() {
    if (!selectedAccountId) {
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const response = await apiClient.post<ScanStartResponse>(
        `/scans/${selectedAccountId}/start`,
      )
      navigate(`/scans/${response.data.id}`)
    } catch (startError) {
      setError(getApiErrorMessage(startError))
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <PageHeader
        title="Scans"
        description={
          isDemoMode
            ? 'Review sample scan history without calling the API.'
            : 'Run environment scans and review recent scanner activity.'
        }
      />

      {isDemoMode ? (
        <DemoBanner message="Demo mode is enabled. Scan history is mocked and new scans are disabled." />
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <section className="relative overflow-hidden rounded border border-white/10 bg-[#1d2026] p-4">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-[#46eedd]/5 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#46eedd]">
              Start Scan
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
              Select an account
            </h2>
            <p className="mt-1 text-sm text-[#859491]">
              {isDemoMode
                ? 'Start scan is disabled in demo mode.'
                : 'Scans are queued and update as workers finish.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              className="h-10 rounded border border-white/10 bg-[#0b0e14] px-3 font-mono text-sm text-[#e1e2eb] outline-none focus:border-[#46eedd] focus:ring-2 focus:ring-[#46eedd]/20 sm:w-80"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} ({account.region})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={isDemoMode || !selectedAccountId || isStarting}
              onClick={() => void startScan()}
              className="h-10 rounded bg-[#00d1c1] px-4 text-sm font-semibold text-[#003732] hover:bg-[#46eedd] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? 'Running scan' : 'Start scan'}
            </button>
          </div>
        </div>
        {!isLoading && accounts.length === 0 ? (
          <p className="relative z-10 mt-4 text-sm text-[#859491]">
            Add an AWS account before starting a scan.
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded border border-white/10 bg-[#10131a]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#272a31] px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
              Scanner Activity
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
              Scan History
            </h2>
          </div>
          <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-[#bacac6]">
            {isLoading ? 'Loading' : `${scans.length} total`}
          </span>
        </div>

        {isLoading ? (
          <LoadingRows />
        ) : scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-[#191c22]">
                <tr>
                  <ColumnHeader>Scan</ColumnHeader>
                  <ColumnHeader>Status</ColumnHeader>
                  <ColumnHeader>Findings</ColumnHeader>
                  <ColumnHeader>Created</ColumnHeader>
                  <ColumnHeader>Started</ColumnHeader>
                  <ColumnHeader>Finished</ColumnHeader>
                  <ColumnHeader>Error</ColumnHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="transition-colors hover:bg-white/[0.05]"
                  >
                    <td className="px-4 py-4">
                      <Link
                        to={isDemoMode ? '/scans' : `/scans/${scan.id}`}
                        className="font-mono text-xs text-[#46eedd] hover:underline"
                      >
                        {scan.id}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <StatusDot status={scan.status} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#e1e2eb]">
                      {scan.findingsCount}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {formatDate(scan.createdAt)}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {formatDate(scan.startedAt)}
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                      {formatDate(scan.finishedAt)}
                    </td>
                    <td className="max-w-72 px-4 py-4 text-xs text-[#ffb4ab]">
                      {scan.status.toLowerCase() === 'failed'
                        ? scan.errorMessage ?? 'Scan failed'
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="No scans have run yet." />
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

function ColumnHeader({ children }: { children: string }) {
  return (
    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
      {children}
    </th>
  )
}

function StatusDot({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const color =
    normalized === 'failed'
      ? 'text-[#ffb4ab]'
      : normalized === 'success'
        ? 'text-[#46eedd]'
        : 'text-[#b6bbc4]'
  const dot =
    normalized === 'failed'
      ? 'bg-[#ffb4ab]'
      : normalized === 'success'
        ? 'bg-[#46eedd]'
        : 'bg-[#b6bbc4]'

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-14 animate-pulse rounded border border-white/5 bg-white/[0.04]"
        />
      ))}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-[#e1e2eb]">{text}</p>
      <p className="mt-1 text-sm text-[#859491]">
        Connect an AWS account to begin collecting CostLens results.
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
