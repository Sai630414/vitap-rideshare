import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  AlertTriangle,
  RefreshCw,
  Ban,
  CheckCircle,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import adminService from '../../services/adminService';

interface ReportData {
  _id: string;
  reporter: { _id: string; name: string; email: string; role: string };
  reportedUser: { _id: string; name: string; email: string; role: string; status: 'active' | 'banned' };
  reason: string;
  description?: string;
  status: string;
  createdAt: string;
}

export const AdminReports: React.FC = () => {
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReports();
      if (res.status === 'success') {
        setReports(res.data.reports || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load violation reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleBanUser = async (userId: string, currentStatus: 'active' | 'banned', userName: string) => {
    const targetStatus = currentStatus === 'active' ? 'banned' : 'active';
    const actionText = targetStatus === 'banned' ? 'SUSPEND / BAN' : 'ACTIVATE / UNBAN';

    if (!window.confirm(`Are you sure you want to ${actionText} user account: ${userName}?`)) {
      return;
    }

    setActionLoading(userId);
    try {
      const res = await adminService.toggleStudentStatus(userId, targetStatus);
      if (res.status === 'success') {
        toast.success(`User status successfully updated to ${targetStatus === 'banned' ? 'suspended' : 'active'}.`);
        fetchReports(); // Refresh lists
      }
    } catch (err) {
      toast.error('Failed to update reported user status.');
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
            <AlertTriangle className="w-8 h-8 text-emerald-450" />
            Violations & Moderation Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Review reported users, examine descriptions, and execute bans
          </p>
        </div>
        <Button
          onClick={fetchReports}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-450 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Database registers list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-555">Accessing database...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-850 font-bold">
          No active incident reports filed in the system.
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          {reports.map((rep) => (
            <Card key={rep._id} className="bg-slate-900/60 border-slate-800/80 border-l-rose-500/50 border-l-4">
              <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-4 border-b border-slate-850 pb-2 mb-3">
                    <span className="text-[10px] font-bold text-slate-500">
                      Report ID: {rep._id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Submitted: {new Date(rep.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs">
                    <p className="text-slate-400">
                      Reporter:{' '}
                      <span className="font-bold text-slate-200">
                        {rep.reporter?.name || 'Unknown'} ({rep.reporter?.role || 'user'})
                      </span>
                      <span className="text-slate-500 ml-2">({rep.reporter?.email})</span>
                    </p>
                    <p className="text-slate-400">
                      Reported Suspect:{' '}
                      <span className="font-black text-rose-450">
                        {rep.reportedUser?.name || 'Unknown'} ({rep.reportedUser?.role || 'user'})
                      </span>
                      <span className="text-slate-500 ml-2">({rep.reportedUser?.email})</span>
                      <span className="ml-3 inline-flex">
                        {rep.reportedUser?.status === 'banned' ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </span>
                    </p>
                  </div>

                  <div className="mt-3.5 bg-slate-950 p-4 rounded-xl border border-slate-850/80 text-xs">
                    <p className="font-extrabold text-slate-300">Category: {rep.reason}</p>
                    {rep.description && <p className="text-slate-400 mt-1.5 leading-relaxed font-semibold">{rep.description}</p>}
                  </div>
                </div>

                {rep.reportedUser && (
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-4 md:pt-0">
                    <Button
                      variant={rep.reportedUser.status === 'banned' ? 'secondary' : 'destructive'}
                      size="sm"
                      className="text-xs py-2 h-auto flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                      onClick={() => handleBanUser(rep.reportedUser._id, rep.reportedUser.status, rep.reportedUser.name)}
                      disabled={actionLoading === rep.reportedUser._id}
                      loading={actionLoading === rep.reportedUser._id}
                    >
                      {rep.reportedUser.status === 'banned' ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5" />
                          Ban User
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
