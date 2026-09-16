import api from './client';
import type { CreateSessionRequest, SessionRecord } from '../types';

type SessionWrapper = {
  message: string;
  data: SessionRecord;
};

type SessionListWrapper = {
  message: string;
  data: SessionRecord[];
};

type SessionBooleanWrapper = {
  message: string;
  data: { isValid: boolean };
};

export const sessionsApi = {
  create: async (request: CreateSessionRequest): Promise<SessionRecord> => {
    const response = await api.post<SessionWrapper>('/sessions', request);
    return response.data.data;
  },

  listMine: async (): Promise<SessionRecord[]> => {
    const response = await api.get<SessionListWrapper>('/sessions');
    return response.data.data;
  },

  getById: async (id: string): Promise<SessionRecord> => {
    const response = await api.get<SessionWrapper>(`/sessions/${id}`);
    return response.data.data;
  },

  getActive: async (): Promise<SessionRecord[]> => {
    const response = await api.get<SessionListWrapper>('/sessions/active');
    return response.data.data;
  },

  open: async (id: string): Promise<SessionRecord> => {
    const response = await api.post<SessionWrapper>(`/sessions/${id}/open`);
    return response.data.data;
  },

  close: async (id: string): Promise<SessionRecord> => {
    const response = await api.post<SessionWrapper>(`/sessions/${id}/close`);
    return response.data.data;
  },

  recordActivity: async (id: string): Promise<SessionRecord> => {
    const response = await api.post<SessionWrapper>(`/sessions/${id}/activity`);
    return response.data.data;
  },

  isValid: async (id: string): Promise<boolean> => {
    const response = await api.get<SessionBooleanWrapper>(`/sessions/${id}/valid`);
    return response.data.data.isValid;
  },
};
