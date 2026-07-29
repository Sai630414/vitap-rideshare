import api from './api';

export interface VehicleData {
  _id: string;
  type: 'bike' | 'car';
  brand: string;
  model: string;
  numberPlate: string;
  color: string;
  seats: number;
  insuranceExpiry?: string;
  rcImage?: string;
  status: 'pending' | 'verified' | 'rejected';
  verified: boolean;
}

export const vehicleService = {
  registerVehicle: async (data: Omit<VehicleData, '_id' | 'status' | 'verified' | 'rcImage'>) => {
    const response = await api.post('/vehicles', data);
    return response.data;
  },

  uploadVehicleRC: async (vehicleId: string, rcFile: File) => {
    const formData = new FormData();
    formData.append('rc', rcFile);
    const response = await api.post(`/vehicles/${vehicleId}/rc`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyVehicles: async () => {
    const response = await api.get('/vehicles/my-vehicles');
    return response.data;
  },

  deleteVehicle: async (id: string) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  },
};

export default vehicleService;
