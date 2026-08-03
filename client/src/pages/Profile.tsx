import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  CreditCard,
  Car,
  Plus,
  Trash2,
  FileText,
  Upload,
  Calendar,
  ShieldCheck,
  Star,
  Zap,
  ChevronRight,
  Smartphone,
  BookOpen,
  LogOut,
} from 'lucide-react';
import vehicleService, { type VehicleData } from '../services/vehicleService';
import licenceService, { type LicenceData } from '../services/licenceService';

export const Profile: React.FC = () => {
  const { user, updateProfile, uploadAvatar, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'licence' | 'vehicles'>('profile');

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [regNum, setRegNum] = useState(user?.registrationNumber || '');
  const [year, setYear] = useState<number>(user?.year || 1);
  const [branch, setBranch] = useState(user?.branch || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [licence, setLicence] = useState<LicenceData | null>(null);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [licenceLoading, setLicenceLoading] = useState(false);

  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const [vType, setVType] = useState<'bike' | 'car'>('car');
  const [vBrand, setVBrand] = useState('');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vColor, setVColor] = useState('');
  const [vSeats, setVSeats] = useState<number>(4);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [vehicleSubmitLoading, setVehicleSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchLicenceAndVehicles = async () => {
      if (!user) return;
      try {
        const licRes = await licenceService.getMyLicence();
        if (licRes.status === 'success') {
          setLicence(licRes.data.licence);
          if (licRes.data.licence) {
            setLicenceNumber(licRes.data.licence.licenceNumber);
            setLicenceExpiry(new Date(licRes.data.licence.expiry).toISOString().split('T')[0]);
          }
        }
      } catch (err) {
        console.error(err);
      }

      try {
        const vehRes = await vehicleService.getMyVehicles();
        if (vehRes.status === 'success') setVehicles(vehRes.data.vehicles);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLicenceAndVehicles();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Uploading avatar...');
      await uploadAvatar(file);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Upload failed.');
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({ name, phone, registrationNumber: regNum, year, branch });
      toast.success('Profile saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLicenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceNumber || !licenceExpiry) return toast.error('Details required.');
    if (!licence && (!frontFile || !backFile)) return toast.error('Scans required.');
    setLicenceLoading(true);
    try {
      const res = await licenceService.uploadLicence(
        licenceNumber,
        licenceExpiry,
        frontFile || new File([], ''),
        backFile || new File([], '')
      );
      if (res.status === 'success') {
        setLicence(res.data.licence);
        toast.success('Licence submitted!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setLicenceLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vBrand || !vModel || !vPlate || !vColor || !rcFile) return toast.error('RC scan required.');
    setVehicleSubmitLoading(true);
    try {
      const regRes = await vehicleService.registerVehicle({
        type: vType,
        brand: vBrand,
        model: vModel,
        numberPlate: vPlate,
        color: vColor,
        seats: vSeats,
      });
      if (regRes.status === 'success') {
        const uploadRes = await vehicleService.uploadVehicleRC(regRes.data.vehicle._id, rcFile);
        if (uploadRes.status === 'success') {
          setVehicles((prev) => [...prev, uploadRes.data.vehicle]);
          toast.success('Vehicle registered!');
          setShowAddVehicle(false);
          setVBrand('');
          setVModel('');
          setVPlate('');
          setVColor('');
          setRcFile(null);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed.');
    } finally {
      setVehicleSubmitLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      const res = await vehicleService.deleteVehicle(id);
      if (res.status === 'success') {
        setVehicles((prev) => prev.filter((v) => v._id !== id));
        toast.success('Deleted vehicle.');
      }
    } catch (err) {
      toast.error('Delete failed.');
    }
  };

  return (
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300">
      
      {/* Native Mobile Profile Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
        <div className="relative group mb-3">
          <img
            src={
              user?.profileImage ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || '')}`
            }
            alt="avatar"
            className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-md"
          />
          <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 text-white rounded-full cursor-pointer shadow-md active:scale-95 transition-transform">
            <Upload className="w-3.5 h-3.5" />
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>

        <h1 className="text-base font-black text-slate-900">{user?.name}</h1>
        <p className="text-xs text-slate-400 font-medium">{user?.email}</p>

        {/* Badges / Stats Pills */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-2 rounded-2xl">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Trips</span>
            <span className="text-xs font-black text-slate-800">{user?.totalTrips || 0}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded-2xl">
            <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-wider block">Trust</span>
            <span className="text-xs font-black text-emerald-700">{user?.trustScore || 100}%</span>
          </div>
          <div className="bg-amber-50 p-2 rounded-2xl">
            <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block">Rating</span>
            <span className="text-xs font-black text-amber-700 flex items-center justify-center gap-0.5">
              <Star className="w-3 h-3 fill-amber-400" />
              {user?.rating || 5.0}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
        {[
          { id: 'profile', icon: User, label: 'Profile' },
          { id: 'licence', icon: CreditCard, label: 'Licence' },
          { id: 'vehicles', icon: Car, label: 'Vehicles' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Form Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <span className="text-xs font-black text-slate-900 mb-1">Academic & Personal Info</span>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Roll / Registration Number
            </label>
            <input
              type="text"
              value={regNum}
              onChange={(e) => setRegNum(e.target.value)}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Year of Study
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Branch / Dept
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE"
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all mt-2"
          >
            {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      )}

      {/* Licence Tab */}
      {activeTab === 'licence' && (
        <form onSubmit={handleLicenceSubmit} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-900">Driving Licence Document</span>
            <span
              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                licence?.status === 'verified'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {licence?.status?.toUpperCase() || 'NOT LINKED'}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Licence ID Number
            </label>
            <input
              type="text"
              placeholder="AP07XXXXXXXX"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              disabled={licence?.status === 'verified'}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
              Licence Expiry Date
            </label>
            <input
              type="date"
              value={licenceExpiry}
              onChange={(e) => setLicenceExpiry(e.target.value)}
              disabled={licence?.status === 'verified'}
              className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              required
            />
          </div>

          {!licence && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Licence Front Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Licence Back Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500"
                  required
                />
              </div>
            </div>
          )}

          {(!licence || licence.status === 'rejected') && (
            <button
              type="submit"
              disabled={licenceLoading}
              className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all mt-2"
            >
              {licenceLoading ? 'Submitting...' : 'Submit Licence for Review'}
            </button>
          )}
        </form>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-900">My Vehicles ({vehicles.length})</span>
            {!showAddVehicle && (
              <button
                onClick={() => setShowAddVehicle(true)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform"
              >
                + Add Vehicle
              </button>
            )}
          </div>

          {showAddVehicle && (
            <form onSubmit={handleAddVehicle} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
              <span className="text-xs font-black text-slate-900 mb-1">Register New Vehicle</span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as any)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="car">Car</option>
                    <option value="bike">Bike</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Honda"
                    value={vBrand}
                    onChange={(e) => setVBrand(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City"
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="AP 39 XX 1234"
                    value={vPlate}
                    onChange={(e) => setVPlate(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    placeholder="White"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    value={vSeats}
                    onChange={(e) => setVSeats(parseInt(e.target.value) || 4)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Upload RC Document Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setRcFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-500 bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vehicleSubmitLoading}
                  className="flex-1 py-3 rounded-2xl text-xs font-extrabold text-white bg-emerald-600 shadow-md shadow-emerald-600/20"
                >
                  {vehicleSubmitLoading ? 'Submitting...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          )}

          {vehicles.map((v) => (
            <div
              key={v._id}
              className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    {v.brand} {v.model}
                  </h4>
                  <p className="text-[10px] font-extrabold text-slate-400">
                    Plate: {v.numberPlate} • Seats: {v.seats}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    v.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {v.status}
                </span>
                <button
                  onClick={() => handleDeleteVehicle(v._id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logout Action Card */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-100 shadow-sm mt-2">
        <button
          onClick={logout}
          className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out of Account</span>
        </button>
      </div>

    </div>
  );
};

export default Profile;

