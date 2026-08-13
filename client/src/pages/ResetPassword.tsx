import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Check, X, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const ResetPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation rules
  const [rules, setRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    if (!token) {
      toast.error('Reset token is missing or invalid.');
      navigate('/login');
    }
  }, [token, navigate, toast]);

  useEffect(() => {
    setRules({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&#]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet security requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({ token, password, confirmPassword });
      toast.success(response.message || 'Password reset successful! Please log in.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Token is invalid or has expired. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden font-sans">
      {/* Topbar Header */}
      <header className="w-full absolute top-0 left-0 p-4 sm:p-6 flex items-center justify-between z-20">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoImg} alt="Waygo Logo" className="w-9 h-9 object-contain rounded-xl shadow-sm" />
          <span className="text-lg font-black tracking-tight">
            <span className="text-white">Way</span>
            <span className="text-emerald-400">go</span>
          </span>
        </Link>
      </header>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6 mt-12 sm:mt-0">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2.5">
            <img src={logoImg} alt="Waygo Logo" className="w-8 h-8 object-contain rounded-lg" />
            New Password
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            VIT RideShare Account Recovery
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Set New Password</CardTitle>
            <CardDescription>
              Ensure your account password remains secure
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="New Password"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />

              {/* Password Requirement Checks */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800/50 rounded-xl flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-zinc-400">Password must contain:</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    {rules.length ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                    )}
                    <span className={rules.length ? 'text-emerald-400' : 'text-zinc-500'}>8+ Characters</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {rules.uppercase ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                    )}
                    <span className={rules.uppercase ? 'text-emerald-400' : 'text-zinc-500'}>Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {rules.lowercase ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                    )}
                    <span className={rules.lowercase ? 'text-emerald-400' : 'text-zinc-500'}>Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {rules.number ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                    )}
                    <span className={rules.number ? 'text-emerald-400' : 'text-zinc-500'}>One number</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs col-span-2">
                    {rules.special ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                    )}
                    <span className={rules.special ? 'text-emerald-400' : 'text-zinc-500'}>Special character (@$!%*?&#)</span>
                  </div>
                </div>
              </div>

              <Input
                label="Confirm Password"
                placeholder="••••••••"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-5 h-5" />}
                required
              />

              <Button type="submit" className="mt-2 w-full py-3" loading={loading}>
                Save Password
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-4 text-center text-sm border-t border-zinc-800/40 pt-4">
              <Link to="/login" className="text-zinc-550 hover:text-zinc-300 font-semibold hover:underline">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
