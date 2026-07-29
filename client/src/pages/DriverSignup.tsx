import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Mail, Lock, Phone, Car, FileText, Check, X, ShieldAlert, ArrowRight, ArrowLeft, Sparkles, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export const DriverSignup: React.FC = () => {
  const { signupDriver } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Multi-step state: 1: Personal details, 2: Vehicle details, 3: Documents Upload
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Personal / Auth info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Step 2: Vehicle details
  const [licenceNumber, setLicenceNumber] = useState('');
  const [collegeCardNumber, setCollegeCardNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColour, setVehicleColour] = useState('');
  const [vehicleType, setVehicleType] = useState<'bike' | 'car'>('car');
  const [drivingExperience, setDrivingExperience] = useState('');

  // Step 3: Files state
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [licenceImage, setLicenceImage] = useState<File | null>(null);
  const [collegeCardImage, setCollegeCardImage] = useState<File | null>(null);
  const [vehicleImage, setVehicleImage] = useState<File | null>(null);

  // Password requirements checklist
  const [rules, setRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setRules({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&#]/.test(password),
    });
  }, [password]);

  const isPasswordValid = Object.values(rules).every(Boolean);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step !== 3) return;

    if (!profilePhoto || (!licenceImage && !collegeCardImage) || !vehicleImage) {
      toast.error('Profile photo, vehicle photo, and at least one identity document (Driving Licence or College ID) are required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (licenceNumber) formData.append('licenceNumber', licenceNumber);
      if (collegeCardNumber) formData.append('collegeCardNumber', collegeCardNumber);
      formData.append('vehicleNumber', vehicleNumber);
      formData.append('vehicleModel', vehicleModel);
      formData.append('vehicleColour', vehicleColour);
      formData.append('vehicleType', vehicleType);
      formData.append('drivingExperience', drivingExperience);
      formData.append('emergencyContact', emergencyContact);
      formData.append('profilePhoto', profilePhoto);
      if (licenceImage) formData.append('licenceImage', licenceImage);
      if (collegeCardImage) formData.append('collegeCardImage', collegeCardImage);
      formData.append('vehicleImage', vehicleImage);

      const res = await signupDriver(formData);
      toast.success(res.message || 'Driver registration successful! Verify email code.');
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Driver signup failed. Please review inputs.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!name || !email || !phone || !password || !confirmPassword || !emergencyContact) {
        toast.error('All fields are required');
        return;
      }
      if (!email.endsWith('@vitapstudent.ac.in') && !email.endsWith('@vitap.ac.in')) {
        toast.error('Only @vitapstudent.ac.in or @vitap.ac.in emails are allowed');
        return;
      }
      if (!isPasswordValid) {
        toast.error('Password does not meet validation criteria');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
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
      const expNum = Number(drivingExperience);
      if (isNaN(expNum) || expNum < 0) {
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
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-zinc-950 overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

      <div className="w-full max-w-lg z-10 flex flex-col gap-6">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
              VIT RideShare
            </h1>
          </Link>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Register your vehicle to host rides on campus
          </p>
        </div>

        <Card glass={true}>
          <CardHeader className="text-center border-b border-zinc-800/40 pb-4">
            <div className="flex justify-center items-center gap-3 mb-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 1 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>1</span>
              <div className={`h-0.5 w-8 ${step >= 2 ? 'bg-violet-600' : 'bg-zinc-800'}`}></div>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 2 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>2</span>
              <div className={`h-0.5 w-8 ${step >= 3 ? 'bg-violet-600' : 'bg-zinc-800'}`}></div>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= 3 ? 'bg-violet-600 text-white shadow' : 'bg-zinc-800 text-zinc-500'
              }`}>3</span>
            </div>
            <CardTitle className="text-xl">
              {step === 1 && 'Driver Account Setup'}
              {step === 2 && 'Vehicle Configuration'}
              {step === 3 && 'Document Uploads'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Credentials and personal details'}
              {step === 2 && 'Model details and licence registration'}
              {step === 3 && 'Submit scans for administrator verification review'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* STEP 1: Personal & Credentials */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="w-5 h-5" />}
                    required
                  />

                  <Input
                    label="College Email"
                    placeholder="rollnumber@vitapstudent.ac.in"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-5 h-5" />}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      placeholder="9876543210"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      icon={<Phone className="w-5 h-5" />}
                      required
                    />
                    <Input
                      label="Emergency Contact"
                      placeholder="9012345678"
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      icon={<Phone className="w-5 h-5" />}
                      required
                    />
                  </div>

                  <Input
                    label="Password"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="w-5 h-5" />}
                    required
                  />

                  {/* Password Checks */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800/50 rounded-xl flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-zinc-400">Password must contain:</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        {rules.length ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />}
                        <span className={rules.length ? 'text-emerald-400' : 'text-zinc-500'}>8+ Characters</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {rules.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />}
                        <span className={rules.uppercase ? 'text-emerald-400' : 'text-zinc-500'}>Uppercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {rules.lowercase ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />}
                        <span className={rules.lowercase ? 'text-emerald-400' : 'text-zinc-500'}>Lowercase letter</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {rules.number ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />}
                        <span className={rules.number ? 'text-emerald-400' : 'text-zinc-500'}>One number</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs col-span-2">
                        {rules.special ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-650 shrink-0" />}
                        <span className={rules.special ? 'text-emerald-400' : 'text-zinc-500'}>Special character (@$!%*?&#)</span>
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Confirm Password"
                    placeholder="••••••••"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock className="w-5 h-5" />}
                    required
                  />
                </div>
              )}

              {/* STEP 2: Vehicle details */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Driving Licence Number"
                      placeholder="AP07XXXXXXXXX (Optional if College ID provided)"
                      type="text"
                      value={licenceNumber}
                      onChange={(e) => setLicenceNumber(e.target.value)}
                      icon={<FileText className="w-5 h-5" />}
                    />
                    <Input
                      label="College ID Card Number"
                      placeholder="23MICXXXX (Optional if DL provided)"
                      type="text"
                      value={collegeCardNumber}
                      onChange={(e) => setCollegeCardNumber(e.target.value)}
                      icon={<FileText className="w-5 h-5" />}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Vehicle Plate Number"
                      placeholder="AP07BY1234"
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      icon={<Car className="w-5 h-5" />}
                      required
                    />
                    <Input
                      label="Driving Experience (Years)"
                      placeholder="2"
                      type="number"
                      min={0}
                      value={drivingExperience}
                      onChange={(e) => setDrivingExperience(e.target.value)}
                      icon={<Car className="w-5 h-5" />}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Vehicle Model / Brand"
                        placeholder="Honda Activa 6G / Hyundai i20"
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        icon={<Car className="w-5 h-5" />}
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Colour"
                        placeholder="Red"
                        type="text"
                        value={vehicleColour}
                        onChange={(e) => setVehicleColour(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-zinc-300">Vehicle Type</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setVehicleType('car')}
                        className={`flex-1 py-3 border rounded-xl font-bold transition-all text-sm cursor-pointer ${
                          vehicleType === 'car'
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        Four Wheeler (Car)
                      </button>
                      <button
                        type="button"
                        onClick={() => setVehicleType('bike')}
                        className={`flex-1 py-3 border rounded-xl font-bold transition-all text-sm cursor-pointer ${
                          vehicleType === 'bike'
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        Two Wheeler (Bike)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Document uploads */}
              {step === 3 && (
                <div className="flex flex-col gap-4">
                  
                  {/* profilePhoto */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Profile Photo Upload</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="profilePhotoInput"
                        className="hidden"
                        onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="profilePhotoInput"
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-xs font-bold text-zinc-200 rounded-lg cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        Select File
                      </label>
                      <span className="text-xs text-zinc-450 truncate flex-1">
                        {profilePhoto ? profilePhoto.name : 'No image selected'}
                      </span>
                    </div>
                  </div>

                  {/* licenceImage */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Driving Licence Scan (Optional if ID uploaded)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        id="licenceImageInput"
                        className="hidden"
                        onChange={(e) => setLicenceImage(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="licenceImageInput"
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-xs font-bold text-zinc-200 rounded-lg cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        Select File
                      </label>
                      <span className="text-xs text-zinc-455 truncate flex-1">
                        {licenceImage ? licenceImage.name : 'No image selected'}
                      </span>
                    </div>
                  </div>

                  {/* collegeCardImage */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <label className="block text-xs font-bold text-zinc-400 mb-1">College ID Card Scan (Optional if Licence uploaded)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        id="collegeCardImageInput"
                        className="hidden"
                        onChange={(e) => setCollegeCardImage(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="collegeCardImageInput"
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-xs font-bold text-zinc-200 rounded-lg cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        Select File
                      </label>
                      <span className="text-xs text-zinc-455 truncate flex-1">
                        {collegeCardImage ? collegeCardImage.name : 'No image selected'}
                      </span>
                    </div>
                  </div>

                  {/* vehicleImage */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Vehicle Front/Side Photo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        id="vehicleImageInput"
                        className="hidden"
                        onChange={(e) => setVehicleImage(e.target.files?.[0] || null)}
                      />
                      <label
                        htmlFor="vehicleImageInput"
                        className="flex items-center gap-2 px-3 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-750 text-xs font-bold text-zinc-200 rounded-lg cursor-pointer transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-zinc-400" />
                        Select File
                      </label>
                      <span className="text-xs text-zinc-450 truncate flex-1">
                        {vehicleImage ? vehicleImage.name : 'No image selected'}
                      </span>
                    </div>
                  </div>

                  {/* Security statement banner */}
                  <div className="p-3 bg-indigo-950/20 border border-indigo-800/30 rounded-xl flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-4 text-zinc-400">
                      I certify that all licensing numbers and uploaded files represent my active vehicle, and I consent to the admin verification process.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation buttons row */}
              <div className="flex justify-between items-center gap-4 mt-2">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div></div>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-750 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Button type="submit" loading={loading} className="px-5 py-2.5 cursor-pointer">
                    Register Driver Profile
                    <Check className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-5 text-center text-sm border-t border-zinc-800/30 pt-4">
              <span className="text-zinc-400">Already registered? </span>
              <Link to="/login" className="text-violet-400 font-semibold hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverSignup;
