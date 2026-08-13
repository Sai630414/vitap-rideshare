import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, ChevronRight, ShieldCheck, Eye, EyeOff, Home as HomeIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const Login: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get path to redirect back to
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await login(email, password);
      if (response && response.status === 'unverified') {
        toast.error('Your email address is unverified. Please verify first.');
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        toast.success(`Welcome back, ${response?.data?.user?.name || 'User'}!`);
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?mobile=true`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start antialiased sm:py-4 font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile-First Frame Container (Max 480px width centered on desktop, edge-to-edge on mobile) */}
      <div className="w-full max-w-[480px] min-h-screen sm:min-h-[92vh] sm:max-h-[92vh] bg-slate-50 dark:bg-slate-950 sm:rounded-[2.5rem] shadow-2xl relative flex flex-col overflow-hidden border border-slate-800/20">
        
        {/* Native Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logoImg} alt="Waygo Logo" className="w-8 h-8 object-contain rounded-xl shadow-md group-active:scale-95 transition-transform" />
            <div>
              <span className="text-lg font-black tracking-tight leading-none block">
                <span className="text-slate-900 dark:text-white">Way</span>
                <span className="text-emerald-600 dark:text-emerald-400">go</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase leading-none block mt-0.5">VITAP Campus</span>
            </div>
          </Link>

          <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors">
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </header>

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
          
          {/* Ambient Glow Orbs */}
          <div className="relative text-center pt-2">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <img src={logoImg} alt="Waygo Logo" className="w-16 h-16 object-contain rounded-2xl shadow-xl shadow-emerald-600/20 mx-auto mb-3 transform rotate-3 hover:rotate-0 transition-transform duration-500" />
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-slate-900 dark:text-white">Way</span>
              <span className="text-emerald-600 dark:text-emerald-400">go</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              The official ride-sharing network for VIT-AP
            </p>
          </div>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Welcome Back</CardTitle>
              <CardDescription>
                Access your secure campus travel portal
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
              <form onSubmit={handleManualLogin} className="flex flex-col gap-4">
                <Input
                  label="College Email"
                  placeholder="rollnumber@vitapstudent.ac.in"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <Input
                      label="Password"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={<Lock className="w-5 h-5" />}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex justify-end pr-1 pt-1">
                    <Link to="/forgot-password" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <Button type="submit" className="w-full py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 rounded-2xl" loading={loading}>
                  Sign In
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Secure Social Login
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2.5 w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl transition-all duration-300 shadow-sm active:scale-95 text-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google Workspace
              </button>

              <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                Don't have an account?{' '}
                <Link to="/signup" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  Register here
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Frame Footer */}
          <footer className="pt-4 pb-2 border-t border-slate-200/60 dark:border-slate-800/60 text-center space-y-1">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">&copy; {new Date().getFullYear()} Waygo VIT-AP Campus Network</p>
          </footer>

        </main>
      </div>
    </div>
  );
};

export default Login;
