import api from './api';

export interface LicenceData {
  _id: string;
  user: string;
  licenceNumber: string;
  expiry: string;
  frontImage: string;
  backImage: string;
  status: 'pending' | 'verified' | 'rejected';
}

export const licenceService = {
  uploadLicence: async (licenceNumber: string, expiry: string, frontFile: File, backFile: File) => {
    const formData = new FormData();
    formData.append('licenceNumber', licenceNumber);
    formData.append('expiry', expiry);
    formData.append('frontImage', frontFile);
    formData.append('backImage', backFile);

    const response = await api.post('/licences', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getMyLicence: async () => {
    const response = await api.get('/licences/my-licence');
    return response.data;
  },
};

export default licenceService;
