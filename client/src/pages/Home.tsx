import React from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Shield,
  AlertTriangle,
  ChevronRight,
  Compass,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const Home: React.FC = () => {
  const { user, logout } = useAuth();

  const faqs = [
    {
      q: 'Who can register?',
      a: 'Only VIT-AP members with @vitapstudent.ac.in or @vitap.ac.in emails.',
    },
    {
      q: 'Is it free?',
      a: 'Prices are set by drivers to split fuel costs. We take zero commission.',
    },
    {
      q: 'Is it safe?',
      a: 'All drivers are manually verified. Real-time GPS tracking and SOS alerts are active.',
    },
  ];

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased">

      {/* ================= NAVBAR ================= */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8 pt-5">
          <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/50 shadow-xl">

            <Link to="/" className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Compass className="text-white w-6 h-6" />
              </div>

              <div>
                <span className="text-2xl font-black tracking-tight">
                  Waygo
                </span>
                <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
                  VIT-AP Rideshare
                </span>
              </div>
            </Link>

            {!user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-bold px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  Login
                </Link>

                <Link to="/login">
                  <Button
                    size="sm"
                    className="px-6 rounded-xl shadow-lg shadow-primary/20"
                  >
                    Join Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/10 rounded-xl transition-all"
                >
                  <img
                    src={
                      user.profileImage ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`
                    }
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-primary/20 object-cover"
                  />

                  <span className="text-sm font-black hidden md:block">
                    {user.name.split(' ')[0]}
                  </span>
                </Link>

                <Link to="/dashboard">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                  >
                    Dashboard
                  </Button>
                </Link>

                <button
                  onClick={logout}
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-destructive"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* ================= HERO ================= */}
      <main className="flex-1">

        <section className="relative min-h-[760px] flex items-center overflow-hidden">

          {/* VIT-AP BACKGROUND IMAGE */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/vitap-campus.jpg')",
            }}
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/55" />

          {/* Green gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-primary/20" />

          {/* Hero content */}
          <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-8 pt-28 pb-24">

            <div className="max-w-3xl">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                <Shield className="w-4 h-4 text-green-400" />
                VIT-AP Campus Network
              </div>

              {/* Heading */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white">
                Your Campus.
                <br />

                <span className="text-primary">
                  Your Ride.
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-white/80 max-w-2xl mt-8 font-medium leading-relaxed">
                The official ride-sharing hub for VITians.
                Connect with verified drivers, share costs,
                and travel safely across campus.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-10">

                <Link
                  to="/login"
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-5 rounded-2xl text-lg shadow-2xl shadow-primary/30"
                  >
                    Find a Ride
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-5 rounded-2xl text-lg bg-white/95 hover:bg-white"
                  >
                    Offer a Ride
                  </Button>
                </Link>

              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 mt-10 text-white/80 text-sm font-semibold">

                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  Verified Students
                </div>

                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-green-400" />
                  Cost Sharing
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-green-400" />
                  Safety First
                </div>

              </div>

            </div>
          </div>

          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

        </section>


        {/* ================= FEATURES ================= */}
        <section className="py-24 px-6 md:px-8 bg-background">

          <div className="max-w-7xl mx-auto">

            <div className="text-center mb-16">

              <span className="text-primary text-xs font-black uppercase tracking-[0.25em]">
                Why Waygo
              </span>

              <h2 className="text-4xl md:text-5xl font-black mt-3">
                Travel smarter. Travel together.
              </h2>

              <p className="text-muted-foreground max-w-2xl mx-auto mt-5">
                A safer and easier way for VIT-AP students to share rides
                and reduce travel costs.
              </p>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {[
                {
                  icon: Shield,
                  title: 'Verified Only',
                  desc: 'Strict VIT-AP authentication keeps the community trusted and secure.',
                },
                {
                  icon: Car,
                  title: 'Cost Sharing',
                  desc: 'Split fuel costs with fellow students without platform commissions.',
                },
                {
                  icon: AlertTriangle,
                  title: 'Safety First',
                  desc: 'Built-in safety features help students travel with confidence.',
                },
              ].map((f, i) => (

                <div
                  key={i}
                  className="group p-8 md:p-10 rounded-3xl bg-white border border-border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                >

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-7 group-hover:bg-primary group-hover:text-white transition-all">
                    <f.icon className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl font-black mb-3">
                    {f.title}
                  </h3>

                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {f.desc}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>


        {/* ================= HOW IT WORKS ================= */}
        <section className="py-24 px-6 md:px-8 bg-white">

          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-16">

              <span className="text-primary text-xs font-black uppercase tracking-[0.25em]">
                Simple Process
              </span>

              <h2 className="text-4xl md:text-5xl font-black mt-3">
                How it works
              </h2>

            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {[
                {
                  n: '01',
                  t: 'Search or Post',
                  d: 'Find rides matching your schedule or list your own route if you are driving.',
                },
                {
                  n: '02',
                  t: 'Book & Chat',
                  d: 'Request a seat and chat instantly with the driver once they accept.',
                },
                {
                  n: '03',
                  t: 'Ride & Rate',
                  d: 'Complete your trip and rate your partner to build campus trust.',
                },
              ].map((s, i) => (

                <div
                  key={i}
                  className="relative p-8 rounded-3xl border border-border bg-background hover:border-primary/40 transition-all"
                >

                  <span className="text-7xl font-black text-primary/10">
                    {s.n}
                  </span>

                  <h4 className="text-2xl font-black mt-3 mb-3">
                    {s.t}
                  </h4>

                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {s.d}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

      </main>


      {/* ================= FOOTER ================= */}
      <footer className="bg-foreground text-white py-16 px-6 md:px-8">

        <div className="max-w-7xl mx-auto">

          <div className="flex flex-col md:flex-row justify-between items-center gap-8">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center">
                <Compass className="text-white w-6 h-6" />
              </div>

              <div>
                <span className="text-2xl font-black tracking-tight">
                  Waygo
                </span>

                <p className="text-white/40 text-xs mt-1">
                  VIT-AP Campus Rideshare
                </p>
              </div>

            </div>


            <p className="text-white/40 text-sm font-medium">
              &copy; {new Date().getFullYear()} Waygo VIT-AP. All rights reserved.
            </p>


            <div className="flex gap-6">

              <a
                href="#"
                className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors"
              >
                Privacy
              </a>

              <a
                href="#"
                className="text-xs font-black uppercase tracking-widest text-white/50 hover:text-primary transition-colors"
              >
                Terms
              </a>

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
};

export default Home;