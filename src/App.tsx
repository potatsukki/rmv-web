import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { api, fetchCsrfToken } from '@/lib/api';
import { getStoredRefreshToken } from '@/lib/auth-session';

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
const VerifyTwoFactorPage = lazy(() =>
  import('@/pages/auth/VerifyTwoFactorPage').then((module) => ({
    default: module.VerifyTwoFactorPage,
  })),
);
const CompleteProfilePage = lazy(() =>
  import('@/pages/auth/CompleteProfilePage').then((module) => ({
    default: module.CompleteProfilePage,
  })),
);
const PrivacyPolicyPage = lazy(() =>
  import('@/pages/PrivacyPolicyPage').then((module) => ({
    default: module.PrivacyPolicyPage,
  })),
);
const TermsOfServicePage = lazy(() =>
  import('@/pages/TermsOfServicePage').then((module) => ({
    default: module.TermsOfServicePage,
  })),
);

const AccountLayout = lazy(() =>
  import('@/pages/account/AccountLayout').then((module) => ({
    default: module.AccountLayout,
  })),
);
const AccountProfilePage = lazy(() =>
  import('@/pages/account/AccountProfilePage').then((module) => ({
    default: module.AccountProfilePage,
  })),
);
const AccountSecurityPage = lazy(() =>
  import('@/pages/account/AccountSecurityPage').then((module) => ({
    default: module.AccountSecurityPage,
  })),
);
const AccountNotificationsPage = lazy(() =>
  import('@/pages/account/AccountNotificationsPage').then((module) => ({
    default: module.AccountNotificationsPage,
  })),
);
const AccountInfoPage = lazy(() =>
  import('@/pages/account/AccountInfoPage').then((module) => ({
    default: module.AccountInfoPage,
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
const AgentBookAppointmentPage = lazy(() =>
  import('@/pages/appointments/AgentBookAppointmentPage').then((module) => ({
    default: module.AgentBookAppointmentPage,
  })),
);
const PayOcularFeePage = lazy(() =>
  import('@/pages/appointments/PayOcularFeePage').then((module) => ({
    default: module.PayOcularFeePage,
  })),
);
const OcularFeeQueuePage = lazy(() =>
  import('@/pages/appointments/OcularFeeQueuePage').then((module) => ({
    default: module.OcularFeeQueuePage,
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
const SlotManagementPage = lazy(() =>
  import('@/pages/admin/SlotManagementPage').then((module) => ({
    default: module.SlotManagementPage,
  })),
);
const RefundQueuePage = lazy(() =>
  import('@/pages/refunds/RefundQueuePage').then((module) => ({
    default: module.RefundQueuePage,
  })),
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
const SLOT_MGMT_ROLES = [Role.ADMIN, Role.APPOINTMENT_AGENT];
const AGENT_ROLES = [Role.APPOINTMENT_AGENT];

export default function App() {
  const { fetchMe, setCsrfToken, setAccessToken } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      const publicPaths = [
        '/',
        '/login',
        '/register',
        '/verify-otp',
        '/verify-2fa',
        '/forgot-password',
        '/reset-password',
        '/complete-profile',
      ];
      const isPublicPath = publicPaths.includes(window.location.pathname);

      try {
        const token = await fetchCsrfToken();
        setCsrfToken(token);
      } catch {
        // CSRF fetch may fail if server is down
      }

      if (isPublicPath) {
        useAuthStore.setState({ isLoading: false });
        return;
      }

      // If no access token in sessionStorage, try to restore from the per-tab refresh token.
      if (!getStoredRefreshToken()) {
        useAuthStore.setState({ isLoading: false });
        return;
      }

      if (!useAuthStore.getState().accessToken) {
        try {
          const { data } = await api.post('/auth/refresh-token', {
            refreshToken: getStoredRefreshToken(),
          });
          const newToken = data?.data?.accessToken;
          if (newToken) {
            setAccessToken(newToken);
          }
        } catch {
          // Invalid refresh token — the interceptor will clear auth on the next protected request.
          useAuthStore.setState({ isLoading: false });
          return;
        }
      }

      await fetchMe();
    };
    init();
  }, [fetchMe, setCsrfToken, setAccessToken]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOTPPage />} />
          <Route path="/verify-2fa" element={<VerifyTwoFactorPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Account settings (nested tabs) */}
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<Navigate to="/account/profile" replace />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="security" element={<AccountSecurityPage />} />
                <Route path="notifications" element={<AccountNotificationsPage />} />
                <Route path="info" element={<AccountInfoPage />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/appointments/book" element={<BookAppointmentPage />} />
              <Route
                element={
                  <ProtectedRoute allowedRoles={AGENT_ROLES} />
                }
              >
                <Route path="/appointments/create-for-customer" element={<AgentBookAppointmentPage />} />
              </Route>
              <Route path="/appointments/:id/pay-ocular-fee" element={<PayOcularFeePage />} />
              <Route path="/appointments/:id" element={<AppointmentDetailPage />} />

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.CASHIER, Role.ADMIN]}
                  />
                }
              >
                <Route path="/ocular-fee-queue" element={<OcularFeeQueuePage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.CUSTOMER, Role.SALES_STAFF, Role.ENGINEER, Role.FABRICATION_STAFF, Role.ADMIN]}
                  />
                }
              >
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/blueprint" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/payments" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/fabrication" element={<ProjectDetailPage />} />
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

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.CUSTOMER, Role.CASHIER, Role.SALES_STAFF, Role.ADMIN]}
                  />
                }
              >
                <Route path="/payments" element={<PaymentsPage />} />
              </Route>



              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={[Role.CASHIER, Role.ADMIN]}
                  />
                }
              >
                <Route path="/cashier-queue" element={<CashierQueuePage />} />
                <Route path="/refund-requests" element={<RefundQueuePage />} />
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

              <Route element={<ProtectedRoute allowedRoles={SLOT_MGMT_ROLES} />}>
                <Route path="/slot-management" element={<SlotManagementPage />} />
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
