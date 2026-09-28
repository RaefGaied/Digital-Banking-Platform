import api from './client';
import type { PageResponse } from '../types';

export interface NotificationDto {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  referenceType?: string | null;
  referenceId?: number | null;
}

export const notificationsApi = {
  getUnreadCount: async (): Promise<number> => {
    const resp = await api.get('/notifications/unread/count');
    // response payload: { message, data: { count } }
    return (resp.data && resp.data.data && resp.data.data.count) || 0;
  },

  getUnreadNotifications: async (page = 0, size = 10): Promise<NotificationDto[]> => {
    const resp = await api.get('/notifications/unread', { params: { page, size } });
    const pageData = resp.data && resp.data.data;
    return (pageData && pageData.content) || [];
  },

  getNotifications: async (page = 0, size = 10): Promise<PageResponse<NotificationDto>> => {
    const resp = await api.get('/notifications', { params: { page, size } });
    return resp.data.data;
  },

  markAsRead: async (id: string): Promise<NotificationDto> => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },
};
