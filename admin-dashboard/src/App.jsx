import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './adminLoginpage/login.jsx';
import { ProtectedRoute } from './protectedRoute.jsx';
import SuperAdminDashboard from './superAdmin/superadmindashboard.jsx';
import BusinessApplyForm from './businessApply/BusinessApplyForm.jsx';
import BusinessApplicationsPage from './superAdmin/BusinessApplicationsPage.jsx';
import SystemWalletPage from './superAdmin/SystemWalletPage.jsx';
import ComingSoon from './shared/ComingSoon.jsx';
import ApplicationStatus from './businessApply/ApplicationStatus.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import PlatformOverviewPage from './superAdmin/PlatformOverviewPage.jsx';
import PayoutApprovalsPage from './superAdmin/PayoutApprovalsPage.jsx';
import WebhookHealthPage from './superAdmin/WebhookHealthPage.jsx';
import AllComplaintsPage from './superAdmin/AllComplaintsPage.jsx';
import BusinessManagementPage from './superAdmin/BusinessManagementPage.jsx';
import AccountPage from './superAdmin/AccountPage.jsx';
import AdvertsModerationPage from './superAdmin/AdvertsPage.jsx';
import AdminOverviewPage from './admin/AdminOverviewPage.jsx';
import AdminWalletPage from './admin/AdminWalletPage.jsx';
import AdminPayoutsPage from './admin/AdminPayoutsPage.jsx';
import AdminAdvertsPage from './admin/AdminAdvertsPage.jsx';
import AdminReviewsPage from './admin/AdminReviewsPage.jsx';
import AdminComplaintsPage from './admin/AdminComplaintsPage.jsx';
import AdminJobApplicationsPage from './admin/AdminJobApplicationsPage.jsx';
import AdminOrdersPage from './admin/AdminOrdersPage.jsx';
import AdminMenuPage from './admin/AdminMenuPage.jsx';
import AdminSettingsPage from './admin/AdminSettingsPage.jsx';
import JobBoardPage from './jobs/JobBoardPage.jsx';
import DriverLayout from './driver/DriverLayout.jsx';
import DriverDashboardPage from './driver/DriverDashboardPage.jsx';
import DriverApplyPage from './driver/DriverApplyPage.jsx';
import DriverApplicationsPage from './superAdmin/DriverApplicationsPage.jsx';


const App = () => {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      <Route path="/jobs" element={<JobBoardPage />} />
      <Route path="/driver/apply" element={<DriverApplyPage />} />

      <Route
        path="/apply"
        element={
          <BusinessApplyForm />
        }
      />

      <Route path="/apply/status" element={<ApplicationStatus />} />

      <Route
        path="/driver"
        element={
          <ProtectedRoute allowedRoles={["driver"]} redirectTo="/login">
            <DriverLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DriverDashboardPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin", "superadmin"]} redirectTo="/login">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="job-applications" element={<AdminJobApplicationsPage />} />
        <Route path="menu" element={<AdminMenuPage />} />
        <Route path="adverts" element={<AdminAdvertsPage />} />
        <Route path="wallet" element={<AdminWalletPage />} />
        <Route path="payouts" element={<AdminPayoutsPage />} />
        <Route path="complaints" element={<AdminComplaintsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Superadmin area */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRoles={["superadmin"]} redirectTo="/admin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<PlatformOverviewPage />} />
        <Route path="platform" element={<PlatformOverviewPage />} />
        <Route path="businesses" element={<BusinessApplicationsPage />} />
        <Route path="business-management" element={<BusinessManagementPage />} />
        <Route path="adverts" element={<AdvertsModerationPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="driver-applications" element={<DriverApplicationsPage />} />
        <Route path="system-wallet" element={<SystemWalletPage />} />
        <Route path="payout-approvals" element={<PayoutApprovalsPage />} />
        <Route path="all-complaints" element={<AllComplaintsPage />} />
        <Route path="webhook-health" element={<WebhookHealthPage />} />
        <Route path="system-settings" element={<ComingSoon title="System Settings" />} />
        <Route path="support" element={<ComingSoon title="Support" />} />
      </Route>
    </Routes>
  );
};

export default App;
