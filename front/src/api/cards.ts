import api from './client';

export interface Card {
  id: string;
  cardType: 'CREDIT' | 'DEBIT';
  brand: 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX';
  holderName: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  creditLimit: number | null;
  availableLimit: number | null;
  active: boolean;
  createdAt: string;
}

export interface CreateCardRequest {
  cardType: 'CREDIT' | 'DEBIT';
  brand: 'VISA' | 'MASTERCARD' | 'ELO' | 'AMEX';
  holderName: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  creditLimit?: number;
}

export const cardsApi = {
  getMyCards: async (): Promise<Card[]> => {
    const response = await api.get<Card[]>('/cards');
    return response.data;
  },

  createCard: async (data: CreateCardRequest): Promise<Card> => {
    const response = await api.post<Card>('/cards', data);
    return response.data;
  },

  updateCard: async (cardId: string, data: CreateCardRequest): Promise<Card> => {
    const response = await api.put<Card>('/cards/' + cardId, data);
    return response.data;
  },

  deleteCard: async (cardId: string): Promise<void> => {
    await api.delete('/cards/' + cardId);
  },
};