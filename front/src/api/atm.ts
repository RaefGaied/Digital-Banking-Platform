import api from './client';
import type { AtmNetworkStatus, AtmWithdrawalReceipt } from '../types';

export const atmApi = {
  getNetworkStatus: async (): Promise<AtmNetworkStatus> => {
    const response = await api.get<AtmNetworkStatus>('/atm/withdrawals/network-status');
    return response.data;
  },

  redeemWithdrawal: async (reference: string, code: string): Promise<AtmWithdrawalReceipt> => {
    const response = await api.post<AtmWithdrawalReceipt>('/atm/withdrawals/redeem', {
      reference,
      code,
    });
    return response.data;
  },
};
