import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Check, X, ArrowRight, Eye, EyeOff, Home as HomeIcon } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

            <img src={logoImg} alt="Waygo Logo" className="w-14 h-14 object-contain rounded-2xl shadow-xl shadow-emerald-600/20 mx-auto mb-3" />
            <h1 className="text-2xl font-black tracking-tight">
              New Password
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Create a new secure password for Waygo
            </p>
          </div>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Set New Password</CardTitle>
              <CardDescription>
                Ensure your account credentials remain secure
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <Input
                    label="New Password"
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

                {/* Password Requirement Checks */}
                <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Password must contain:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      {rules.length ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={rules.length ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>8+ Characters</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {rules.uppercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={rules.uppercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>Uppercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {rules.lowercase ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={rules.lowercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>Lowercase letter</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      {rules.number ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={rules.number ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>One number</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs col-span-2">
                      {rules.special ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className={rules.special ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>Special character (@$!%*?&#)</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    placeholder="••••••••"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock className="w-5 h-5" />}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <Button type="submit" className="mt-2 w-full py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 rounded-2xl" loading={loading}>
                  Save Password
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>

              <div className="mt-3 text-center text-xs pt-3 border-t border-slate-200 dark:border-slate-800">
                <Link to="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  Back to Sign In
                </Link>
              </div>
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

export default ResetPassword;
