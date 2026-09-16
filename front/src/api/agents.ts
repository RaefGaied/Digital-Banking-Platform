import api from './client';
import type { AgentDecisionResult, BankingAgent, DetermineAgentDecisionRequest } from '../types';

type WrapperSingle = { message: string; data: BankingAgent };
type WrapperList = { message: string; data: BankingAgent[] };

export const agentsApi = {
  createForSession: async (sessionId: string): Promise<BankingAgent> => {
    const response = await api.post<WrapperSingle>('/agents', { sessionId });
    return response.data.data;
  },

  listMine: async (): Promise<BankingAgent[]> => {
    const response = await api.get<WrapperList>('/agents');
    return response.data.data;
  },

  getById: async (id: string): Promise<BankingAgent> => {
    const response = await api.get<WrapperSingle>(`/agents/${id}`);
    return response.data.data;
  },

  getBySession: async (sessionId: string): Promise<BankingAgent> => {
    const response = await api.get<WrapperSingle>(`/agents/by-session/${sessionId}`);
    return response.data.data;
  },

  updateContext: async (id: string, context: Record<string, unknown>): Promise<BankingAgent> => {
    const response = await api.patch<WrapperSingle>(`/agents/${id}/context`, context);
    return response.data.data;
  },

  updateDecision: async (id: string, decision: string): Promise<BankingAgent> => {
    const response = await api.patch<WrapperSingle>(`/agents/${id}/decision`, { decision });
    return response.data.data;
  },

  setPolicy: async (id: string, policy: string): Promise<BankingAgent> => {
    const response = await api.patch<WrapperSingle>(`/agents/${id}/policy`, { decision: policy });
    return response.data.data;
  },

  recordLastTransaction: async (id: string, transactionId: string): Promise<BankingAgent> => {
    const response = await api.post<WrapperSingle>(`/agents/${id}/record-transaction`, { transactionId });
    return response.data.data;
  },

  determineDecision: async (request: DetermineAgentDecisionRequest): Promise<AgentDecisionResult> => {
    const response = await api.post<{ message: string; data: AgentDecisionResult }>('/mcp/agent/determine-decision', request);
    return response.data.data;
  },
};
