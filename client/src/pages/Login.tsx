import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, User, Mail, Lock, ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden font-sans">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent font-sans">
            VIT RideShare
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Exclusive campus ride-sharing for VIT-AP
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center border-b border-zinc-800/40 pb-4">
            <CardTitle className="text-xl">Authentication Portal</CardTitle>
            <CardDescription>
              Login strictly restricted to college accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-5">
            {/* Google Login button */}
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full py-3 bg-white hover:bg-zinc-100 text-zinc-950 font-bold rounded-xl active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
              Sign In with Google
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-zinc-800"></div>
              <span className="text-xs text-zinc-500 font-bold uppercase">Or Account Login</span>
              <div className="h-px flex-1 bg-zinc-800"></div>
            </div>

            {/* Email + Password Form */}
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

              <Input
                label="Password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />

              <div className="flex justify-between items-center text-xs mt-1">
                <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                  Forgot Password?
                </Link>
                <span className="text-zinc-500 font-normal">
                  No account? <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-semibold">Sign Up</Link>
                </span>
              </div>

              <Button type="submit" className="mt-2 w-full py-3" loading={loading}>
                Sign In
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
