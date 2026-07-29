import React, { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Car,
  AlertTriangle,
  CircleDollarSign,
  CheckCircle,
  TrendingUp,
  Shield,
  Calendar,
  Layers,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService, { type AdminStats, type AdminChartData } from '../../services/adminService';

export const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<AdminChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getDashboardStats();
      if (res.status === 'success') {
        setStats(res.data.stats);
        setCharts(res.data.charts);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analytical statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 animate-pulse">
          Computing analytics...
        </p>
      </div>
    );
  }

  // Render SVG Chart for Daily Registrations
  const renderLineChart = (data: { _id: string; count: number }[] = [], strokeColor = '#34d399') => {
    if (data.length === 0) {
      return <div className="text-xs text-slate-500 text-center py-10 font-bold">No trend data available</div>;
    }
    const maxVal = Math.max(...data.map(d => d.count), 5);
    const height = 140;
    const width = 400;
    const padding = 20;

    const points = data
      .map((d, index) => {
        const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
        const y = height - padding - (d.count / maxVal) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" />

        {/* Path line */}
        <polyline fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />

        {/* Dots */}
        {data.map((d, index) => {
          const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
          const y = height - padding - (d.count / maxVal) * (height - padding * 2);
          return (
            <g key={index} className="group">
              <circle cx={x} cy={y} r="4" fill="#0f172a" stroke={strokeColor} strokeWidth="2.5" />
              <title>{`${d._id}: ${d.count} registrations`}</title>
            </g>
          );
        })}

        {/* X labels */}
        <text x={padding} y={height - 4} fill="#94a3b8" fontSize="8" fontWeight="bold">
          {data[0]?._id ? new Date(data[0]._id).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
        </text>
        <text x={width - padding} y={height - 4} fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="end">
          {data[data.length - 1]?._id ? new Date(data[data.length - 1]._id).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
        </text>
      </svg>
    );
  };

  // Render SVG Bar Chart for Ride Growth
  const renderBarChart = (data: { _id: string; count: number }[] = [], barColor = '#06b6d4') => {
    if (data.length === 0) {
      return <div className="text-xs text-slate-500 text-center py-10 font-bold">No ride data available</div>;
    }
    const maxVal = Math.max(...data.map(d => d.count), 5);
    const height = 140;
    const width = 400;
    const padding = 20;

    const barWidth = ((width - padding * 2) / data.length) * 0.7;
    const gap = ((width - padding * 2) / data.length) * 0.3;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3,3" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3,3" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#475569" />

        {/* Bars */}
        {data.map((d, index) => {
          const x = padding + index * (barWidth + gap) + gap / 2;
          const barHeight = (d.count / maxVal) * (height - padding * 2);
          const y = height - padding - barHeight;

          return (
            <g key={index}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={barColor} rx="3" className="transition-all hover:opacity-85" />
              <text x={x + barWidth / 2} y={y - 4} fill="#cbd5e1" fontSize="7" fontWeight="bold" textAnchor="middle">
                {d.count}
              </text>
              <title>{`${d._id}: ${d.count} rides`}</title>
            </g>
          );
        })}

        {/* X labels */}
        <text x={padding} y={height - 4} fill="#94a3b8" fontSize="8" fontWeight="bold">
          {data[0]?._id ? new Date(data[0]._id).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
        </text>
        <text x={width - padding} y={height - 4} fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="end">
          {data[data.length - 1]?._id ? new Date(data[data.length - 1]._id).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
        </text>
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-8 font-sans animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Shield className="w-8 h-8 text-emerald-400" />
            Analytics Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Platform operations monitoring dashboard
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-400 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
        >
          Refresh Data
        </Button>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950 transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
              <p className="text-3xl font-black mt-1 text-slate-100">{stats?.totalStudents || 0}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950 transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved Drivers</p>
              <p className="text-3xl font-black mt-1 text-teal-400">{stats?.approvedDrivers || 0}</p>
            </div>
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-2xl">
              <Car className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950 transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
              <p className="text-3xl font-black mt-1 text-amber-400">{stats?.pendingApprovals || 0}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950 transition-all">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Managed</p>
              <p className="text-3xl font-black mt-1 text-emerald-400">₹{stats?.revenue || 0}</p>
            </div>
            <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl">
              <CircleDollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trips Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-slate-900/40 border-slate-800/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
            <div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Today's Rides Hosted</p>
              <p className="text-lg font-black text-slate-200 mt-0.5">{stats?.todayTrips || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
            <div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Completed Trips</p>
              <p className="text-lg font-black text-slate-200 mt-0.5">{stats?.completedTrips || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/60">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full"></div>
            <div>
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Cancelled Trips</p>
              <p className="text-lg font-black text-slate-200 mt-0.5">{stats?.cancelledTrips || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytical Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Registrations */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardHeader className="border-b border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Daily Registrations (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderLineChart(charts?.dailyRegistrations, '#34d399')}
          </CardContent>
        </Card>

        {/* Ride Growth */}
        <Card className="bg-slate-900/60 border-slate-800/80">
          <CardHeader className="border-b border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Calendar className="w-4 h-4 text-teal-400" />
              Daily Ride Volume (7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderBarChart(charts?.rideGrowth, '#0ea5e9')}
          </CardContent>
        </Card>

        {/* Approval Trends */}
        <Card className="bg-slate-900/60 border-slate-800/80 lg:col-span-2">
          <CardHeader className="border-b border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-200">
              <Layers className="w-4 h-4 text-amber-400" />
              Driver Registration Document Statuses Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-around gap-6">
            {charts?.approvalTrends && charts.approvalTrends.length > 0 ? (
              charts.approvalTrends.map((trend, i) => (
                <div key={i} className="text-center p-4 bg-slate-950/40 border border-slate-850 rounded-2xl min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trend._id || 'Unspecified'}</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-2">{trend.count}</p>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 py-6 font-bold">No driver status breakdown details available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
