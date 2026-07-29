import React from 'react';
import { Link } from 'react-router-dom';
import {
  Car,
  Shield,
  Zap,
  MessageSquare,
  AlertTriangle,
  MapPin,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Users,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from "../context/AuthContext";



export const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const faqs = [
    {
      q: 'Who can register on VIT RideShare?',
      a: 'Only students, staff, and faculty members of VIT-AP with an active @vitapstudent.ac.in or @vitap.ac.in email address can sign up. All other domains are strictly rejected.',
    },
    {
      q: 'How does driver verification work?',
      a: 'To offer rides, users must upload their government-issued driving licence and their vehicle Registration Certificate (RC). Administrators review these documents and verify driver accounts.',
    },
    {
      q: 'Is this ride-sharing service free?',
      a: 'Pricing is set by the drivers to split fuel costs. The platform does not take commissions. Passengers pay the driver directly at completion of the trip.',
    },
    {
      q: 'What is the Emergency SOS button?',
      a: 'The SOS button allows passengers or drivers to broadcast an immediate emergency alert. It shares their device coordinates with all site administrators in real-time.',
    },
  ];

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col font-sans">
      {/* Navbar */}
     <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            VIT RideShare
          </span>
        </Link>

        {/* Right Section */}
        {!user ? (
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-semibold text-zinc-450 hover:text-white transition-all mr-2">
              Admin Login
            </Link>
            <Link to="/login" className="text-sm font-semibold text-zinc-450 hover:text-white transition-all mr-2">
              Login
            </Link>
            <Link to="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-sm font-semibold text-zinc-455 hover:text-white transition-all mr-2">
              Admin Login
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-zinc-900"
            >
              <img
                src={
                  user.profileImage ||
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(user.name)
                }
                alt={user.name}
                className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
              />

              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold text-white">
                  {user.name}
                </p>

                <p className="text-xs capitalize text-zinc-400">
                  {user.role}
                </p>
              </div>
            </Link>

            <Link to="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden text-center max-w-5xl mx-auto">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-3xl -z-10 animate-pulse"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full text-xs font-semibold mb-6">
          <Shield className="w-3.5 h-3.5 animate-pulse" />
          Exclusively for VIT-AP Campus
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight md:leading-none">
          Campus Travel, <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            Redefined & Secured.
          </span>
        </h1>
        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto mt-6 leading-relaxed">
          The official ride-sharing hub for VIT-AP students. Connect with verified drivers, share fuel costs, chat in real-time, and commute safely.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link to="/login">
            <Button size="lg" className="w-full sm:w-auto">
              Find a Ride
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Offer a Ride
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust badging showcase */}
      <section className="border-t border-zinc-900 bg-zinc-950/40 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-around gap-8 text-center md:text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">100% Verified Users</p>
              <p className="text-xs text-zinc-500 mt-0.5">Strict @vitapstudent.ac.in logins</p>
            </div>
          </div>
          <div className="h-px w-16 bg-zinc-900 md:h-12 md:w-px"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 text-violet-400 rounded-2xl border border-violet-500/20">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Verified RC & License</p>
              <p className="text-xs text-zinc-500 mt-0.5">Admins approve vehicle documents</p>
            </div>
          </div>
          <div className="h-px w-16 bg-zinc-900 md:h-12 md:w-px"></div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-bold">SOS Safety Alerts</p>
              <p className="text-xs text-zinc-500 mt-0.5">Instant GPS sharing with admins</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 border-t border-zinc-900 bg-zinc-900/10">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">How It Works</h2>
          <p className="text-zinc-400 text-sm mt-3 max-w-md mx-auto">Get from campus to your destination in three simple steps</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
              <div className="text-lg font-black text-violet-400 mb-4">01</div>
              <h3 className="font-bold text-lg">Search or Offer</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Students search for rides matching their schedule. Verified drivers list their route details, available seats, and split costs.
              </p>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
              <div className="text-lg font-black text-fuchsia-400 mb-4">02</div>
              <h3 className="font-bold text-lg">Book & Chat</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Passengers book a seat request. Once approved by the driver, they unlock a real-time secure chat to align on specific pickup spots.
              </p>
            </div>
            <div className="p-6 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
              <div className="text-lg font-black text-indigo-400 mb-4">03</div>
              <h3 className="font-bold text-lg">Travel & Rate</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Start the ride in the app. Once completed, passengers rate drivers to build their public Trust Score.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 border-t border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight">Features Packed for Safety</h2>
            <p className="text-zinc-400 text-sm mt-3">Advanced capabilities built specifically for university rides</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-zinc-900/20 border border-zinc-850 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-violet-650/10 text-violet-400 rounded-xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Interactive Map Routes</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Powered by Leaflet and OpenStreetMap. View pickup, drop, and estimated route overlay paths in real-time.
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/20 border border-zinc-850 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-fuchsia-650/10 text-fuchsia-400 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Real-time Messaging</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Socket.io chat with typing indicators, message seen stamps, and instant image/file sharing support.
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/20 border border-zinc-850 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-emerald-650/10 text-emerald-400 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Trust Score Metrics</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Calculated automatically based on user ratings, reporting history, and successful completed rides.
                </p>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/20 border border-zinc-850 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-red-650/10 text-red-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Emergency SOS Controls</h4>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Trigger an immediate safety alert containing your GPS coordinates to get administrator support instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 border-t border-zinc-900 bg-zinc-900/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-zinc-400 text-sm mt-3">Everything you need to know about the platform</p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
                <h4 className="font-bold text-sm text-zinc-200 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-xs text-zinc-400 mt-2 ml-8 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 bg-zinc-950 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} VIT RideShare. Built exclusively for VIT-AP Campus. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
