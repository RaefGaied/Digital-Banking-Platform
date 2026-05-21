import api from './client';
import type { Account, Transaction, TransactionRequest } from '../types';

export const accountApi = {
  getMyAccount: async (): Promise<Account> => {
    const response = await api.get<Account>('/accounts/me');
    return response.data;
  },

  deposit: async (data: TransactionRequest): Promise<Transaction> => {
    const response = await api.post<Transaction>('/transactions/deposit', data);
    return response.data;
  },

  withdraw: async (data: TransactionRequest): Promise<Transaction> => {
    const response = await api.post<Transaction>('/transactions/withdraw', data);
    return response.data;
  },

  transfer: async (data: TransactionRequest): Promise<Transaction> => {
    const response = await api.post<Transaction>('/transactions/transfer', data);
    return response.data;
  },

  getHistory: async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/history');
    return response.data;
  },
};
