export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  agency: string;
  number: string;
  balance: number;
  status: string;
  ownerName: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description: string;
  sourceAccountNumber: string | null;
  targetAccountNumber: string | null;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TransactionRequest {
  amount: number;
  description?: string;
  targetAccountNumber?: string;
}
