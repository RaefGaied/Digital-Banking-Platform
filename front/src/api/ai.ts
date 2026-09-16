import api from './client';

export type AiAskResponse = {
  question: string;
  matches: string[];
  context: string;
  intent?: string | null;
  confidence?: number | null;
  hasResults: boolean;
  error?: string;
};

export const aiApi = {
  detectIntent: async (message: string) => {
    const response = await api.post('/ai/intent', { message });
    return response.data;
  },

  extractDocument: async (payload: { text?: string; file?: File | null }) => {
    const formData = new FormData();
    if (payload.text) formData.append('text', payload.text);
    if (payload.file) formData.append('file', payload.file);

    const response = await api.post('/ai/extract-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  ask: async (question: string): Promise<AiAskResponse> => {
    const response = await api.post<AiAskResponse>('/ai/ask', { question });
    return response.data;
  },
};
