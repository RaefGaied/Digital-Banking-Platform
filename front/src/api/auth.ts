import api from './client';
import type { LoginRequest, RegisterRequest, TokenResponse } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data);
    return response.data;
  },
};
