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

  payByKey: async (data: {
    paymentKey: string;
    amount: number;
    description?: string;
  }): Promise<Transaction> => {
    const response = await api.post<Transaction>('/pix/transfer', data);
    return response.data;
  },

  getMyPaymentKeys: async (): Promise<{ id: string; keyType: string; keyValue: string }[]> => {
    const response = await api.get('/pix/keys');
    return response.data;
  },

  registerPaymentKey: async (data: { keyType: 'EMAIL' | 'PHONE' | 'RANDOM'; keyValue: string }) => {
    const response = await api.post('/pix/keys', data);
    return response.data;
  },

  getHistory: async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/history');
    return response.data;
  },

  downloadReceipt: async (transactionId: string): Promise<Blob> => {
    const response = await api.get(`/transactions/${transactionId}/receipt`, { responseType: 'blob' });
    return response.data;
  },
};
