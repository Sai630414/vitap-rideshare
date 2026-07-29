import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  CreditCard,
  Car,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  Calendar,
  Layers,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import vehicleService, { type VehicleData } from '../services/vehicleService';
import licenceService, { type LicenceData } from '../services/licenceService';

export const Profile: React.FC = () => {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'licence' | 'vehicles'>('profile');
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [regNum, setRegNum] = useState(user?.registrationNumber || '');
  const [year, setYear] = useState<number>(user?.year || 1);
  const [branch, setBranch] = useState(user?.branch || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Licence state
  const [licence, setLicence] = useState<LicenceData | null>(null);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [licenceLoading, setLicenceLoading] = useState(false);

  // Vehicles state
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  
  // New Vehicle form state
  const [vType, setVType] = useState<'bike' | 'car'>('car');
  const [vBrand, setVBrand] = useState('');
  const [vModel, setVModel] = useState('');
  const [vPlate, setVPlate] = useState('');
  const [vColor, setVColor] = useState('');
  const [vSeats, setVSeats] = useState<number>(4);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [vehicleSubmitLoading, setVehicleSubmitLoading] = useState(false);

  // Fetch licence and vehicles data
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
        console.error('Failed to load licence:', err);
      }

      try {
        const vehRes = await vehicleService.getMyVehicles();
        if (vehRes.status === 'success') {
          setVehicles(vehRes.data.vehicles);
        }
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchLicenceAndVehicles();
  }, [user]);

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.info('Uploading avatar...');
      await uploadAvatar(file);
      toast.success('Profile avatar updated successfully.');
    } catch (err) {
      toast.error('Failed to upload avatar.');
    }
  };

  // Handle profile edit save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({
        name,
        phone,
        registrationNumber: regNum,
        year,
        branch,
      });
      toast.success('Profile details updated successfully.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle licence submit
  const handleLicenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceNumber || !licenceExpiry) {
      toast.error('License details are required.');
      return;
    }
    if (!licence && (!frontFile || !backFile)) {
      toast.error('Please select both front and back document scans.');
      return;
    }

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
        toast.success('Driving licence uploaded successfully for admin verification.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit driving licence.');
    } finally {
      setLicenceLoading(false);
    }
  };

  // Handle vehicle registration
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vBrand || !vModel || !vPlate || !vColor || !rcFile) {
      toast.error('All vehicle details including RC upload are required.');
      return;
    }

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
        const vehicleId = regRes.data.vehicle._id;
        const uploadRes = await vehicleService.uploadVehicleRC(vehicleId, rcFile);
        
        if (uploadRes.status === 'success') {
          setVehicles((prev) => [...prev, uploadRes.data.vehicle]);
          toast.success('Vehicle registered and RC document uploaded successfully!');
          setShowAddVehicle(false);
          // Reset form fields
          setVBrand('');
          setVModel('');
          setVPlate('');
          setVColor('');
          setRcFile(null);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register vehicle.');
    } finally {
      setVehicleSubmitLoading(false);
    }
  };

  // Handle vehicle removal
  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      const res = await vehicleService.deleteVehicle(id);
      if (res.status === 'success') {
        setVehicles((prev) => prev.filter((v) => v._id !== id));
        toast.success('Vehicle deleted successfully.');
      }
    } catch (err) {
      toast.error('Failed to delete vehicle.');
    }
  };

  const getVerificationBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Not Submitted</Badge>;
    switch (status) {
      case 'verified':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Awaiting Approval</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-sans">
        Profile Settings
      </h1>

      {/* Tabs list */}
      <div className="flex border-b border-zinc-800 light:border-zinc-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeTab === 'profile'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className="w-4 h-4" />
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab('licence')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeTab === 'licence'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Driving Licence
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all duration-200 ${
            activeTab === 'vehicles'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Car className="w-4 h-4" />
          My Vehicles
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {/* Profile Details Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Avatar upload */}
            <Card className="h-fit">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="relative group cursor-pointer w-28 h-28 rounded-full overflow-hidden border-2 border-zinc-800/80 hover:border-violet-500/50 transition-colors">
                  <img
                    src={user?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || '')}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-zinc-300 text-xs font-bold cursor-pointer">
                    <Upload className="w-4 h-4 mr-1" />
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <h3 className="font-bold text-lg mt-4">{user?.name}</h3>
                <p className="text-xs text-zinc-400 mt-1">{user?.email}</p>
                <div className="flex gap-2.5 mt-4">
                  <Badge variant={user?.verifiedStudent ? 'success' : 'secondary'}>
                    {user?.verifiedStudent ? '✓ Verified Student' : 'Unverified Student'}
                  </Badge>
                  <Badge variant={user?.verifiedDriver ? 'success' : 'secondary'}>
                    {user?.verifiedDriver ? '✓ Verified Driver' : 'Student Account'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Right: Profile fields form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Academic & Contact Details</CardTitle>
                <CardDescription>Update your active profile metadata</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Phone Number"
                    placeholder="Enter phone digits"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <Input
                    label="Registration Number"
                    placeholder="21BCE0000"
                    value={regNum}
                    onChange={(e) => setRegNum(e.target.value)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-zinc-300">Year of Study</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-600/50 focus:border-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>
                  <Input
                    label="Branch/Department"
                    placeholder="CSE, ECE, etc."
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="sm:col-span-2"
                  />
                  <div className="sm:col-span-2 flex justify-end mt-4">
                    <Button type="submit" loading={profileLoading}>
                      Save Profile Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Driving Licence Tab */}
        {activeTab === 'licence' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="border-b border-zinc-850 pb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle>Government Driving License Verification</CardTitle>
                  <CardDescription>Required documents to unlock driver features</CardDescription>
                </div>
                {getVerificationBadge(licence?.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLicenceSubmit} className="flex flex-col gap-5">
                <Input
                  label="Licence Number"
                  placeholder="AP07XXXXXXXX"
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  required
                  disabled={licence?.status === 'verified' || licence?.status === 'pending'}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-300">Licence Expiry Date</label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-4 w-5 h-5 text-zinc-500 pointer-events-none" />
                    <input
                      type="date"
                      value={licenceExpiry}
                      onChange={(e) => setLicenceExpiry(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-600 transition-all text-sm light:bg-white light:border-zinc-300 light:text-zinc-900"
                      required
                      disabled={licence?.status === 'verified' || licence?.status === 'pending'}
                    />
                  </div>
                </div>

                {/* Upload elements (only if not verified/pending) */}
                {(!licence || licence.status === 'rejected') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Licence Front Scan</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                        className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 file:hover:bg-zinc-700 cursor-pointer"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Licence Back Scan</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                        className="text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 file:hover:bg-zinc-700 cursor-pointer"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Display scans if already uploaded */}
                {licence && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-1 text-center">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Front Side Image</span>
                      <img src={licence.frontImage} className="rounded-xl border border-zinc-850 h-32 object-cover" alt="" />
                    </div>
                    <div className="flex flex-col gap-1 text-center">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Back Side Image</span>
                      <img src={licence.backImage} className="rounded-xl border border-zinc-850 h-32 object-cover" alt="" />
                    </div>
                  </div>
                )}

                {(!licence || licence.status === 'rejected') && (
                  <div className="flex justify-end mt-4">
                    <Button type="submit" loading={licenceLoading}>
                      Submit for Admin Verification
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {/* Header: Register Button */}
            <div className="flex justify-between items-center gap-4">
              <h3 className="font-bold text-lg">Registered Vehicles</h3>
              {!showAddVehicle && (
                <Button size="sm" onClick={() => setShowAddVehicle(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Vehicle
                </Button>
              )}
            </div>

            {/* Add Vehicle Form Panel */}
            {showAddVehicle && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Vehicle</CardTitle>
                  <CardDescription>Submit vehicle data and RC registration proof</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddVehicle} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-zinc-300">Vehicle Type</label>
                      <select
                        value={vType}
                        onChange={(e) => setVType(e.target.value as any)}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                      >
                        <option value="car">Car (4-wheeler)</option>
                        <option value="bike">Bike (2-wheeler)</option>
                      </select>
                    </div>

                    <Input
                      label="Vehicle Brand"
                      placeholder="e.g. Honda, Suzuki, Hyundai"
                      value={vBrand}
                      onChange={(e) => setVBrand(e.target.value)}
                      required
                    />

                    <Input
                      label="Vehicle Model"
                      placeholder="e.g. Civic, Swift, Activa"
                      value={vModel}
                      onChange={(e) => setVModel(e.target.value)}
                      required
                    />

                    <Input
                      label="Plate Number"
                      placeholder="AP07XX1234"
                      value={vPlate}
                      onChange={(e) => setVPlate(e.target.value)}
                      required
                    />

                    <Input
                      label="Vehicle Color"
                      placeholder="e.g. Black, White, Red"
                      value={vColor}
                      onChange={(e) => setVColor(e.target.value)}
                      required
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-semibold text-zinc-300">Available Passenger Seats</label>
                      <input
                        type="number"
                        value={vSeats}
                        onChange={(e) => setVSeats(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-150 focus:outline-none focus:ring-2 focus:ring-violet-600 transition-all text-sm light:bg-white light:border-zinc-300"
                        min={1}
                        max={8}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col gap-2 border border-zinc-800 border-dashed p-4 rounded-xl">
                      <label className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-violet-400" />
                        Registration Certificate (RC) Upload
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setRcFile(e.target.files?.[0] || null)}
                        className="text-xs text-zinc-400 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 file:hover:bg-zinc-700 cursor-pointer"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddVehicle(false)}
                        disabled={vehicleSubmitLoading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={vehicleSubmitLoading}>
                        Register Vehicle
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Vehicles Listings Grid */}
            {vehiclesLoading ? (
              <div className="h-20 bg-zinc-850 animate-pulse rounded-2xl"></div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 border border-zinc-850 rounded-2xl">
                <Car className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-zinc-400">No vehicles registered</p>
                <p className="text-xs text-zinc-500 mt-1">Register a vehicle to start offering rides.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <Card key={v._id}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm capitalize">{v.brand} {v.model}</span>
                            {getVerificationBadge(v.status)}
                          </div>
                          <p className="text-xs text-zinc-400 mt-1.5 uppercase font-semibold">Plate: {v.numberPlate}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Type: <span className="capitalize">{v.type}</span> | Color: {v.color} | Seats: {v.seats}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteVehicle(v._id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-950/20 rounded-lg transition-all shrink-0"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                     </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
