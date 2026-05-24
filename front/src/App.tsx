import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import RequireRole from './components/auth/RequireRole';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminTasksPage from './pages/admin/AdminTasksPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import TransactionsPage from './pages/TransactionsPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import CardsPage from './pages/CardsPage';
import InvestPage from './pages/InvestPage';
import HelpPage from './pages/HelpPage';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});



export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <Routes>
              <Route path='/login' element={<LoginPage />} />
              <Route path='/register' element={<RegisterPage />} />
              <Route path='/' element={<AppLayout />}>
                <Route index element={<Navigate to='/dashboard' replace />} />
                <Route path='dashboard' element={<RequireRole allowedRoles={["USER"]}><DashboardPage /></RequireRole>} />
                <Route path='admin' element={<RequireRole allowedRoles={["ADMIN"]}><AdminPage /></RequireRole>}>
                  <Route index element={<Navigate to='dashboard' replace />} />
                  <Route path='dashboard' element={<AdminDashboardPage />} />
                  <Route path='tasks' element={<AdminTasksPage />} />
                  <Route path='users' element={<AdminUsersPage />} />
                  <Route path='audit' element={<AdminAuditPage />} />
                </Route>
                <Route path='transactions' element={<RequireRole allowedRoles={["USER"]}><TransactionsPage /></RequireRole>} />
                <Route path='history' element={<RequireRole allowedRoles={["USER"]}><HistoryPage /></RequireRole>} />
                <Route path='cards' element={<RequireRole allowedRoles={["USER"]}><CardsPage /></RequireRole>} />
                <Route path='invest' element={<RequireRole allowedRoles={["USER"]}><InvestPage /></RequireRole>} />
                <Route path='analytics' element={<RequireRole allowedRoles={["USER"]}><AnalyticsPage /></RequireRole>} />
                <Route path='profile' element={<RequireRole allowedRoles={["USER"]}><ProfilePage /></RequireRole>} />
                <Route path='help' element={<HelpPage />} />
              </Route>
              <Route path='*' element={<Navigate to='/login' replace />} />
            </Routes>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}