import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Lock, Check, X, ArrowRight, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation state rules
  const [rules, setRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

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

    if (!name || !email || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (!email.endsWith('@vitapstudent.ac.in')) {
      toast.error('Registration is restricted to @vitapstudent.ac.in email addresses');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet all the security requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await signup({ name, email, password, confirmPassword });
      toast.success(res.message || 'Registration successful! Verification code sent.');
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden font-sans">
      {/* Glow backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
              VIT RideShare
            </h1>
          </Link>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Create an account to share rides on campus
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center border-b border-zinc-800/40 pb-4">
            <CardTitle className="text-xl">Student Sign Up</CardTitle>
            <CardDescription>
              Exclusive registration for @vitapstudent.ac.in
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-5 h-5" />}
                required
              />

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
                Register Account
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>

            <div className="mt-5 text-center text-sm">
              <span className="text-zinc-400">Already have an account? </span>
              <Link to="/login" className="text-violet-400 font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
