import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { fetchCsrfToken } from '@/lib/api';

import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageLoader } from '@/components/shared/PageLoader';
import { Role } from '@/lib/constants';

const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const VerifyOTPPage = lazy(() =>
  import('@/pages/auth/VerifyOTPPage').then((module) => ({ default: module.VerifyOTPPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const ChangePasswordPage = lazy(() =>
  import('@/pages/auth/ChangePasswordPage').then((module) => ({
    default: module.ChangePasswordPage,
  })),
);

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((module) => ({ default: module.LandingPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);

const AppointmentsPage = lazy(() =>
  import('@/pages/appointments/AppointmentsPage').then((module) => ({
    default: module.AppointmentsPage,
  })),
);
const AppointmentDetailPage = lazy(() =>
  import('@/pages/appointments/AppointmentDetailPage').then((module) => ({
    default: module.AppointmentDetailPage,
  })),
);
const BookAppointmentPage = lazy(() =>
  import('@/pages/appointments/BookAppointmentPage').then((module) => ({
    default: module.BookAppointmentPage,
  })),
);

const ProjectsPage = lazy(() =>
  import('@/pages/projects/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
);
const ProjectDetailPage = lazy(() =>
  import('@/pages/projects/ProjectDetailPage').then((module) => ({
    default: module.ProjectDetailPage,
  })),
);
const BlueprintsPage = lazy(() =>
  import('@/pages/blueprints/BlueprintsPage').then((module) => ({
    default: module.BlueprintsPage,
  })),
);
const VisitReportsListPage = lazy(() =>
  import('@/pages/visit-reports/VisitReportsListPage').then((module) => ({
    default: module.VisitReportsListPage,
  })),
);
const VisitReportPage = lazy(() =>
  import('@/pages/visit-reports/VisitReportPage').then((module) => ({
    default: module.VisitReportPage,
  })),
);
const PaymentsPage = lazy(() =>
  import('@/pages/payments/PaymentsPage').then((module) => ({ default: module.PaymentsPage })),
);
const CashierQueuePage = lazy(() =>
  import('@/pages/payments/CashierQueuePage').then((module) => ({
    default: module.CashierQueuePage,
  })),
);
const FabricationPage = lazy(() =>
  import('@/pages/fabrication/FabricationPage').then((module) => ({
    default: module.FabricationPage,
  })),
);
const CashCollectionsPage = lazy(() =>
  import('@/pages/cash/CashCollectionsPage').then((module) => ({
    default: module.CashCollectionsPage,
  })),
);
const ReportsPage = lazy(() =>
  import('@/pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const UsersPage = lazy(() =>
  import('@/pages/admin/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/admin/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

const NotFoundPage = lazy(() =>
  import('@/pages/errors/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
const UnauthorizedPage = lazy(() =>
  import('@/pages/errors/UnauthorizedPage').then((module) => ({
    default: module.UnauthorizedPage,
  })),
);

const REPORT_ROLES = [Role.CASHIER, Role.ADMIN];
const ADMIN_ROLES = [Role.ADMIN];

export default function App() {
  const { fetchMe, setCsrfToken } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const publicPaths = [
        '/',
        '/login',
        '/register',
        '/verify-otp',
        '/forgot-password',
        '/reset-password',
      ];
      const isPublicPath = publicPaths.includes(window.location.pathname);

      try {
        const token = await fetchCsrfToken();
        setCsrfToken(token);
      } catch {
        // CSRF fetch may fail if server is down
      }

      if (!isPublicPath) {
        await fetchMe();
      }
    };
    init();
  }, [fetchMe, setCsrfToken]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/appointments/book" element={<BookAppointmentPage />} />
              <Route path="/appointments/:id" element={<AppointmentDetailPage />} />

              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.ENGINEER, Role.ADMIN, Role.CUSTOMER]}
                  />
                }
              >
                <Route path="/blueprints" element={<BlueprintsPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.SALES_STAFF, Role.ENGINEER, Role.ADMIN]}
                  />
                }
              >
                <Route path="/visit-reports" element={<VisitReportsListPage />} />
                <Route path="/visit-reports/:id" element={<VisitReportPage />} />
              </Route>

              <Route path="/payments" element={<PaymentsPage />} />

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.CASHIER, Role.ADMIN]}
                  />
                }
              >
                <Route path="/cashier-queue" element={<CashierQueuePage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      Role.FABRICATION_STAFF,
                      Role.ENGINEER,
                      Role.ADMIN,
                    ]}
                  />
                }
              >
                <Route path="/fabrication" element={<FabricationPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      Role.SALES_STAFF,
                      Role.CASHIER,
                      Role.ADMIN,
                    ]}
                  />
                }
              >
                <Route path="/cash" element={<CashCollectionsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={REPORT_ROLES} />}>
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
