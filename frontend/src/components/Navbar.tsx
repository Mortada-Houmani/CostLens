import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/aws-accounts', label: 'AWS Accounts' },
  { to: '/scans', label: 'Scans' },
  { to: '/findings', label: 'Findings' },
]

export function Navbar() {
  return (
    <>
      <header className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#10131a] px-4 md:px-6">
        <div className="flex items-center gap-3">
          <p className="text-lg font-bold tracking-tight text-[#46eedd]">
            CostLens
          </p>
          <span className="hidden border-l border-white/10 pl-3 text-xs font-bold uppercase tracking-[0.16em] text-[#859491] sm:inline">
            Precision Visibility
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-9 items-center rounded border border-white/10 bg-[#0b0e14] px-3 text-sm text-[#859491] md:flex md:w-64">
            Search resources
          </div>
          <button className="rounded border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#bacac6] hover:border-[#46eedd]/50 hover:text-[#46eedd]">
            Support
          </button>
        </div>
      </header>

      <nav className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-60 flex-col border-r border-white/10 bg-[#191c22] px-2 py-4 md:flex">
        <div className="mb-6 px-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#46eedd]">
            Navigation
          </p>
        </div>
        <div className="flex-1 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'border-r-2 border-[#46eedd] bg-[#46eedd]/10 text-[#46eedd]'
                    : 'text-[#bacac6] hover:bg-white/5 hover:text-[#e1e2eb]',
                ].join(' ')
              }
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4">
          <NavLink
            to="/scans"
            className="flex w-full items-center justify-center rounded bg-[#00d1c1] px-3 py-2 text-sm font-semibold text-[#003732] shadow-[0_0_16px_rgba(0,209,193,0.18)] hover:bg-[#46eedd]"
          >
            Start Scan
          </NavLink>
        </div>
      </nav>
    </>
  )
}
