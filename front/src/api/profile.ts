import api from './client';

export const profileApi = {
  setup2fa: async () => {
    const res = await api.get('/profile/2fa/setup');
    return res.data as { secret: string; otpauthUri: string };
  },

  enable2fa: async (code: number) => {
    await api.post('/profile/2fa/enable', { code });
  },

  changeEmail: async (email: string, currentPassword: string) => {
    const response = await api.put('/profile/email', { email, currentPassword });
    return response.data.data as { email: string };
  },
};
