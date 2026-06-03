import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout.tsx';
import RequireRole from './components/auth/RequireRole.tsx';
import { I18nProvider } from './i18n/I18nContext';
import { ThemeProvider } from './theme/ThemeContext';
import MuiThemeBridge from './theme/MuiThemeBridge';
import { AuthProvider } from './context/AuthContext';

const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.tsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.tsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.tsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.tsx'));
const AdminTasksPage = lazy(() => import('./pages/admin/AdminTasksPage.tsx'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage.tsx'));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminAuditPage.tsx'));
const AdminSecurityEventsPage = lazy(() => import('./pages/admin/AdminSecurityEventsPage.tsx'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage.tsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.tsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.tsx'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.tsx'));
const CardsPage = lazy(() => import('./pages/CardsPage.tsx'));
const InvestPage = lazy(() => import('./pages/InvestPage.tsx'));
const HelpPage = lazy(() => import('./pages/HelpPage.tsx'));


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
          <AuthProvider>
            <MuiThemeBridge>
              <BrowserRouter>
                <Suspense
                  fallback={
                    <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}>
                      Loading...
                    </div>
                  }
                >
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
                        <Route path='security' element={<AdminSecurityEventsPage />} />
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
                </Suspense>
              </BrowserRouter>
            </MuiThemeBridge>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}