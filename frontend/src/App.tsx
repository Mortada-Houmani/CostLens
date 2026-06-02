import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAccess } from './auth/RequireAccess'
import { AppLayout } from './layouts/AppLayout'
import { AwsAccountsPage } from './pages/AwsAccountsPage'
import { DashboardPage } from './pages/DashboardPage'
import { FindingsPage } from './pages/FindingsPage'
import { LoginPage } from './pages/LoginPage'
import { ScanDetailsPage } from './pages/ScanDetailsPage'
import { ScansPage } from './pages/ScansPage'

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAccess />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="aws-accounts" element={<AwsAccountsPage />} />
          <Route path="scans" element={<ScansPage />} />
          <Route path="scans/:id" element={<ScanDetailsPage />} />
          <Route path="findings" element={<FindingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
