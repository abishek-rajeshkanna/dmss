import { Navigate, Route, Routes } from 'react-router-dom'
import { Box } from '@mui/material'

import { LoginPage } from './pages/LoginPage'
import { ShellLayout } from './layout/ShellLayout'
import { NotificationsPage } from './pages/NotificationsPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { CustomersPage } from './pages/CustomersPage'
import { UsersPage } from './pages/UsersPage'
import { OrdersPage } from './pages/OrdersPage'
import { TestDrivesPage } from './pages/TestDrivesPage'
import { ServiceTicketsPage } from './pages/ServiceTicketsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { DealershipsPage } from './pages/DealershipsPage'

export function App() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ShellLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/test-drives" element={<TestDrivesPage />} />
          <Route path="/service" element={<ServiceTicketsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/dealerships" element={<DealershipsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}

