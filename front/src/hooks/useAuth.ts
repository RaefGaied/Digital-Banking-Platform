import { useState } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';


export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || '');
  const [userRole, setUserRole] = useState<string>(() => localStorage.getItem('userRole') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token;

  const login = async (data: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(data);
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('userId', response.uuid);
      localStorage.setItem('userName', response.name);
      localStorage.setItem('userRole', response.role);
      setToken(response.accessToken);
      setUserName(response.name);
      setUserRole(response.role);

      return response;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password');
      return null;
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
      localStorage.setItem('userId', response.uuid);
      localStorage.setItem('userName', response.name);
      localStorage.setItem('userRole', response.role);
      setToken(response.accessToken);
      setUserName(response.name);
      setUserRole(response.role);
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
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setToken(null);
    setUserName('');
    setUserRole('');
  };

  return { isAuthenticated, token, userName, userRole, loading, error, login, register, logout };
}