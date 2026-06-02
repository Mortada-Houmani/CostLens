import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AwsAccountsPage } from './pages/AwsAccountsPage'
import { DashboardPage } from './pages/DashboardPage'
import { FindingsPage } from './pages/FindingsPage'
import { ScanDetailsPage } from './pages/ScanDetailsPage'
import { ScansPage } from './pages/ScansPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="aws-accounts" element={<AwsAccountsPage />} />
        <Route path="scans" element={<ScansPage />} />
        <Route path="scans/:id" element={<ScanDetailsPage />} />
        <Route path="findings" element={<FindingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
