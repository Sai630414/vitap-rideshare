import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, ArrowRight, RotateCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const VerifyOtp: React.FC = () => {
  const { verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60); // 60 seconds resend timer

  // Refs for each input box
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (!email) {
      toast.error('Email not found. Please register or log in first.');
      navigate('/login');
    }
  }, [email, navigate, toast]);

  // Countdown timer for resend
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Handle value change for a single digit input
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // only digits

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next box if current is filled
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle backspace key press
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Clear previous input and focus it
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  // Handle clipboard paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();

    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const pasteArray = pasteData.split('');
      setOtp(pasteArray);
      // Focus the last input box
      inputRefs.current[5].focus();
      toast.success('Code pasted successfully');
    } else {
      toast.error('Invalid code format pasted. Please paste a 6-digit number.');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');

    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp(email, code);
      toast.success(response.message || 'Email verified successfully! Welcome to VIT RideShare.');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      const response = await resendOtp(email);
      toast.success(response.message || 'A new verification code was dispatched to your email.');
      setTimer(60); // Reset countdown timer
      setOtp(new Array(6).fill('')); // Clear inputs
      inputRefs.current[0].focus(); // Focus first input
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-violet-400 animate-pulse" />
            Verify Account
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Enter the 6-digit OTP code sent to:
          </p>
          <p className="text-xs font-bold text-violet-300 mt-1 select-all">
            {email}
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Enter OTP Code</CardTitle>
            <CardDescription>
              Check your college student spam/inbox folder
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleVerify} className="flex flex-col gap-6">
              {/* Digit Inputs Row */}
              <div className="flex justify-between items-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputRefs.current[idx] = el as HTMLInputElement)}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-xl font-bold bg-zinc-900 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-violet-600/60 focus:border-violet-600 rounded-xl text-white transition-all"
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full py-3" loading={loading}>
                  Verify OTP
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>

                {/* Resend OTP details */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={timer > 0 || resending}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-zinc-400 hover:text-violet-400 disabled:opacity-50 disabled:hover:text-zinc-400 disabled:pointer-events-none transition-all active:scale-[0.98]"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Verification Code'}
                </button>
              </div>
            </form>

            <div className="mt-4 text-center text-sm border-t border-zinc-800/40 pt-4">
              <Link to="/login" className="text-zinc-500 hover:text-zinc-300 font-semibold hover:underline">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyOtp;
