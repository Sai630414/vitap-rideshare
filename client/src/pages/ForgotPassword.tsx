import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, KeyRound, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(email);
      toast.success(response.message || 'Password reset email sent successfully!');
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request password reset. Please try again.');
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
            Reset Password
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            VIT RideShare Account Recovery
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Recover Account</CardTitle>
            <CardDescription>
              We'll send a secure password reset link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="College Email"
                  placeholder="rollnumber@vitapstudent.ac.in"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <Button type="submit" className="mt-2 w-full py-3" loading={loading}>
                  Send Reset Link
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-5 text-center py-4">
                <div className="w-12 h-12 bg-violet-950/40 border border-violet-800/40 text-violet-400 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Reset Email Dispatched</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Please inspect your college mail inbox (and spam folder) for reset instructions. The reset link is valid for 15 minutes.
                  </p>
                </div>
                <Button variant="outline" className="w-full py-3 mt-2" onClick={() => setSubmitted(false)}>
                  Resend Link
                </Button>
              </div>
            )}

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

export default ForgotPassword;
