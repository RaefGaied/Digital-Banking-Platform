import api from './client';
import type { CreateSupportTicketRequest, PageResponse, SupportTicket } from '../types';

type SupportTicketWrapper = {
  message: string;
  data: SupportTicket;
};

type SupportTicketListWrapper = {
  message: string;
  data: PageResponse<SupportTicket>;
};

export const supportTicketsApi = {
  create: async (request: CreateSupportTicketRequest): Promise<SupportTicket> => {
    if (request.attachment) {
      const formData = new FormData();
      formData.append('subject', request.subject);
      formData.append('description', request.description);
      if (request.ticketType) formData.append('ticketType', request.ticketType);
      if (request.priority) formData.append('priority', request.priority);
      formData.append('attachment', request.attachment);

      const response = await api.post<SupportTicketWrapper>('/support-tickets/with-attachment', formData);
      return response.data.data;
    }

    const response = await api.post<SupportTicketWrapper>('/support-tickets', request);
    return response.data.data;
  },

  listMine: async (page = 0, size = 10): Promise<PageResponse<SupportTicket>> => {
    const response = await api.get<SupportTicketListWrapper>('/support-tickets', { params: { page, size } });
    return response.data.data;
  },

  getById: async (id: number): Promise<SupportTicket> => {
    const response = await api.get<SupportTicketWrapper>(`/support-tickets/${id}`);
    return response.data.data;
  },

  uploadIdentityDocument: async (ticketId: number, file: File): Promise<SupportTicket> => {
    const formData = new FormData();
    formData.append('attachment', file);
    const response = await api.post<SupportTicketWrapper>(
      `/support-tickets/${ticketId}/identity-document`,
      formData
    );
    return response.data.data;
  },

  downloadAttachment: async (ticketId: number): Promise<Blob> => {
    const response = await api.get<Blob>(`/support-tickets/${ticketId}/attachment`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
