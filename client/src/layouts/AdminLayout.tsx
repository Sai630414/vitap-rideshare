import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Car,
  AlertTriangle,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { name: 'Overview Stats', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Driver Approvals', path: '/admin/approvals', icon: ShieldAlert },
    { name: 'Drivers Database', path: '/admin/drivers', icon: Car },
    { name: 'Students Database', path: '/admin/students', icon: Users },
    { name: 'Rides Database', path: '/admin/rides', icon: ClipboardList },
    { name: 'Violation Reports', path: '/admin/reports', icon: AlertTriangle },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-emerald-950/60 bg-slate-900/60 backdrop-blur-xl shrink-0">
        {/* Brand */}
        <div className="p-6 border-b border-emerald-950/40">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            <span className="text-lg font-black tracking-wider bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              ADMIN PORTAL
            </span>
          </Link>
        </div>

        {/* Admin info */}
        <div className="p-4 flex items-center gap-3 border-b border-emerald-950/20 bg-emerald-950/10">
          <img
            src={user?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Admin')}`}
            alt="profile"
            className="w-9 h-9 rounded-full object-cover border border-emerald-500/30"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-slate-200">{user?.name}</p>
            <p className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase mt-0.5">
              Super Admin
            </p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-emerald-400'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-emerald-950/40">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Exit Admin Area
          </button>
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex md:hidden items-center justify-between px-6 py-4 border-b border-emerald-950/40 bg-slate-900/80 backdrop-blur-md">
          <Link to="/admin/dashboard" className="text-sm font-black tracking-widest text-emerald-400">
            ADMIN PORTAL
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] z-40 flex flex-col bg-slate-950/95 border-b border-emerald-950/60 p-6 space-y-4 overflow-y-auto">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                      active ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-950/20"
              >
                <LogOut className="w-4 h-4" />
                Exit Admin Area
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
