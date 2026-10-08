import api from './client';
import type {
  AdminAuditLog,
  AdminDashboardResponse,
  AdminTaskDetail,
  AdminTaskSummary,
  AdminSecurityEvent,
  AdminSecurityEventResolutionRequest,
  AdminSecurityEventAnalysis,
  AdminTicketSummary,
  AdminUserSummary,
  FlowableAdminTask,
  FlowableProcessDetails,
  FlowableProcessSummary,
  PageResponse,
  RagDocument,
  TaskActionRequest,
} from '../types';

export const adminApi = {
  getDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await api.get<AdminDashboardResponse>('/admin/dashboard');
    return response.data;
  },

  getRagDocuments: async (): Promise<RagDocument[]> => {
    const response = await api.get<RagDocument[]>('/admin/rag-documents');
    return response.data;
  },

  createRagDocument: async (payload: { title: string; content: string; source?: string; active?: boolean }): Promise<RagDocument> => {
    const response = await api.post<RagDocument>('/admin/rag-documents', payload);
    return response.data;
  },

  updateRagDocument: async (id: number, payload: { title: string; content: string; source?: string; active?: boolean }): Promise<RagDocument> => {
    const response = await api.put<RagDocument>(`/admin/rag-documents/${id}`, payload);
    return response.data;
  },

  deleteRagDocument: async (id: number): Promise<void> => {
    await api.delete(`/admin/rag-documents/${id}`);
  },

  getTasks: async (page = 0, size = 10): Promise<PageResponse<AdminTaskSummary>> => {
    const response = await api.get<PageResponse<AdminTaskSummary>>('/admin/tasks', { params: { page, size } });
    return response.data;
  },

  getTask: async (taskId: string): Promise<AdminTaskDetail> => {
    const response = await api.get<AdminTaskDetail>(`/admin/tasks/${taskId}`);
    return response.data;
  },

  actOnTask: async (taskId: string, request: TaskActionRequest): Promise<AdminTaskDetail> => {
    const response = await api.post<AdminTaskDetail>(`/admin/tasks/${taskId}/action`, request);
    return response.data;
  },

  getFlowableTasks: async (): Promise<FlowableAdminTask[]> => {
    const response = await api.get<FlowableAdminTask[]>('/admin/flowable/tasks');
    return response.data;
  },

  getFlowableProcesses: async (page = 0, size = 20): Promise<PageResponse<FlowableProcessSummary>> => {
    const response = await api.get<PageResponse<FlowableProcessSummary>>('/admin/flowable/processes', {
      params: { page, size },
    });
    return response.data;
  },

  getFlowableProcessDetails: async (processInstanceId: string): Promise<FlowableProcessDetails> => {
    const response = await api.get<FlowableProcessDetails>(`/admin/flowable/processes/${processInstanceId}`);
    return response.data;
  },

  downloadTicketAttachment: async (ticketId: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/support-tickets/${ticketId}/attachment`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getFlowableTaskDetails: async (taskId: string): Promise<{
    taskId: string;
    name: string;
    assignee: string | null;
    processInstanceId: string;
    variables: Record<string, unknown>;
  }> => {
    const response = await api.get<{ tool: string; data: {
      taskId: string;
      name: string;
      assignee: string | null;
      processInstanceId: string;
      variables: Record<string, unknown>;
    } }>(`/mcp/flowable/tasks/${taskId}`);
    return response.data.data;
  },

  getFlowableProcessTrace: async (processInstanceId: string): Promise<Array<{
    activityId: string;
    activityName: string;
    activityType: string;
    taskId: string | null;
    assignee: string | null;
    startTime: string;
    endTime: string | null;
    completed: boolean;
    synthetic?: boolean;
  }>> => {
    const response = await api.get(`/admin/flowable/processes/${processInstanceId}/trace`);
    return response.data;
  },

  getTickets: async (page = 0, size = 10): Promise<PageResponse<AdminTicketSummary>> => {
    const response = await api.get<PageResponse<AdminTicketSummary>>('/admin/tickets', {
      params: { page, size },
    });
    return response.data;
  },

  actOnGeneralTicket: async (
    ticketId: number,
    request: { action: 'TAKE_OWNERSHIP' | 'REQUEST_INFO' | 'SEND_UPDATE' | 'RESOLVE'; comment?: string },
  ): Promise<AdminTicketSummary> => {
    const response = await api.post<AdminTicketSummary>(`/admin/tickets/${ticketId}/action`, request);
    return response.data;
  },

  draftGeneralTicketReply: async (ticketId: number, question: string): Promise<{ draft: string }> => {
    const response = await api.post<{ draft: string }>(`/admin/tickets/${ticketId}/ai-draft`, { question });
    return response.data;
  },

  completeFlowableTask: async (
    taskId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE' | 'CONTINUE',
  ) => {
    const response = await api.post(`/admin/flowable/tasks/${taskId}/complete`, { decision });
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

  resolveSecurityEvent: async (
    eventId: string,
    payload: AdminSecurityEventResolutionRequest,
  ): Promise<AdminSecurityEvent> => {
    const response = await api.post<AdminSecurityEvent>(`/admin/security-events/${eventId}/resolve`, payload);
    return response.data;
  },

  analyzeSecurityEvent: async (eventId: string): Promise<AdminSecurityEventAnalysis> => {
    const response = await api.post<AdminSecurityEventAnalysis>(`/admin/security-events/${eventId}/ai-analysis`);
    return response.data;
  },
};