import React from 'react';
import { Link } from 'react-router-dom';
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
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Compass className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Waygo</span>
          </Link>

          {!user ? (
            <div className="flex items-center gap-6">
              <Link to="/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Login</Link>
              <Link to="/login"><Button size="sm" className="px-6 rounded-xl">Join Now</Button></Link>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2 hover:bg-muted/5 rounded-2xl transition-all">
                <img src={user.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="" className="h-9 w-9 rounded-full border-2 border-primary/20 object-cover" />
                <span className="text-sm font-black hidden md:block">{user.name.split(' ')[0]}</span>
              </Link>
              <Link to="/dashboard"><Button size="sm" variant="outline" className="rounded-xl">Dashboard</Button></Link>
              <button onClick={logout} className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-destructive">Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-24 pb-32 px-8 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
          <div className="max-w-5xl mx-auto text-center">
             <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
               <Shield className="w-3.5 h-3.5" />
               VIT-AP Campus Network
             </div>
             <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-[1.1] md:leading-[1.05] animate-in fade-in slide-in-from-bottom-8 duration-700">
               Campus Travel, <br />
               <span className="text-primary">Redefined.</span>
             </h1>
             <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-10 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-1000">
               The official ride-sharing hub for VITians. Connect with verified drivers, share costs, and commute safely across campus.
             </p>
             <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
               <Link to="/login" className="w-full sm:w-auto"><Button size="lg" className="w-full px-12 py-5 rounded-2xl text-lg shadow-2xl shadow-primary/30">Find a Ride <ChevronRight className="ml-2 w-5 h-5" /></Button></Link>
               <Link to="/login" className="w-full sm:w-auto"><Button variant="outline" size="lg" className="w-full px-12 py-5 rounded-2xl text-lg bg-white">Offer a Ride</Button></Link>
             </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-32 px-8 bg-white border-y border-border">
          <div className="max-w-7xl mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                {[
                  { icon: Shield, title: 'Verified Only', desc: 'Strict @vitapstudent.ac.in authentication for total safety.', color: 'text-primary', bg: 'bg-primary/5' },
                  { icon: Car, title: 'Cost Sharing', desc: 'Split fuel costs with fellow students. Zero platform fees.', color: 'text-secondary', bg: 'bg-secondary/5' },
                  { icon: AlertTriangle, title: 'Safety First', desc: 'Real-time GPS tracking and instant SOS alert system.', color: 'text-destructive', bg: 'bg-destructive/5' },
                ].map((f, i) => (
                  <div key={i} className="flex flex-col items-center group">
                    <div className={`w-20 h-20 ${f.bg} ${f.color} rounded-[2rem] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500`}>
                       <f.icon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black mb-4">{f.title}</h3>
                    <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-32 px-8">
           <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl font-black text-center mb-20">How it works</h2>
              <div className="space-y-12">
                 {[
                   { n: '01', t: 'Search or Post', d: 'Find rides matching your schedule or list your own route if you are driving.' },
                   { n: '02', t: 'Book & Chat', d: 'Request a seat and chat instantly with the driver once they accept.' },
                   { n: '03', t: 'Ride & Rate', d: 'Complete your trip and rate your partner to build campus trust.' }
                 ].map((s, i) => (
                   <div key={i} className="flex items-start gap-10 p-10 bg-white rounded-[3rem] shadow-soft border border-border">
                      <span className="text-6xl font-black text-primary/10">{s.n}</span>
                      <div>
                         <h4 className="text-2xl font-black mb-3">{s.t}</h4>
                         <p className="text-muted-foreground font-medium text-lg">{s.d}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      </main>

      <footer className="bg-foreground text-white py-20 px-8">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl">
                  <Compass className="text-white w-7 h-7" />
               </div>
               <span className="text-3xl font-black tracking-tighter">Waygo</span>
            </div>
            <p className="text-white/40 text-sm font-medium">&copy; {new Date().getFullYear()} Waygo VIT-AP. All rights reserved.</p>
            <div className="flex gap-8">
               <a href="#" className="text-sm font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors">Privacy</a>
               <a href="#" className="text-sm font-black uppercase tracking-widest text-white/60 hover:text-primary transition-colors">Terms</a>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default Home;
