import api from './client';

export type InvestmentType = 'CDB' | 'LCI' | 'LCA' | 'TESOURO_DIRETO' | 'ACOES';
export type InvestmentStatus = 'ACTIVE' | 'REDEEMED';

export interface Investment {
  id: string;
  investmentType: InvestmentType;
  amount: number;
  annualRate: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  status: InvestmentStatus;
  investedAt: string;
  redeemedAt: string | null;
}

export const investmentsApi = {
  getMyInvestments: async (): Promise<Investment[]> => {
    const response = await api.get<Investment[]>('/investments');
    return response.data;
  },

  invest: async (data: { investmentType: InvestmentType; amount: number }): Promise<Investment> => {
    const response = await api.post<Investment>('/investments', data);
    return response.data;
  },

  redeem: async (investmentId: string): Promise<Investment> => {
    const response = await api.post<Investment>(`/investments/${investmentId}/redeem`);
    return response.data;
  },
};
