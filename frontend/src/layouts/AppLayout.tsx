import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#e1e2eb]">
      <Navbar />
      <main className="min-h-screen w-full pt-16 md:pl-60">
        <Outlet />
      </main>
    </div>
  )
}
