import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  DollarSign,
  Users,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';

export const AdminRides: React.FC = () => {
  const { toast } = useToast();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await adminService.getRides({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      if (res.status === 'success') {
        setRides(res.data.rides || []);
        setTotalPages(res.totalPages || 1);
        setTotalResults(res.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rides registry database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchRides();
  }, [page, searchQuery, statusFilter]);

  const handleCancelRide = async (rideId: string, source: string, dest: string) => {
    if (!window.confirm(`Are you sure you want to CANCEL and REMOVE the ride: ${source} to ${dest}? This action cannot be undone and will alert all booked passengers.`)) {
      return;
    }

    setActionLoading(rideId);
    try {
      const res = await adminService.cancelRide(rideId);
      if (res.status === 'success') {
        toast.success('Ride successfully cancelled and removed.');
        setRides((prev) => prev.filter((r) => r._id !== rideId));
      }
    } catch (err) {
      toast.error('Failed to cancel and delete ride.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-8 h-8 text-emerald-400" />
            Rides Database Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Oversee and moderate all published, active, completed, or cancelled rides
          </p>
        </div>
        <Button
          onClick={fetchRides}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-455 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/60 p-4 border border-slate-850 rounded-2xl">
        <div className="flex items-center w-full md:max-w-md bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 focus-within:border-emerald-750 transition-all">
          <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search by source, destination or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-200 outline-none w-full placeholder-slate-600"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wider shrink-0">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-emerald-750 w-full md:w-44 cursor-pointer"
          >
            <option value="">All Rides</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Database registers list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-555">Accessing database...</p>
        </div>
      ) : rides.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-850 font-bold">
          No ride records found matching the criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          {rides.map((ride) => (
            <Card key={ride._id} className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950/40 transition-all">
              <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-4 border-b border-slate-850 pb-3 mb-4">
                    <img
                      src={ride.driver?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ride.driver?.name || 'Driver')}`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-800"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-slate-200">{ride.driver?.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rating: {ride.driver?.rating?.toFixed(1) || '5.0'}★ • Driver Email: {ride.driver?.email}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          ride.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/20'
                            : ride.status === 'active'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-950/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-950/20'
                        }`}
                      >
                        {ride.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] text-slate-500 font-extrabold uppercase">Travel Path</p>
                        <p className="font-extrabold text-slate-200 mt-0.5 truncate">{ride.source} → {ride.destination}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] text-slate-500 font-extrabold uppercase">Departure Time</p>
                        <p className="font-bold text-slate-200 mt-0.5">
                          {new Date(ride.departureTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-450 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] text-slate-500 font-extrabold uppercase">Pricing</p>
                        <p className="font-bold text-slate-200 mt-0.5">₹{ride.price || 0} per seat</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[9px] text-slate-500 font-extrabold uppercase">Seats Booked</p>
                        <p className="font-bold text-slate-200 mt-0.5">
                          {ride.bookedSeats || 0} / {ride.seats || 1} seats filled
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-0 border-slate-850 pt-4 md:pt-0">
                  {ride.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-rose-500 border-rose-950 bg-rose-950/10 hover:bg-rose-900/20 font-bold uppercase tracking-wider py-2 h-auto cursor-pointer"
                      onClick={() => handleCancelRide(ride._id, ride.source, ride.destination)}
                      disabled={actionLoading === ride._id}
                      loading={actionLoading === ride._id}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Cancel Ride
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-850/80 pt-4 px-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Showing {rides.length} of {totalResults} ride offers
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="p-2 cursor-pointer bg-slate-900 border-slate-850 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-300" />
                </Button>
                <span className="text-xs text-slate-400 font-bold px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="p-2 cursor-pointer bg-slate-900 border-slate-850 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminRides;
