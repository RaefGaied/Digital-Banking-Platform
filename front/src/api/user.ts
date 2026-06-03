import api from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled?: boolean;
  agency: string;
  accountNumber: string;
  createdAt: string;
}

export const userApi = {
  getMe: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/users/me');
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.put('/users/change-password', data);
  },
};