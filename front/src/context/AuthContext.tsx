import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';

type AuthContextValue = {
	isAuthenticated: boolean;
	token: string | null;
	userName: string;
	userRole: string;
	loading: boolean;
	error: string | null;
	login: (data: LoginRequest) => Promise<Awaited<ReturnType<typeof authApi.login>> | null>;
	register: (data: RegisterRequest) => Promise<boolean>;
	logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAuthState() {
	return {
		token: localStorage.getItem('token'),
		userName: localStorage.getItem('userName') || '',
		userRole: localStorage.getItem('userRole') || '',
	};
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [{ token, userName, userRole }, setAuthState] = useState(readAuthState);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleStorage = () => setAuthState(readAuthState());
		window.addEventListener('storage', handleStorage);
		return () => window.removeEventListener('storage', handleStorage);
	}, []);

	const persistAuth = (response: Awaited<ReturnType<typeof authApi.login>>) => {
		localStorage.setItem('token', response.accessToken);
		localStorage.setItem('userId', response.uuid);
		localStorage.setItem('userName', response.name);
		localStorage.setItem('userRole', response.role);
		setAuthState({
			token: response.accessToken,
			userName: response.name,
			userRole: response.role,
		});
	};

	const login = async (data: LoginRequest) => {
		setLoading(true);
		setError(null);
		try {
			const response = await authApi.login(data);
			persistAuth(response);
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
			persistAuth(response);
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
		setAuthState({ token: null, userName: '', userRole: '' });
	};

	const value = useMemo<AuthContextValue>(() => ({
		isAuthenticated: !!token,
		token,
		userName,
		userRole,
		loading,
		error,
		login,
		register,
		logout,
	}), [token, userName, userRole, loading, error]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
