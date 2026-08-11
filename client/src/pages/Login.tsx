import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  Lock,
  ChevronRight,
  ShieldCheck,
  Bike,
  Car,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/Card';

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
        toast.success(
          `Welcome back, ${response?.data?.user?.name || 'User'}!`
        );
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Incorrect email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google?mobile=true`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 overflow-hidden">

      {/* Background glow */}
      <div className="fixed top-[-200px] left-[-200px] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[140px]" />
      <div className="fixed bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px]" />

      <div className="relative z-10 w-full max-w-6xl">

        {/* Main glass container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl">

          {/* ================================================= */}
          {/* LEFT SIDE - CAMPUS RIDE VISUAL */}
          {/* ================================================= */}

          <div className="relative hidden lg:flex min-h-[700px] flex-col justify-between overflow-hidden p-12">

            {/* Decorative road */}
            <div className="absolute inset-0">

              {/* Large circle */}
              <div className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full border border-white/10" />
              <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border border-primary/20" />

              {/* Road */}
              <div className="absolute bottom-[-80px] left-1/2 -translate-x-1/2 w-[220px] h-[600px] bg-slate-900 rotate-[12deg] rounded-[50%] border border-white/10" />

              {/* Road markings */}
              <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-2 h-[450px] border-l-2 border-dashed border-white/20 rotate-[12deg]" />

              {/* Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

            </div>

            {/* Brand */}
            <div className="relative z-10">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/30">
                  <ShieldCheck className="w-7 h-7 text-white" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">
                    Waygo
                  </h2>

                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary">
                    VIT-AP Rideshare
                  </p>
                </div>

              </div>

            </div>

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center text-center">

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                VIT-AP Campus
              </div>

              <h1 className="text-5xl xl:text-6xl font-black tracking-tight text-white leading-[0.95]">
                Your Ride.
                <br />

                <span className="text-primary">
                  Your Campus.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-white/50 font-medium leading-relaxed">
                Connect with verified VITians, share your journey,
                and make every campus trip easier.
              </p>

              {/* VEHICLES */}
              <div className="relative w-full h-52 mt-8">

                {/* Bike 1 */}
                <div className="absolute left-[8%] bottom-8 w-24 h-24 rounded-3xl bg-white/10 border border-white/10 backdrop-blur-xl flex items-center justify-center rotate-[-8deg] hover:rotate-0 hover:-translate-y-3 transition-all duration-500 shadow-xl">

                  <Bike className="w-12 h-12 text-primary" />

                </div>


                {/* Car - center */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-14 w-32 h-32 rounded-[2.5rem] bg-primary/15 border border-primary/30 backdrop-blur-xl flex items-center justify-center hover:-translate-y-3 transition-all duration-500 shadow-2xl shadow-primary/20">

                  <Car className="w-16 h-16 text-primary" />

                </div>


                {/* Bike 2 */}
                <div className="absolute right-[8%] bottom-8 w-24 h-24 rounded-3xl bg-white/10 border border-white/10 backdrop-blur-xl flex items-center justify-center rotate-[8deg] hover:rotate-0 hover:-translate-y-3 transition-all duration-500 shadow-xl">

                  <Bike className="w-12 h-12 text-primary" />

                </div>

              </div>

            </div>


            {/* Bottom features */}
            <div className="relative z-10 grid grid-cols-3 gap-3">

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <ShieldCheck className="w-5 h-5 text-primary mb-2" />
                <p className="text-white text-xs font-bold">
                  Verified
                </p>
                <p className="text-white/40 text-[10px] mt-1">
                  Students only
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <Car className="w-5 h-5 text-primary mb-2" />
                <p className="text-white text-xs font-bold">
                  Easy Rides
                </p>
                <p className="text-white/40 text-[10px] mt-1">
                  Share & save
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
                <p className="text-white text-xs font-bold">
                  Safe
                </p>
                <p className="text-white/40 text-[10px] mt-1">
                  Campus travel
                </p>
              </div>

            </div>

          </div>


          {/* ================================================= */}
          {/* RIGHT SIDE - LOGIN */}
          {/* ================================================= */}

          <div className="bg-white p-6 sm:p-10 md:p-14 flex items-center">

            <div className="w-full max-w-md mx-auto">

              {/* Mobile logo */}
              <div className="flex lg:hidden items-center justify-center mb-8">

                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>

              </div>


              <div className="text-center mb-8">

                <p className="text-primary text-[10px] font-black uppercase tracking-[0.25em] mb-3">
                  Welcome to Waygo
                </p>

                <h1 className="text-4xl font-black tracking-tight text-foreground">
                  Welcome Back
                </h1>

                <p className="text-muted-foreground font-medium mt-3">
                  Access your secure campus travel portal
                </p>

              </div>


              <Card className="border border-border shadow-none bg-transparent">

                <CardHeader className="hidden">
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Access your secure campus travel portal
                  </CardDescription>
                </CardHeader>


                <CardContent className="p-0 flex flex-col gap-6">

                  {/* ================= MANUAL LOGIN ================= */}

                  <form
                    onSubmit={handleManualLogin}
                    className="flex flex-col gap-5"
                  >

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

                        <Link
                          to="/forgot-password"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Forgot Password?
                        </Link>

                      </div>

                    </div>


                    <Button
                      type="submit"
                      className="w-full py-4 text-lg rounded-2xl shadow-xl shadow-primary/20"
                      loading={loading}
                    >
                      Sign In
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>

                  </form>


                  {/* ================= DIVIDER ================= */}

                  <div className="relative flex items-center py-2">

                    <div className="flex-grow border-t border-border" />

                    <span className="flex-shrink mx-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                      Secure Social Login
                    </span>

                    <div className="flex-grow border-t border-border" />

                  </div>


                  {/* ================= GOOGLE LOGIN ================= */}

                  <button
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-white border-2 border-border hover:border-primary/30 hover:bg-primary/5 text-foreground font-bold rounded-2xl transition-all duration-300 shadow-sm active:scale-[0.98]"
                  >

                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
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

                    Google Workspace

                  </button>


                  {/* ================= REGISTER ================= */}

                  <p className="text-center text-sm font-medium text-muted-foreground">

                    Don't have an account?{' '}

                    <Link
                      to="/signup"
                      className="text-primary font-bold hover:underline"
                    >
                      Register here
                    </Link>

                  </p>

                </CardContent>

              </Card>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;