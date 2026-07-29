import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const DriverRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-555">Verifying credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is admin, they shouldn't offer rides
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // If no driver details registered yet, route to onboarding application form
  if (!user.driverDetails) {
    return <Navigate to="/driver/register" replace />;
  }

  // If driver details exist but account is not approved or paid yet, route to status checker / payment gateway
  if (user.role !== 'driver' || !user.verifiedDriver) {
    return <Navigate to="/driver/dashboard" replace />;
  }

  return <>{children}</>;
};

export default DriverRoute;
