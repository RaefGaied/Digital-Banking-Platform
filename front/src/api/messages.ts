import api from './client';
import type { PageResponse } from '../types';

type MessageResponse = any; // kept loose for now

export const messagesApi = {
  getConversation: async (sessionId: string): Promise<MessageResponse[]> => {
    const response = await api.get<{ message: string; data: MessageResponse[] }>(`/sessions/${sessionId}/messages/conversation`);
    return response.data.data;
  },

  list: async (sessionId: string, page = 0, size = 40): Promise<PageResponse<MessageResponse>> => {
    const response = await api.get<{ message: string; data: PageResponse<MessageResponse> }>(`/sessions/${sessionId}/messages`, { params: { page, size } });
    return response.data.data;
  },

  create: async (sessionId: string, payload: { content: string; senderType?: string; isInternal?: boolean; intent?: string; parameters?: any }) => {
    const response = await api.post(`/sessions/${sessionId}/messages`, payload);
    return response.data;
  },
};

export type { MessageResponse };
