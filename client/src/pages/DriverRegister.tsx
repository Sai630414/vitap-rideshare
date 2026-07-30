import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  User,
  Mail,
  Phone,
  Car,
  FileText,
  Check,
  X,
  Upload,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import api from '../services/api';

export const DriverRegister: React.FC = () => {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Multi-step state: 1: Contact, 2: Vehicle details, 3: Documents Upload
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [collegeCardNumber, setCollegeCardNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColour, setVehicleColour] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'car'>('car');
  const [drivingExperience, setDrivingExperience] = useState('');

  // Files state
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [licenceImage, setLicenceImage] = useState<File | null>(null);
  const [collegeCardImage, setCollegeCardImage] = useState<File | null>(null);
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);

  useEffect(() => {
    // If user is already active driver, redirect to driver dashboard
    if (user?.role === 'driver' && user?.verifiedDriver) {
      navigate('/driver/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;

    if ((!licenceImage && !collegeCardImage) || !vehicleImage) {
      toast.error('Please upload at least one license/ID proof scan, and your vehicle image.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('emergencyContact', emergencyContact);
      if (licenceNumber) formData.append('licenceNumber', licenceNumber);
      if (collegeCardNumber) formData.append('collegeCardNumber', collegeCardNumber);
      formData.append('vehicleNumber', vehicleNumber);
      formData.append('vehicleModel', vehicleModel);
      formData.append('vehicleColour', vehicleColour);
      formData.append('vehicleType', vehicleType);
      formData.append('drivingExperience', drivingExperience);
      
      if (profilePhoto) {
        formData.append('profilePhoto', profilePhoto);
      }
      if (licenceImage) formData.append('licenceImage', licenceImage);
      if (collegeCardImage) formData.append('collegeCardImage', collegeCardImage);
      formData.append('vehicleImage', vehicleImage);

      const res = await api.post('/users/apply-driver', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        toast.success('🎉 Driver application submitted successfully!');
        // Refresh local user state so context knows they have applied
        if (login) {
          window.location.href = '/driver/dashboard';
        } else {
          navigate('/driver/dashboard');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit driver application.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!phone || !emergencyContact) {
        toast.error('Phone and emergency contacts are required');
        return;
      }
      if (phone.length < 10 || emergencyContact.length < 10) {
        toast.error('Phone numbers must be at least 10 digits');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!vehicleNumber || !vehicleModel || !vehicleColour || !drivingExperience) {
        toast.error('All vehicle fields and experience are required');
        return;
      }
      if (!licenceNumber && !collegeCardNumber) {
        toast.error('Either Driving Licence Number or College ID Card Number must be specified');
        return;
      }
      const exp = Number(drivingExperience);
      if (isNaN(exp) || exp < 0) {
        toast.error('Experience must be a positive number');
        return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-zinc-950/20 font-sans">
      <div className="w-full max-w-lg z-10 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-zinc-100 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
            Driver Registration
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-bold uppercase tracking-wider">
            Onboard vehicle and apply to host rides
          </p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center border-b border-zinc-850 pb-4">
            <div className="flex justify-center items-center gap-3 mb-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>1</span>
              <div className={`h-0.5 w-6 ${step >= 2 ? 'bg-violet-600' : 'bg-zinc-800'}`}></div>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>2</span>
              <div className={`h-0.5 w-6 ${step >= 3 ? 'bg-violet-600' : 'bg-zinc-800'}`}></div>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 3 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>3</span>
            </div>
            <CardTitle className="text-base text-zinc-200">
              {step === 1 && 'Contact Configuration'}
              {step === 2 && 'Vehicle Details'}
              {step === 3 && 'Submit Scans'}
            </CardTitle>
            <CardDescription className="text-xs">
              {step === 1 && 'Setup active contacts'}
              {step === 2 && 'Model specification and plate registers'}
              {step === 3 && 'Upload files for review'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              {/* STEP 1: Contacts info */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Full Name"
                    value={user?.name || ''}
                    disabled
                    icon={<User className="w-4 h-4 text-zinc-500" />}
                  />
                  <Input
                    label="College Email"
                    value={user?.email || ''}
                    disabled
                    icon={<Mail className="w-4 h-4 text-zinc-500" />}
                  />
                  <Input
                    label="Active Phone Number"
                    placeholder="e.g. 9876543210"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={<Phone className="w-4 h-4" />}
                    required
                  />
                  <Input
                    label="Emergency Contact Number"
                    placeholder="e.g. 9876543211"
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    icon={<Phone className="w-4 h-4 text-red-500" />}
                    required
                  />
                </div>
              )}

              {/* STEP 2: Vehicle specifics */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Driving Licence Number"
                    placeholder="e.g. AP07XX1234 (Optional if College ID specified)"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value.toUpperCase())}
                    icon={<FileText className="w-4 h-4" />}
                  />
                  <Input
                    label="College ID Card Number"
                    placeholder="e.g. 23MICXXXX (Optional if Licence specified)"
                    value={collegeCardNumber}
                    onChange={(e) => setCollegeCardNumber(e.target.value.toUpperCase())}
                    icon={<FileText className="w-4 h-4 text-indigo-400" />}
                  />
                  <Input
                    label="Vehicle Number Plate"
                    placeholder="e.g. AP39XX1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    icon={<Car className="w-4 h-4" />}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Vehicle Model"
                      placeholder="e.g. Activa 6G / Swift"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      required
                    />
                    <Input
                      label="Vehicle Colour"
                      placeholder="e.g. Black / White"
                      value={vehicleColour}
                      onChange={(e) => setVehicleColour(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-400">Vehicle Type</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value as 'bike' | 'car')}
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 outline-none text-xs"
                      >
                        <option value="car">Car (4 Wheeler)</option>
                        <option value="bike">Bike (2 Wheeler)</option>
                      </select>
                    </div>
                    <Input
                      label="Driving Experience (Years)"
                      placeholder="e.g. 3"
                      type="number"
                      value={drivingExperience}
                      onChange={(e) => setDrivingExperience(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Scans & Uploads */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  {/* profilePhoto (optional) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-zinc-400">Optional: Update Profile Photo</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="profilePhotoInput"
                        onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="profilePhotoInput"
                        className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all flex-1"
                      >
                        <Upload className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-zinc-500 truncate">
                          {profilePhoto ? profilePhoto.name : 'Select profile photo scan'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* licenceImage */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-zinc-400">Driving Licence Image Scan (Optional if ID uploaded)</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="licenceImageInput"
                        onChange={(e) => setLicenceImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="licenceImageInput"
                        className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all flex-1"
                      >
                        <Upload className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-zinc-500 truncate">
                          {licenceImage ? licenceImage.name : 'Select licence card photo'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* collegeCardImage */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-zinc-400">College ID Image Scan (Optional if Licence uploaded)</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="collegeCardImageInput"
                        onChange={(e) => setCollegeCardImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="collegeCardImageInput"
                        className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all flex-1"
                      >
                        <Upload className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-zinc-500 truncate">
                          {collegeCardImage ? collegeCardImage.name : 'Select college ID card photo'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* vehicleImage */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-semibold text-zinc-400">Vehicle Photo Scan *</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="vehicleImageInput"
                        onChange={(e) => setVehicleImage(e.target.files?.[0] || null)}
                        className="hidden"
                        required
                      />
                      <label
                        htmlFor="vehicleImageInput"
                        className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-all flex-1"
                      >
                        <Upload className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-zinc-500 truncate">
                          {vehicleImage ? vehicleImage.name : 'Select vehicle photo'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between items-center gap-4 mt-6 border-t border-zinc-850 pt-4">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={prevStep}
                    className="flex items-center gap-1.5 px-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                ) : (
                  <Link to="/dashboard" className="text-zinc-400 hover:text-zinc-300 font-semibold py-2">
                    Cancel Onboarding
                  </Link>
                )}

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-1.5 px-5 ml-auto"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={loading}
                    className="ml-auto bg-violet-650 hover:bg-violet-700 text-white font-bold"
                  >
                    Submit Application
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverRegister;
