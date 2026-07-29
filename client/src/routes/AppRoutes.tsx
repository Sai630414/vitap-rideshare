import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Guards & Layouts
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import DriverRoute from './DriverRoute';
import AdminRoute from './AdminRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AdminLayout from '../layouts/AdminLayout';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import DriverSignup from '../pages/DriverSignup';
import VerifyOtp from '../pages/VerifyOtp';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import Chat from '../pages/Chat';
import RideRequests from '../pages/RideRequests';
import AuthSuccess from '../pages/AuthSuccess';
import SearchRides from '../pages/SearchRides';
import OfferRide from '../pages/OfferRide';
import DriverRegister from '../pages/DriverRegister';
import DriverDashboard from '../pages/driver/DriverDashboard';

// Admin Pages
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminApprovals from '../pages/admin/AdminApprovals';
import AdminDrivers from '../pages/admin/AdminDrivers';
import AdminDriverDetails from '../pages/admin/AdminDriverDetails';
import AdminStudents from '../pages/admin/AdminStudents';
import AdminRides from '../pages/admin/AdminRides';
import AdminReports from '../pages/admin/AdminReports';
import AdminSettings from '../pages/admin/AdminSettings';

export const AppRoutes: React.FC = () => {
  return (
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

      {/* Public Admin Login Page (No admin layout, independent view) */}
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
  );
};

export default AppRoutes;
