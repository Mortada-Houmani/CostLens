import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, getApiErrorMessage } from '../api/client'
import { isDemoMode, mockAwsAccounts } from '../demo/mockData'
import { formatDate } from '../utils/format'

interface AwsAccount {
  id: string
  accountName: string
  accessKeyId: string
  region: string
  createdAt: string
  user: {
    email: string
  }
}

interface ScanStartResponse {
  id: string
  status: string
}

const initialForm = {
  email: '',
  accountName: '',
  accessKeyId: '',
  secretAccessKey: '',
  region: 'eu-central-1',
}

const regions = ['eu-central-1', 'eu-west-1', 'us-east-1', 'us-west-2']

export function AwsAccountsPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<AwsAccount[]>(
    isDemoMode ? mockAwsAccounts : [],
  )
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!isDemoMode)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [scanningId, setScanningId] = useState<string | null>(null)

  async function loadAccounts() {
    const response = await apiClient.get<AwsAccount[]>('/aws-accounts')
    setAccounts(response.data)
  }

  useEffect(() => {
    if (isDemoMode) {
      return
    }

    async function loadInitialAccounts() {
      try {
        await loadAccounts()
      } catch (loadError) {
        setError(getApiErrorMessage(loadError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadInitialAccounts()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await apiClient.post('/aws-accounts', form)
      setSuccess(`${form.accountName} connected successfully.`)
      setForm(initialForm)
      await loadAccounts()
    } catch (saveError) {
      setError(getApiErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteAccount(account: AwsAccount) {
    setDeletingId(account.id)
    setError(null)
    setSuccess(null)

    try {
      await apiClient.delete(`/aws-accounts/${account.id}`)
      setSuccess(`${account.accountName} deleted.`)
      await loadAccounts()
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError))
    } finally {
      setDeletingId(null)
    }
  }

  async function startScan(account: AwsAccount) {
    setScanningId(account.id)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiClient.post<ScanStartResponse>(
        `/scans/${account.id}/start`,
      )
      navigate(`/scans/${response.data.id}`)
    } catch (scanError) {
      setError(getApiErrorMessage(scanError))
    } finally {
      setScanningId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="AWS Accounts"
        description={
          isDemoMode
            ? 'Demo accounts are preloaded, with no credentials required.'
            : 'Manage connected cloud environments and credentials.'
        }
      />

      {isDemoMode ? (
        <Alert
          tone="success"
          message="Demo mode is enabled. CostLens is using sample AWS accounts, so you do not need to enter real AWS credentials."
        />
      ) : null}

      <div className="space-y-3">
        {error ? <Alert tone="error" message={error} /> : null}
        {success ? <Alert tone="success" message={success} /> : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[#1d2026]/80 p-4 backdrop-blur-xl xl:col-span-1">
          <div className="absolute left-0 top-0 h-full w-1 bg-[#00d1c1]" />
          {isDemoMode ? (
            <DemoAccountNotice />
          ) : (
            <>
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#46eedd]">
                  Connect Account
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
                  AWS credentials
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <TextInput
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(email) =>
                    setForm((current) => ({ ...current, email }))
                  }
                />
                <TextInput
                  label="Account Name"
                  value={form.accountName}
                  placeholder="Production Core"
                  onChange={(accountName) =>
                    setForm((current) => ({ ...current, accountName }))
                  }
                />
                <SelectInput
                  label="AWS Region"
                  value={form.region}
                  options={regions}
                  onChange={(region) =>
                    setForm((current) => ({ ...current, region }))
                  }
                />
                <TextInput
                  label="Access Key ID"
                  value={form.accessKeyId}
                  placeholder="AKIA..."
                  mono
                  onChange={(accessKeyId) =>
                    setForm((current) => ({ ...current, accessKeyId }))
                  }
                />
                <TextInput
                  label="Secret Access Key"
                  type="password"
                  value={form.secretAccessKey}
                  placeholder="••••••••••••••••••••"
                  mono
                  onChange={(secretAccessKey) =>
                    setForm((current) => ({ ...current, secretAccessKey }))
                  }
                />
                <p className="text-xs leading-5 text-[#859491]">
                  Secret keys are accepted by the API for scanning and are never
                  displayed in this dashboard.
                </p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-10 w-full items-center justify-center rounded bg-[#00d1c1] px-4 text-sm font-semibold text-[#003732] transition hover:bg-[#46eedd] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Connecting account' : 'Connect account'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-[#1d2026] shadow-[0_8px_32px_rgba(0,0,0,0.35)] xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#272a31] px-4 py-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
                Active Connections
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
                Connected accounts
              </h2>
            </div>
            <span className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-[#bacac6]">
              {isLoading ? 'Loading' : `${accounts.length} total`}
            </span>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-[#191c22]">
                    <ColumnHeader>Account</ColumnHeader>
                    <ColumnHeader>Owner</ColumnHeader>
                    <ColumnHeader>Region</ColumnHeader>
                    <ColumnHeader>Access Key</ColumnHeader>
                    <ColumnHeader>Created</ColumnHeader>
                    <ColumnHeader align="right">Actions</ColumnHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="group transition-colors hover:bg-white/[0.05]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="h-2 w-2 rounded-full bg-[#00d1c1] shadow-[0_0_8px_rgba(0,209,193,0.55)]" />
                          <div>
                            <p className="font-medium text-[#e1e2eb]">
                              {account.accountName}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-[#859491]">
                              ID {account.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#bacac6]">
                        {account.user.email}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded bg-[#394857]/40 px-2 py-1 font-mono text-xs text-[#a7b7c8]">
                          {account.region}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-[#bacac6]">
                        {maskAccessKey(account.accessKeyId)}
                      </td>
                      <td className="px-4 py-4 text-[#bacac6]">
                        {formatDate(account.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isDemoMode || scanningId === account.id}
                            onClick={() => void startScan(account)}
                            className="rounded px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#46eedd] transition hover:bg-[#46eedd]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDemoMode
                              ? 'Demo'
                              : scanningId === account.id
                                ? 'Scanning'
                                : 'Start Scan'}
                          </button>
                          <button
                            type="button"
                            disabled={isDemoMode || deletingId === account.id}
                            onClick={() => void deleteAccount(account)}
                            className="rounded px-2 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ffb4ab] transition hover:bg-[#ffb4ab]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === account.id ? 'Deleting' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </div>
  )
}

function DemoAccountNotice() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#46eedd]">
          Demo Mode
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#e1e2eb]">
          No AWS credentials needed
        </h2>
      </div>
      <p className="text-sm leading-6 text-[#bacac6]">
        Sample accounts are loaded automatically so you can explore CostLens
        without connecting a real AWS environment.
      </p>
      <div className="rounded border border-white/10 bg-[#0b0e14] p-3 text-xs leading-5 text-[#859491]">
        Turn off demo mode with <span className="font-mono text-[#46eedd]">VITE_DEMO_MODE=false</span> to use the live API and enter credentials.
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  mono?: boolean
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {label}
      </span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={[
          'h-10 w-full rounded border border-white/10 bg-[#0b0e14] px-3 text-sm text-[#e1e2eb] outline-none transition placeholder:text-[#859491]/50 focus:border-[#46eedd] focus:ring-2 focus:ring-[#46eedd]/20',
          mono ? 'font-mono' : '',
        ].join(' ')}
      />
    </label>
  )
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#859491]">
        {label}
      </span>
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded border border-white/10 bg-[#0b0e14] px-3 font-mono text-sm text-[#e1e2eb] outline-none transition focus:border-[#46eedd] focus:ring-2 focus:ring-[#46eedd]/20"
      >
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
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#e1e2eb]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#bacac6]">{description}</p>
      </div>
    </div>
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

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-[#e1e2eb]">
        No AWS accounts connected.
      </p>
      <p className="mt-1 text-sm text-[#859491]">
        Add credentials to run your first CostLens scan.
      </p>
    </div>
  )
}

function Alert({
  tone,
  message,
}: {
  tone: 'error' | 'success'
  message: string
}) {
  const isError = tone === 'error'

  return (
    <div
      className={[
        'rounded border px-4 py-3 text-sm',
        isError
          ? 'border-[#ffb4ab]/30 bg-[#93000a]/30 text-[#ffdad6]'
          : 'border-[#46eedd]/30 bg-[#00d1c1]/10 text-[#46eedd]',
      ].join(' ')}
    >
      {message}
    </div>
  )
}

function maskAccessKey(accessKeyId: string) {
  if (accessKeyId.length <= 8) {
    return accessKeyId
  }

  return `${accessKeyId.slice(0, 4)}...${accessKeyId.slice(-4)}`
}
