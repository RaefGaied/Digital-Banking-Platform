import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
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
                <Route path='dashboard' element={<DashboardPage />} />
                <Route path='transactions' element={<TransactionsPage />} />
                <Route path='history' element={<HistoryPage />} />
                <Route path='cards' element={<CardsPage />} />
                <Route path='invest' element={<InvestPage />} />
                <Route path='analytics' element={<AnalyticsPage />} />
                <Route path='profile' element={<ProfilePage />} />
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