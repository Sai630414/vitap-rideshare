import api from './api';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  registrationNumber?: string;
  year?: number;
  branch?: string;
  profileImage: string;
  role: 'student' | 'driver' | 'admin';
  rating: number;
  totalTrips: number;
  verifiedStudent: boolean;
  verifiedDriver: boolean;
  trustScore: number;
  status: 'active' | 'banned';
  driverDetails?: {
    phone: string;
    licenceNumber?: string;
    collegeCardNumber?: string;
    vehicleNumber: string;
    vehicleModel: string;
    vehicleColour: string;
    vehicleType: 'bike' | 'car';
    drivingExperience: number;
    emergencyContact: string;
    licenceImage?: string;
    collegeCardImage?: string;
    vehicleImage: string;
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'resubmission';
    rejectionReason?: string;
    paymentStatus?: 'pending' | 'paid';
  };
}

export const authService = {
  loginWithGoogle: async (idToken: string) => {
    const response = await api.post('/auth/google', { idToken });
    return response.data;
  },

  signup: async (data: any) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  signupDriver: async (formData: FormData) => {
    const response = await api.post('/auth/signup/driver', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  resendOtp: async (email: string) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  adminLogin: async (email: string, password: string) => {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: any) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<UserProfile>) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default authService;
