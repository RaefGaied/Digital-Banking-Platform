import api from './client';
import type {
  AdminAuditLog,
  AdminDashboardResponse,
  AdminTaskDetail,
  AdminTaskSummary,
  AdminSecurityEvent,
  AdminUserSummary,
  PageResponse,
  TaskActionRequest,
} from '../types';

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await api.get<AdminDashboardResponse>('/admin/dashboard');
    return response.data;
  },

  getTasks: async (page = 0, size = 10): Promise<PageResponse<AdminTaskSummary>> => {
    const response = await api.get<PageResponse<AdminTaskSummary>>('/admin/tasks', { params: { page, size } });
    return response.data;
  },

  getTask: async (taskId: number): Promise<AdminTaskDetail> => {
    const response = await api.get<AdminTaskDetail>(`/admin/tasks/${taskId}`);
    return response.data;
  },

  actOnTask: async (taskId: number, request: TaskActionRequest): Promise<AdminTaskDetail> => {
    const response = await api.post<AdminTaskDetail>(`/admin/tasks/${taskId}/action`, request);
    return response.data;
  },

  getUsers: async (page = 0, size = 10): Promise<PageResponse<AdminUserSummary>> => {
    const response = await api.get<PageResponse<AdminUserSummary>>('/admin/users', { params: { page, size } });
    return response.data;
  },

  blockUser: async (userId: string, reason?: string): Promise<AdminUserSummary> => {
    const response = await api.post<AdminUserSummary>(`/admin/users/${userId}/block`, null, {
      params: reason ? { reason } : undefined,
    });
    return response.data;
  },

  unblockUser: async (userId: string): Promise<AdminUserSummary> => {
    const response = await api.post<AdminUserSummary>(`/admin/users/${userId}/unblock`);
    return response.data;
  },

  getAuditLogs: async (page = 0, size = 10): Promise<PageResponse<AdminAuditLog>> => {
    const response = await api.get<PageResponse<AdminAuditLog>>('/admin/audit-logs', { params: { page, size } });
    return response.data;
  },

  getSecurityEvents: async (page = 0, size = 10): Promise<PageResponse<AdminSecurityEvent>> => {
    const response = await api.get<PageResponse<AdminSecurityEvent>>('/admin/security-events', { params: { page, size } });
    return response.data;
  },

  resolveSecurityEvent: async (eventId: string): Promise<AdminSecurityEvent> => {
    const response = await api.post<AdminSecurityEvent>(`/admin/security-events/${eventId}/resolve`);
    return response.data;
  },
};