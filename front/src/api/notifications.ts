import api from './client';

interface NotificationDto {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
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
  }
};
