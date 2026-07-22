import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { TasksPage } from '@/pages/TasksPage';
import { KpiPage } from '@/pages/KpiPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { StaffPage } from '@/pages/StaffPage';
import { AnnouncementsPage } from '@/pages/AnnouncementsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { InsightsPage } from '@/pages/InsightsPage';
import type { UserRole } from '@/types';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary-600 animate-pulse flex items-center justify-center text-white text-xl font-bold">
          E
        </div>
        <p className="text-sm text-neutral-400">Memuatkan...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/kpi" element={<KpiPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/staff" element={<ProtectedRoute roles={['admin', 'manager', 'supervisor']}><StaffPage /></ProtectedRoute>} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/templates" element={<ProtectedRoute roles={['admin', 'manager']}><TemplatesPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute roles={['admin', 'manager']}><InsightsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
