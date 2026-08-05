import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, ChevronRight, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 antialiased">
      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-1/3 bg-primary/5 -z-10 rounded-b-[4rem]"></div>

      <div className="w-full max-w-md flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/30 mb-2 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Waygo
          </h1>
          <p className="text-muted-foreground font-medium max-w-[240px]">
            The premium ride-sharing network for VIT-AP
          </p>
        </div>

        <Card className="border-none shadow-premium">
          <CardHeader className="text-center pb-2">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Access your secure campus travel portal
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form onSubmit={handleManualLogin} className="flex flex-col gap-5">
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
                <Input
                  label="Password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  required
                />
                <div className="flex justify-end pr-1">
                  <Link to="/forgot-password" className="text-xs font-bold text-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full py-4 text-lg" loading={loading}>
                Sign In
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                Secure Social Login
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-border hover:border-secondary/30 hover:bg-secondary/5 text-foreground font-bold rounded-2xl transition-all duration-300 shadow-soft active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google Workspace
            </button>

            <p className="text-center text-sm font-medium text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">
                Register here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
