import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, KeyRound, ArrowRight, Home as HomeIcon } from 'lucide-react';
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
              Reset Password
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Recover your Waygo campus account
            </p>
          </div>

          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-xl rounded-3xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Recover Account</CardTitle>
              <CardDescription>
                We'll send a secure password reset link to your email
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 pt-4">
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

                  <Button type="submit" className="mt-2 w-full py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 rounded-2xl" loading={loading}>
                    Send Reset Link
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Reset Link Dispatched</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Please check your inbox (and spam folder) for instructions. The link expires in 15 minutes.
                    </p>
                  </div>
                  <Button variant="outline" className="w-full py-3 text-xs rounded-xl" onClick={() => setSubmitted(false)}>
                    Resend Email Link
                  </Button>
                </div>
              )}

              <div className="mt-2 text-center text-xs pt-3 border-t border-slate-200 dark:border-slate-800">
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

export default ForgotPassword;
