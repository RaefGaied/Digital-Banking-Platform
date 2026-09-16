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
};
