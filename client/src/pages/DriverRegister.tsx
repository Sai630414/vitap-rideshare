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
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-300 font-sans">
      <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
        
        {/* Header Title Card */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md shadow-emerald-600/20 text-center flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-1">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Driver Registration</h1>
          <p className="text-xs text-emerald-100 font-bold uppercase tracking-wider">
            Onboard vehicle and apply to host campus rides
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-5">
          {/* Step Indicators */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex justify-center items-center gap-3 mb-2">
              <span className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                step >= 1 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>1</span>
              <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-emerald-600' : 'bg-slate-100'}`}></div>
              <span className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                step >= 2 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>2</span>
              <div className={`h-0.5 w-8 ${step >= 3 ? 'bg-emerald-600' : 'bg-slate-100'}`}></div>
              <span className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-black transition-all ${
                step >= 3 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>3</span>
            </div>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900">
                {step === 1 && 'Contact Setup'}
                {step === 2 && 'Vehicle Specifics'}
                {step === 3 && 'Document Uploads'}
              </h2>
              <p className="text-[10px] font-bold text-slate-400">
                {step === 1 && 'Verify active contact numbers'}
                {step === 2 && 'Model specification & registration plates'}
                {step === 3 && 'Submit photo scans for admin review'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            {/* STEP 1: Contacts info */}
            {step === 1 && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">College Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Active Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Emergency Contact Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543211"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Vehicle specifics */}
            {step === 2 && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Driving Licence Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AP07XX1234 (Optional if College ID specified)"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value.toUpperCase())}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">College ID Card Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 23MICXXXX (Optional if Licence specified)"
                    value={collegeCardNumber}
                    onChange={(e) => setCollegeCardNumber(e.target.value.toUpperCase())}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Number Plate *</label>
                  <input
                    type="text"
                    placeholder="e.g. AP39XX1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Model *</label>
                    <input
                      type="text"
                      placeholder="e.g. Activa 6G / Swift"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Colour *</label>
                    <input
                      type="text"
                      placeholder="e.g. Black / White"
                      value={vehicleColour}
                      onChange={(e) => setVehicleColour(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Vehicle Type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value as 'bike' | 'car')}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="car">Car (4 Wheeler)</option>
                      <option value="bike">Bike (2 Wheeler)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Experience (Years) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 3"
                      value={drivingExperience}
                      onChange={(e) => setDrivingExperience(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Scans & Uploads */}
            {step === 3 && (
              <div className="flex flex-col gap-3">
                {/* profilePhoto */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Optional: Profile Photo Scan</span>
                  <input
                    type="file"
                    accept="image/*"
                    id="profilePhotoInput"
                    onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="profilePhotoInput"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-600 transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 font-bold truncate">
                      {profilePhoto ? profilePhoto.name : 'Select profile photo scan'}
                    </span>
                  </label>
                </div>

                {/* licenceImage */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Driving Licence Scan (Optional if ID uploaded)</span>
                  <input
                    type="file"
                    accept="image/*"
                    id="licenceImageInput"
                    onChange={(e) => setLicenceImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="licenceImageInput"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-600 transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 font-bold truncate">
                      {licenceImage ? licenceImage.name : 'Select licence card photo'}
                    </span>
                  </label>
                </div>

                {/* collegeCardImage */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">College ID Scan (Optional if Licence uploaded)</span>
                  <input
                    type="file"
                    accept="image/*"
                    id="collegeCardImageInput"
                    onChange={(e) => setCollegeCardImage(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="collegeCardImageInput"
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-600 transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 font-bold truncate">
                      {collegeCardImage ? collegeCardImage.name : 'Select college ID card photo'}
                    </span>
                  </label>
                </div>

                {/* vehicleImage */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Vehicle Photo Scan *</span>
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
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-600 transition-all"
                  >
                    <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-600 font-bold truncate">
                      {vehicleImage ? vehicleImage.name : 'Select vehicle photo'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center gap-3 mt-4 border-t border-slate-100 pt-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <Link to="/dashboard" className="text-slate-400 hover:text-slate-600 text-xs font-bold py-2">
                  Cancel Onboarding
                </Link>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/20 ml-auto flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-emerald-600/20 ml-auto active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? 'Submitting Application...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DriverRegister;
