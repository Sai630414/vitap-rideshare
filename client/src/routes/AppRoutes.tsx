import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Guards & Layouts
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import DriverRoute from './DriverRoute';
import AdminRoute from './AdminRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminLayout from '../layouts/AdminLayout';

// Eager Critical Landing & Auth Pages (Fast Above-The-Fold Render)
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import DriverSignup from '../pages/DriverSignup';
import VerifyOtp from '../pages/VerifyOtp';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import AuthSuccess from '../pages/AuthSuccess';
import Dashboard from '../pages/Dashboard';

// Lazy Loaded Non-Critical & Sub-Module Pages
const Profile = lazy(() => import('../pages/Profile'));
const Chat = lazy(() => import('../pages/Chat'));
const RideRequests = lazy(() => import('../pages/RideRequests'));
const SearchRides = lazy(() => import('../pages/SearchRides'));
const OfferRide = lazy(() => import('../pages/OfferRide'));
const DriverRegister = lazy(() => import('../pages/DriverRegister'));
const DriverDashboard = lazy(() => import('../pages/driver/DriverDashboard'));
const RideDetails = lazy(() => import('../pages/RideDetails'));

// Admin Pages Lazy Loaded
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const AdminApprovals = lazy(() => import('../pages/admin/AdminApprovals'));
const AdminDrivers = lazy(() => import('../pages/admin/AdminDrivers'));
const AdminDriverDetails = lazy(() => import('../pages/admin/AdminDriverDetails'));
const AdminStudents = lazy(() => import('../pages/admin/AdminStudents'));
const AdminRides = lazy(() => import('../pages/admin/AdminRides'));
const AdminReports = lazy(() => import('../pages/admin/AdminReports'));
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings'));

const PageFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400 font-sans p-6">
    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Loading module...</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<Home />} />

        {/* Public Auth Pages */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/signup-driver"
          element={
            <PublicRoute>
              <DriverSignup />
            </PublicRoute>
          }
        />
        <Route
          path="/verify-otp"
          element={
            <PublicRoute>
              <VerifyOtp />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Public Admin Login Page */}
        <Route
          path="/admin/login"
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          }
        />

        {/* Authenticated Dashboard Pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SearchRides />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RideRequests />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Chat />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ride/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RideDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Driver Only Pages */}
        <Route
          path="/offer-ride"
          element={
            <ProtectedRoute>
              <DriverRoute>
                <DashboardLayout>
                  <OfferRide />
                </DashboardLayout>
              </DriverRoute>
            </ProtectedRoute>
          }
        />

        {/* Driver Onboarding & Status/Dashboard Routes */}
        <Route
          path="/driver/register"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DriverRegister />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DriverDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Isolated Admin Portal Routes */}
        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/approvals"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminApprovals />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/drivers"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDrivers />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/drivers/:id"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminDriverDetails />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminStudents />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/rides"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminRides />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminReports />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminLayout>
                <AdminSettings />
              </AdminLayout>
            </AdminRoute>
          }
        />

        <Route path="/auth/success" element={<AuthSuccess />} />

        {/* Redirect all unmatched routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
