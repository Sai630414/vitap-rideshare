import React from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.png';
import {
  Car,
  Shield,
  MessageSquare,
  AlertTriangle,
  MapPin,
  ChevronRight,
  HelpCircle,
  Users,
  Compass,
  Zap,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from "../context/AuthContext";

export const Home: React.FC = () => {
  const { user, logout } = useAuth();

  const faqs = [
    { q: 'Who can register?', a: 'Only VIT-AP members with @vitapstudent.ac.in or @vitap.ac.in emails.' },
    { q: 'Is it free?', a: 'Prices are set by drivers to split fuel costs. We take zero commission.' },
    { q: 'Is it safe?', a: 'All drivers are manually verified. Real-time GPS tracking and SOS alerts are active.' },
  ];

  return (
    <div className="min-h-screen  flex flex-col items-center justify-start antialiased sm:py-4 font-sans text-slate-900 dark:text-slate-100">
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

          {!user ? (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 px-2 py-1 transition-colors">
                Login
              </Link>
              <Link to="/login">
                <Button size="sm" className="px-3.5 py-1.5 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 font-bold">
                  Join Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <img src={user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="" className="h-6 w-6 rounded-full object-cover border border-emerald-500/30" />
                <span className="text-xs font-black truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
              </Link>
              <Link to="/dashboard">
                <Button size="sm" variant="outline" className="rounded-xl text-xs px-2.5 py-1">
                  Dashboard
                </Button>
              </Link>
              <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-colors ml-1">
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Screen Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 no-scrollbar">

          {/* Hero */}
          <section className="relative pt-4 pb-6 text-center overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Shield className="w-3.5 h-3.5" />
              <span>VIT-AP Campus Network</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Campus Travel, <br />
              <span className="text-emerald-600 dark:text-emerald-400">Redefined.</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-3 font-medium leading-relaxed max-w-xs mx-auto">
              The official ride-sharing hub for VITians. Connect with verified drivers, share costs, and commute safely across campus.
            </p>

            <div className="flex flex-col gap-2.5 mt-6">
              <Link to="/login" className="w-full">
                <Button size="lg" className="w-full py-3.5 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all">
                  Find a Ride <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login" className="w-full">
                <Button variant="outline" size="lg" className="w-full py-3.5 rounded-2xl text-sm font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  Offer a Ride
                </Button>
              </Link>
            </div>
          </section>

          {/* Features */}
          <section className="space-y-3 pt-2">
            <div className="space-y-3">
              {[
                { icon: Shield, title: 'Verified Only', desc: 'Strict @vitapstudent.ac.in authentication for total safety.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { icon: Car, title: 'Cost Sharing', desc: 'Split fuel costs with fellow students. Zero platform fees.', color: 'text-teal-500', bg: 'bg-teal-500/10' },
                { icon: AlertTriangle, title: 'Safety First', desc: 'Real-time GPS tracking and instant SOS alert system.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                  <div className={`w-10 h-10 ${f.bg} ${f.color} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{f.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="space-y-3 pt-2">
            <div className="text-left px-1">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">How it works</h2>
            </div>

            <div className="space-y-3">
              {[
                { n: '01', t: 'Search or Post', d: 'Find rides matching your schedule or list your own route if you are driving.' },
                { n: '02', t: 'Book & Chat', d: 'Request a seat and chat instantly with the driver once they accept.' },
                { n: '03', t: 'Ride & Rate', d: 'Complete your trip and rate your partner to build campus trust.' }
              ].map((s, i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-4">
                  <span className="text-3xl font-black text-emerald-500/30 shrink-0">{s.n}</span>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">{s.t}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Frame Footer */}
          <footer className="pt-6 pb-2 border-t border-slate-200/60 dark:border-slate-800/60 text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <img src={logoImg} alt="Waygo Logo" className="w-6 h-6 object-contain rounded-lg" />
              <span className="text-sm font-black tracking-tighter">
                <span className="text-slate-900 dark:text-white">Way</span>
                <span className="text-emerald-500">go</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">&copy; {new Date().getFullYear()} Waygo VIT-AP. All rights reserved.</p>
            <div className="flex justify-center gap-6 pt-1">
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors">Privacy</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-500 transition-colors">Terms</a>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
};

export default Home;
