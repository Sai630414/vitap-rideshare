import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
  Car,
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  User,
  ShieldAlert,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import adminService from '../../services/adminService';
import Dialog from '../../components/ui/Dialog';

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

export const AdminDriverDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Remarks modal states
  const [remarksOpen, setRemarksOpen] = useState<boolean>(false);
  const [remarksAction, setRemarksAction] = useState<'reject' | 'resubmit' | null>(null);
  const [remarksText, setRemarksText] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDriverDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await adminService.getDriverById(id);
      if (res.status === 'success') {
        setDriver(res.data.driver);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load driver details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDetails();
  }, [id]);

  const handleApprove = async () => {
    if (!driver) return;
    if (!window.confirm(`Are you sure you want to APPROVE ${driver.user.name}'s registration?`)) return;

    try {
      const res = await adminService.approveDriver(driver._id);
      if (res.status === 'success') {
        toast.success('Driver registration approved successfully!');
        fetchDriverDetails();
      }
    } catch (err) {
      toast.error('Failed to approve driver.');
    }
  };

  const openRemarksModal = (action: 'reject' | 'resubmit') => {
    setRemarksAction(action);
    setRemarksText('');
    setRemarksOpen(true);
  };

  const handleRemarksSubmit = async () => {
    if (!driver || !remarksAction || !remarksText.trim()) {
      toast.error('Please enter a remark or reason.');
      return;
    }

    setActionLoading(true);
    try {
      if (remarksAction === 'reject') {
        const res = await adminService.rejectDriver(driver._id, remarksText);
        if (res.status === 'success') {
          toast.success('Driver application rejected.');
          fetchDriverDetails();
        }
      } else {
        const res = await adminService.requestResubmission(driver._id, remarksText);
        if (res.status === 'success') {
          toast.success('Resubmission request sent to driver.');
          fetchDriverDetails();
        }
      }
      setRemarksOpen(false);
    } catch (err) {
      toast.error('Failed to update driver status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 animate-pulse">
          Retrieving profile...
        </p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-20 font-sans">
        <p className="text-sm text-slate-450 font-bold">Driver application details not found.</p>
        <Button onClick={() => navigate('/admin/drivers')} className="mt-4 text-xs font-bold uppercase cursor-pointer">
          Back to Registry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-slate-100 font-sans animate-fade-in">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-bold transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>

      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/60 p-6 border border-slate-850 rounded-3xl">
        <div className="flex items-center gap-4">
          <img
            src={formatImgUrl(driver.user?.profileImage) || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(driver.user?.name || '')}`}
            alt=""
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-950"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">{driver.user?.name}</h1>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  driver.approvalStatus === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-950/30'
                    : driver.approvalStatus === 'pending'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-950/30'
                    : driver.approvalStatus === 'resubmission'
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-950/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-950/30'
                }`}
              >
                {driver.approvalStatus}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">
                Registered Account: {driver.user?.role} • Status: <span className="capitalize">{driver.user?.status}</span>
              </p>
              {driver.licenceImage && (
                <span className="inline-flex items-center px-2 py-0.5 bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Verified by Driving Licence
                </span>
              )}
              {!driver.licenceImage && driver.collegeCardImage && (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-600/15 border border-blue-500/30 text-blue-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Verified by College ID Card
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls for Pending Approvals */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end border-t md:border-0 border-slate-850 pt-4 md:pt-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-amber-500 border-amber-950 bg-amber-950/10 hover:bg-amber-900/20 font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
            onClick={() => openRemarksModal('resubmit')}
            disabled={driver.approvalStatus === 'resubmission'}
          >
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Request Resubmission
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs text-rose-500 border-rose-950 bg-rose-950/10 hover:bg-rose-900/20 font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
            onClick={() => openRemarksModal('reject')}
            disabled={driver.approvalStatus === 'rejected'}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Reject Profile
          </Button>

          <Button
            size="sm"
            className="text-xs bg-emerald-650 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider py-2.5 h-auto cursor-pointer"
            onClick={handleApprove}
            disabled={driver.approvalStatus === 'approved'}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Approve & Verify
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal and Account details */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-slate-900/60 border-slate-800/80">
            <CardHeader className="border-b border-slate-850 pb-3">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-200">
                <User className="w-4 h-4 text-emerald-400" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4 text-xs">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">College Email</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{driver.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Phone Number</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{driver.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Emergency Contact</p>
                  <p className="font-semibold text-slate-200 mt-0.5">{driver.emergencyContact}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Driving Experience</p>
                  <p className="font-bold text-slate-200 mt-0.5">{driver.drivingExperience} Years</p>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-3 mt-1 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Email Verified:</span>
                  <span className={`text-[10px] font-black uppercase ${driver.user?.isVerified ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {driver.user?.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Student Status:</span>
                  <span className={`text-[10px] font-black uppercase ${driver.user?.verifiedStudent ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {driver.user?.verifiedStudent ? 'STUDENT VERIFIED' : 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase">Driver Status:</span>
                  <span className={`text-[10px] font-black uppercase ${driver.user?.verifiedDriver ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {driver.user?.verifiedDriver ? 'DRIVER VERIFIED' : 'UNVERIFIED'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin remarks card */}
          {(driver.rejectionReason || driver.approvalStatus !== 'approved') && (
            <Card className="bg-slate-900/60 border-slate-800/80">
              <CardHeader className="border-b border-slate-850 pb-3">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-200">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  Administrator Remarks
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs">
                {driver.rejectionReason ? (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Latest Notes / Reason</p>
                    <p className="text-slate-300 mt-1.5 leading-relaxed font-semibold">{driver.rejectionReason}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-center py-4">No active notes or rejection reason logged.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Vehicle specs and Scans */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Vehicle specs */}
          <Card className="bg-slate-900/60 border-slate-800/80">
            <CardHeader className="border-b border-slate-850 pb-3">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-200">
                <Car className="w-4 h-4 text-emerald-400" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Vehicle Type</p>
                <p className="font-extrabold text-slate-200 mt-1 capitalize text-sm">{driver.vehicleType}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Vehicle Model</p>
                <p className="font-extrabold text-slate-200 mt-1 text-sm">{driver.vehicleModel}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Color / Custom Details</p>
                <p className="font-extrabold text-slate-200 mt-1 capitalize text-sm">{driver.vehicleColour}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Registration Plate</p>
                <p className="font-black text-slate-200 mt-1 uppercase text-sm tracking-wider">{driver.vehicleNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Document Scans Grid */}
          <Card className="bg-slate-900/60 border-slate-800/80">
            <CardHeader className="border-b border-slate-850 pb-3">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-200">
                <FileText className="w-4 h-4 text-emerald-400" />
                Verification Document Scans
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Licence Image */}
              {driver.licenceImage && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase text-center">Driving Licence Scan</p>
                  <div className="relative group bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 aspect-video flex items-center justify-center">
                    <img src={formatImgUrl(driver.licenceImage)} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={() => setPreviewImage(formatImgUrl(driver.licenceImage))}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* College Card Image */}
              {driver.collegeCardImage && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase text-center">College ID Card Scan</p>
                  <div className="relative group bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 aspect-video flex items-center justify-center">
                    <img src={formatImgUrl(driver.collegeCardImage)} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <button
                        onClick={() => setPreviewImage(formatImgUrl(driver.collegeCardImage))}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vehicle Image */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase text-center">Vehicle Photo</p>
                <div className="relative group bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 aspect-video flex items-center justify-center">
                  <img src={formatImgUrl(driver.vehicleImage)} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <button
                      onClick={() => setPreviewImage(formatImgUrl(driver.vehicleImage))}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full cursor-pointer shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scans Zoom Overlay */}
      <Dialog
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Document Preview Viewer"
        className="max-w-2xl bg-slate-900 border border-slate-800 text-slate-100"
      >
        {previewImage && (
          <div className="flex flex-col items-center justify-center p-2">
            <img src={formatImgUrl(previewImage)} className="max-h-[70vh] rounded-xl object-contain border border-slate-800" alt="scan preview" />
            <a
              href={formatImgUrl(previewImage)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-350 hover:underline mt-4 block"
            >
              Open Scan Image in New Tab
            </a>
          </div>
        )}
      </Dialog>

      {/* Remarks Dialog Modal */}
      <Dialog
        isOpen={remarksOpen}
        onClose={() => setRemarksOpen(false)}
        title={remarksAction === 'reject' ? 'Rejection Reason' : 'Request Resubmission'}
        className="max-w-md bg-slate-900 border border-slate-800 text-slate-100"
      >
        <div className="flex flex-col gap-4 p-2 text-xs">
          <p className="text-slate-400 leading-relaxed">
            {remarksAction === 'reject'
              ? 'Please define the reasons for rejecting this driver application request. This information will be sent immediately to the user.'
              : 'Inform the driver about the documents that require re-uploading and specify any other corrections.'}
          </p>

          <textarea
            value={remarksText}
            onChange={(e) => setRemarksText(e.target.value)}
            placeholder={remarksAction === 'reject' ? 'e.g. driving licence appears expired or fake...' : 'e.g. Front Driving Licence scan is blurry, please re-upload clear photos.'}
            className="w-full h-32 bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-650 resize-none placeholder-slate-650"
            required
          />

          <div className="flex gap-3 justify-end mt-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-slate-950 border border-slate-850 hover:bg-slate-800 font-bold uppercase tracking-wider cursor-pointer"
              onClick={() => setRemarksOpen(false)}
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

export default AdminDriverDetails;
