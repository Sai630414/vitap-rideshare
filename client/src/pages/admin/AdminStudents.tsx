import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  RefreshCw,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';

export const AdminStudents: React.FC = () => {
  const { toast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await adminService.getStudents({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit: 10,
      });
      if (res.status === 'success') {
        setStudents(res.data.students || []);
        setTotalPages(res.totalPages || 1);
        setTotalResults(res.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load students register database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [page, searchQuery, statusFilter]);

  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'banned', userName: string) => {
    const targetStatus = currentStatus === 'active' ? 'banned' : 'active';
    const actionText = targetStatus === 'banned' ? 'SUSPEND' : 'ACTIVATE';
    
    if (!window.confirm(`Are you sure you want to ${actionText} student account for: ${userName}?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await adminService.toggleStudentStatus(userId, targetStatus);
      if (res.status === 'success') {
        toast.success(`User account successfully ${targetStatus === 'banned' ? 'suspended' : 'activated'}.`);
        // Refresh local items
        setStudents((prev) =>
          prev.map((s) => (s._id === userId ? { ...s, status: targetStatus } : s))
        );
      }
    } catch (err) {
      toast.error('Failed to moderate student status.');
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
            <Users className="w-8 h-8 text-emerald-400" />
            Students Register Database
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            View student profiles, manage account status, and moderate suspensions
          </p>
        </div>
        <Button
          onClick={fetchStudents}
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
            placeholder="Search by name, email or roll number..."
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
            <option value="">All Accounts</option>
            <option value="active">Active</option>
            <option value="banned">Suspended</option>
          </select>
        </div>
      </div>

      {/* Database register view */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-555">Accessing database...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-850 font-bold">
          No student records found matching the criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="overflow-x-auto bg-slate-900/40 border border-slate-850 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="p-4 pl-6">Student Details</th>
                  <th className="p-4">Academic Details</th>
                  <th className="p-4 text-center">Trust Metrics</th>
                  <th className="p-4">Verification Status</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 pr-6 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60">
                {students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-900/25 transition-all">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.name || 'Student')}`}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-800"
                        />
                        <div>
                          <p className="font-extrabold text-slate-200">{student.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {student.branch || student.year ? (
                        <>
                          <p className="text-slate-300 font-bold uppercase">{student.branch || 'General'}</p>
                          <p className="text-slate-500 mt-0.5 font-semibold">Year {student.year || 'N/A'}</p>
                        </>
                      ) : (
                        <p className="text-slate-550 italic">Academic Info Pending</p>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold text-emerald-400 text-sm">{student.trustScore || 100}</span>
                        <span className="text-[9px] text-slate-500 uppercase font-black mt-0.5">Trips: {student.totalTrips || 0}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center justify-center w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${student.verifiedStudent ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-550'}`}>
                          Student Card: {student.verifiedStudent ? 'VERIFIED' : 'PENDING'}
                        </span>
                        {student.role === 'driver' && (
                          <span className="inline-flex items-center justify-center w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-500/10 text-teal-400">
                            Driver Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          student.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-950/30'
                        }`}
                      >
                        {student.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-[10px] font-bold uppercase tracking-wider py-1.5 h-auto cursor-pointer ${
                          student.status === 'active'
                            ? 'text-rose-500 border-rose-950 bg-rose-950/10 hover:bg-rose-900/20'
                            : 'text-emerald-500 border-emerald-950 bg-emerald-950/10 hover:bg-emerald-900/20'
                        }`}
                        onClick={() => handleToggleStatus(student._id, student.status, student.name)}
                        disabled={actionLoading === student._id}
                        loading={actionLoading === student._id}
                      >
                        {student.status === 'active' ? (
                          <>
                            <Ban className="w-3 h-3 mr-1" />
                            Suspend Student
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Activate Account
                          </>
                        )}
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
                Showing {students.length} of {totalResults} student accounts
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

export default AdminStudents;
