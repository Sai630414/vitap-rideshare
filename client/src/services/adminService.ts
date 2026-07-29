import api from './api';

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalDrivers: number;
  pendingApprovals: number;
  approvedDrivers: number;
  completedTrips: number;
  cancelledTrips: number;
  todayTrips: number;
  revenue: number;
}

export interface AdminChartData {
  dailyRegistrations: { _id: string; count: number }[];
  rideGrowth: { _id: string; count: number }[];
  approvalTrends: { _id: string; count: number }[];
}

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getDrivers: async (filters: { approvalStatus?: string; search?: string; page?: number; limit?: number } = {}) => {
    const response = await api.get('/admin/drivers', { params: filters });
    return response.data;
  },

  getDriverById: async (id: string) => {
    const response = await api.get(`/admin/drivers/${id}`);
    return response.data;
  },

  approveDriver: async (id: string) => {
    const response = await api.put(`/admin/drivers/${id}/approve`);
    return response.data;
  },

  rejectDriver: async (id: string, reason: string) => {
    const response = await api.put(`/admin/drivers/${id}/reject`, { reason });
    return response.data;
  },

  requestResubmission: async (id: string, reason: string) => {
    const response = await api.put(`/admin/drivers/${id}/request-resubmission`, { reason });
    return response.data;
  },

  getStudents: async (filters: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const response = await api.get('/admin/students', { params: filters });
    return response.data;
  },

  toggleStudentStatus: async (id: string, status: 'active' | 'banned') => {
    const response = await api.patch(`/admin/students/${id}/status`, { status });
    return response.data;
  },

  getRides: async (filters: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const response = await api.get('/admin/rides', { params: filters });
    return response.data;
  },

  cancelRide: async (id: string) => {
    const response = await api.delete(`/admin/rides/${id}`);
    return response.data;
  },

  getReports: async () => {
    const response = await api.get('/admin/reports');
    return response.data;
  },

  getApprovals: async () => {
    const response = await api.get('/admin/approvals');
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSettings: async (settings: { key: string; value: any }[]) => {
    const response = await api.put('/admin/settings', { settings });
    return response.data;
  },
};

export default adminService;
