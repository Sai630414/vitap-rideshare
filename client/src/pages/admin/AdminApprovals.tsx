import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  Car,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';
import Dialog from '../../components/ui/Dialog';

import useSocket from '../../context/SocketContext';

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

export const AdminApprovals: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals status
  const [remarksDriverId, setRemarksDriverId] = useState<string | null>(null);
  const [remarksAction, setRemarksAction] = useState<'reject' | 'resubmit' | null>(null);
  const [remarksText, setRemarksText] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchPendingDrivers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getApprovals();
      if (res.status === 'success') {
        let driversData = res.data.drivers || [];
        if (searchQuery.trim()) {
          driversData = driversData.filter((d: any) =>
            d.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setDrivers(driversData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending driver requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingDrivers();
  }, [searchQuery]);

  // Real-time socket listener for admin approvals queue
  useEffect(() => {
    if (!socket) return;

    const handleAdminDriverUpdated = (updatedDriver: any) => {
      fetchPendingDrivers();
    };

    socket.on('admin_driver_updated', handleAdminDriverUpdated);

    return () => {
      socket.off('admin_driver_updated', handleAdminDriverUpdated);
    };
  }, [socket]);

  const handleApprove = async (driverId: string) => {
    if (!window.confirm('Are you sure you want to APPROVE this driver registration?')) return;
    try {
      const res = await adminService.approveDriver(driverId);
      if (res.status === 'success') {
        toast.success('Driver registration approved successfully!');
        setDrivers((prev) => prev.filter((d) => d._id !== driverId));
      }
    } catch (err) {
      toast.error('Failed to approve driver registration.');
    }
  };

  const openRemarksModal = (driverId: string, action: 'reject' | 'resubmit') => {
    setRemarksDriverId(driverId);
    setRemarksAction(action);
    setRemarksText('');
  };

  const handleRemarksSubmit = async () => {
    if (!remarksDriverId || !remarksAction || !remarksText.trim()) {
      toast.error('Please enter a remark or reason.');
      return;
    }

    setActionLoading(true);
    try {
      if (remarksAction === 'reject') {
        const res = await adminService.rejectDriver(remarksDriverId, remarksText);
        if (res.status === 'success') {
          toast.success('Driver application rejected.');
          setDrivers((prev) => prev.filter((d) => d._id !== remarksDriverId));
        }
      } else {
        const res = await adminService.requestResubmission(remarksDriverId, remarksText);
        if (res.status === 'success') {
          toast.success('Resubmission request sent to driver.');
          setDrivers((prev) => prev.filter((d) => d._id !== remarksDriverId));
        }
      }
      setRemarksDriverId(null);
      setRemarksAction(null);
    } catch (err) {
      toast.error('Failed to complete action.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Car className="w-8 h-8 text-emerald-400" />
            Driver Registration Queue
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-bold tracking-wide uppercase">
            Review and verify vehicle documents & driver details
          </p>
        </div>
        <Button
          onClick={fetchPendingDrivers}
          className="text-xs py-2 h-auto bg-slate-900 border border-slate-800 hover:border-emerald-950 text-emerald-450 font-bold uppercase tracking-wider rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-emerald-750 transition-all">
        <Search className="w-4 h-4 text-slate-500 mr-2 shrink-0" />
        <input
          type="text"
          placeholder="Search by driver name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-xs text-slate-200 outline-none w-full placeholder-slate-550"
        />
      </div>

      {/* Drivers List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-555">Loading queue...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-xs bg-slate-900/30 rounded-2xl border border-slate-850 font-bold">
          No pending driver verification requests found.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {drivers.map((drv) => (
            <Card key={drv._id} className="bg-slate-900/60 border-slate-800/80 hover:border-emerald-950/40 transition-all">
              <CardContent className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-4 border-b border-slate-850 pb-3 mb-4">
                    <img
                      src={formatImgUrl(drv.user?.profileImage) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(drv.user?.name || 'Driver')}`}
                      alt={drv.user?.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-800"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-slate-200">{drv.user?.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{drv.user?.email} • {drv.phone}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-slate-950 border border-slate-850 text-slate-400 px-2 py-0.5 rounded-full capitalize">
                        Status: {drv.approvalStatus}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Registered: {new Date(drv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Licence Number</p>
                      <p className="font-extrabold text-slate-200 mt-1 uppercase">{drv.licenceNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Vehicle RC Plate</p>
                      <p className="font-extrabold text-slate-200 mt-1 uppercase">{drv.vehicleRCNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Plate Number</p>
                      <p className="font-extrabold text-slate-200 mt-1 uppercase">{drv.vehicleNumber}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Model / Type</p>
                      <p className="font-bold text-slate-200 mt-1 capitalize">
                        {drv.vehicleModel} ({drv.vehicleColour}) • {drv.vehicleType}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-col xl:flex-row gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-0 border-slate-850 pt-4 lg:pt-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs bg-slate-950 border border-slate-850 hover:border-emerald-950 text-slate-300 font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
                    onClick={() => navigate(`/admin/drivers/${drv._id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Details
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-amber-500 border-amber-950 bg-amber-950/10 hover:bg-amber-900/20 font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
                    onClick={() => openRemarksModal(drv._id, 'resubmit')}
                  >
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    Resubmission
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-500 border-rose-950 bg-rose-950/10 hover:bg-rose-900/20 font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
                    onClick={() => openRemarksModal(drv._id, 'reject')}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>

                  <Button
                    size="sm"
                    className="text-xs bg-emerald-650 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
                    onClick={() => handleApprove(drv._id)}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remarks Modal for Rejection or Resubmission */}
      <Dialog
        isOpen={!!remarksDriverId}
        onClose={() => {
          setRemarksDriverId(null);
          setRemarksAction(null);
        }}
        title={remarksAction === 'reject' ? 'Rejection Reason' : 'Request Document Resubmission'}
        className="max-w-md bg-slate-900 border border-slate-800 text-slate-100 font-sans"
      >
        <div className="flex flex-col gap-4 p-2">
          <p className="text-xs text-slate-400">
            {remarksAction === 'reject'
              ? 'Please provide a clear reason for rejecting this driver application. An automated rejection notification containing your comments will be emailed to the user.'
              : 'Specify which document(s) need correction or higher quality scans. An instruction email will be sent to the driver.'}
          </p>

          <textarea
            value={remarksText}
            onChange={(e) => setRemarksText(e.target.value)}
            placeholder={remarksAction === 'reject' ? 'e.g. driving licence appears expired or fake...' : 'e.g. Front Driving Licence scan is blurry, please re-upload clear photos.'}
            className="w-full h-32 bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-650 resize-none placeholder-slate-600"
            required
          />

          <div className="flex gap-3 justify-end mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-slate-950 border border-slate-850 hover:bg-slate-800 font-bold uppercase tracking-wider cursor-pointer"
              onClick={() => {
                setRemarksDriverId(null);
                setRemarksAction(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${remarksAction === 'reject' ? 'bg-red-650 hover:bg-red-700' : 'bg-emerald-650 hover:bg-emerald-700'}`}
              onClick={handleRemarksSubmit}
              loading={actionLoading}
            >
              Submit Remarks
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminApprovals;
