import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Mail, Lock, Shield, ChevronRight, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';

export const AdminLogin: React.FC = () => {
  const { adminLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }

    setLoading(true);
    try {
      await adminLogin(email, password);
      toast.success('Welcome back, Administrator!');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Incorrect email or password, or you do not have administrator permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = () => {
    // Navigate to google auth redirect, which automatically grants admin role to the designated google account
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-slate-950 overflow-hidden font-sans">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-650/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-widest bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
            ADMIN GATEWAY
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-bold tracking-wider uppercase">
            VIT RideShare Control Panel
          </p>
        </div>

        <Card glass={true} className="border-emerald-950/40">
          <CardHeader className="text-center border-b border-emerald-950/30 pb-4">
            <CardTitle className="text-lg font-black tracking-wide text-slate-100">Administrator Sign In</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              Authorized personnel only. Sessions are audited.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-5">
            {/* Login form */}
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <Input
                label="Admin Email"
                placeholder="saikondareddypala@gmail.com"
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5 text-emerald-500" />}
                required
                className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-650"
              />

              <div className="relative">
                <Input
                  label="Password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: any) => setPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5 text-emerald-500" />}
                  required
                  className="bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-650"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 bottom-3 text-slate-500 hover:text-slate-350 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Button
                type="submit"
                className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                loading={loading}
              >
                Sign In securely
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-slate-800"></div>
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">Or Designated Google Account</span>
              <div className="h-px flex-1 bg-slate-800"></div>
            </div>

            {/* Google Sign-in button */}
            <button
              onClick={handleGoogleAdminLogin}
              className="flex items-center justify-center gap-3 w-full py-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-bold rounded-xl active:scale-[0.98] transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Login via Google Workspace
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
