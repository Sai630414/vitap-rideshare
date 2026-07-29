import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService, { type UserProfile } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  signup: (data: any) => Promise<any>;
  signupDriver: (formData: FormData) => Promise<any>;
  verifyOtp: (email: string, otp: string) => Promise<any>;
  resendOtp: (email: string) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  adminLogin: (email: string, password: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getMe();
      if (response.status === 'success' && response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      // Clear storage if session expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token) {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setLoading(false);
        // Sync with backend in background
        refreshUser();
      } else {
        refreshUser();
      }
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const loginWithGoogle = async (idToken: string) => {
    setLoading(true);
    try {
      const response = await authService.loginWithGoogle(idToken);
      if (response.status === 'success' && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: any) => {
    return await authService.signup(data);
  };

  const signupDriver = async (formData: FormData) => {
    return await authService.signupDriver(formData);
  };

  const verifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const response = await authService.verifyOtp(email, otp);
      if (response.status === 'success' && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    return await authService.resendOtp(email);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response.status === 'success' && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.adminLogin(email, password);
      if (response.status === 'success' && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    return await authService.forgotPassword(email);
  };

  const resetPassword = async (data: any) => {
    return await authService.resetPassword(data);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    const response = await authService.updateProfile(data);
    if (response.status === 'success' && response.data.user) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  };

  const uploadAvatar = async (file: File) => {
    const response = await authService.uploadAvatar(file);
    if (response.status === 'success' && response.data.user) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        signup,
        signupDriver,
        verifyOtp,
        resendOtp,
        login,
        adminLogin,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
