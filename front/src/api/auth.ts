import api from './client';
import type { LoginRequest, RegisterRequest, TokenResponse } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<any> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },

  verify2fa: async (tempToken: string, code: number): Promise<TokenResponse> => {
    const response = await api.post('/auth/verify-2fa', { tempToken, code });
    return response.data;
  }
};
