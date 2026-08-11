import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  Car,
  Search,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';

const formatImgUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('.r2.cloudflarestorage.com/') && !url.includes('.r2.cloudflarestorage.com/vit-rideshare/')) {
      return url.replace('.r2.cloudflarestorage.com/', '.r2.cloudflarestorage.com/vit-rideshare/');
    }
    return url;
  }
  const backendUrl = (import.meta.env.VITE_API_URL || 'https://vitap-rideshare.onrender.com').replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendUrl}${cleanPath}`;
};

export const AdminDrivers: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getDrivers({
        approvalStatus: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      if (res.status === 'success') {
        setDrivers(res.data.drivers || []);
        setTotalPages(res.totalPages || 1);
        setTotalResults(res.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load drivers register database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset page on filter changes
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [page, searchQuery, statusFilter]);

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Car className="w-8 h-8 text-emerald-400" />
            Drivers Registry Database
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Browse and manage all registered drivers in the system
          </p>
        </div>
        <Button
          onClick={fetchDrivers}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-450 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
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
            placeholder="Search by name, email..."
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
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="resubmission">Resubmission</option>
          </select>
        </div>
      </div>

      {/* Table Database */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-555">Accessing database...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-850 font-bold animate-fade-in">
          No driver records found matching the criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="p-4 pl-6">Driver Profile</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Vehicle Details</th>
                  <th className="p-4">Documents</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {drivers.map((drv) => (
                  <tr key={drv._id} className="hover:bg-slate-900/25 transition-all">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={formatImgUrl(drv.user?.profileImage) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(drv.user?.name || 'Driver')}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-800"
                        />
                        <div>
                          <p className="font-extrabold text-slate-200">{drv.user?.name || 'N/A'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Role: {drv.user?.role || 'student'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 font-semibold">{drv.user?.email}</p>
                      <p className="text-slate-500 mt-0.5">{drv.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-200 font-bold uppercase">{drv.vehicleNumber}</p>
                      <p className="text-slate-450 mt-0.5 capitalize">{drv.vehicleModel} • {drv.vehicleType}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 font-medium">Licence: <span className="uppercase font-semibold">{drv.licenceNumber}</span></p>
                      <p className="text-slate-500 mt-0.5 font-medium">RC Plate: <span className="uppercase">{drv.vehicleRCNumber}</span></p>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          drv.approvalStatus === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/30'
                            : drv.approvalStatus === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-950/30'
                            : drv.approvalStatus === 'resubmission'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-950/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-950/30'
                        }`}
                      >
                        {drv.approvalStatus}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-[10px] bg-slate-950 border border-slate-850 hover:border-emerald-950 text-emerald-400 font-bold py-1.5 h-auto cursor-pointer"
                        onClick={() => navigate(`/admin/drivers/${drv._id}`)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-850/80 pt-4 px-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Showing {drivers.length} of {totalResults} driver accounts
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

export default AdminDrivers;
