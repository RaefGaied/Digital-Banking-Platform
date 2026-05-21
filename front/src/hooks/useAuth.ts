import { useState } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';


export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token;

  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(data);
      localStorage.setItem('token', response.accessToken);
      setToken(response.accessToken);

      // Fetch user name from account endpoint
      const accountResponse = await fetch('http://localhost:8080/api/v1/accounts/me', {
        headers: { Authorization: `Bearer ${response.accessToken}` }
      });
      if (accountResponse.ok) {
        const account = await accountResponse.json();
        localStorage.setItem('userName', account.ownerName);
        setUserName(account.ownerName);
      }

      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register(data);
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('userName', data.name);
      setToken(response.accessToken);
      setUserName(data.name);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error creating account');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserName('');
  };

  return { isAuthenticated, token, userName, loading, error, login, register, logout };
}