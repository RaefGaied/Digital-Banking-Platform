import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { LoginRequest, RegisterRequest } from '../types';

type AuthContextValue = {
	isAuthenticated: boolean;
	token: string | null;
	userName: string;
	userRole: string;
	lockedUntil: string | null;
	attemptsRemaining: number | null;
	loading: boolean;
	error: string | null;
	login: (data: LoginRequest) => Promise<any | null>;
	register: (data: RegisterRequest) => Promise<boolean>;
	verify2fa: (tempToken: string, code: number) => Promise<boolean>;
	logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readAuthState() {
	return {
		token: localStorage.getItem('token'),
		userName: localStorage.getItem('userName') || '',
		userRole: localStorage.getItem('userRole') || '',
		lockedUntil: localStorage.getItem('lockedUntil'),
	};
}

function setLockUntil(lockedUntilValue: string | null) {
	if (lockedUntilValue) {
		localStorage.setItem('lockedUntil', lockedUntilValue);
	} else {
		localStorage.removeItem('lockedUntil');
	}
}

function getDefaultLockUntil(minutes = 30) {
	return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [{ token, userName, userRole, lockedUntil: storedLockedUntil }, setAuthState] = useState(readAuthState);
	const [lockedUntil, setLockedUntil] = useState<string | null>(storedLockedUntil);
	const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Auto-clear lock state when the lockedUntil time expires
	useEffect(() => {
		if (!lockedUntil) return;
		const expiry = new Date(lockedUntil).getTime();
		const now = Date.now();
		const ms = expiry - now;
		if (ms <= 0) {
			setLockedUntil(null);
			localStorage.removeItem('lockedUntil');
			setError(null);
			return;
		}
		const timer = window.setTimeout(() => {
			setLockedUntil(null);
			localStorage.removeItem('lockedUntil');
			setError(null);
		}, ms);
		return () => window.clearTimeout(timer);
	}, [lockedUntil]);

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
		localStorage.removeItem('lockedUntil');
		setLockedUntil(null);
		setAttemptsRemaining(null);
		setError(null);
		setAuthState({
			token: response.accessToken,
			userName: response.name,
			userRole: response.role,
			lockedUntil: null,
		});
	};


	const login = async (data: LoginRequest) => {
		setLoading(true);
		setError(null);
		try {
			const response = await authApi.login(data);
			// If backend indicates 2FA is required it will return a shape like { twoFactorRequired: true, tempToken }
			if (response && response.twoFactorRequired) {
				return response; // let caller show 2FA UI
			}
			// otherwise persist tokens
			persistAuth(response);
			return response;
		} catch (err: any) {
			const status = err?.response?.status;
			const serverError = err?.response?.data?.error || err?.response?.data?.message;
			const serverLockedUntil = err?.response?.data?.lockedUntil;
			const attemptsRemaining = err?.response?.data?.attemptsRemaining;
			const shouldLock = status === 423 || attemptsRemaining === 0;
			if (status === 401) {
				if (shouldLock) {
					const nextLockedUntil = serverLockedUntil || getDefaultLockUntil();
					setLockedUntil(nextLockedUntil);
					setLockUntil(nextLockedUntil);
					setAttemptsRemaining(0);
					setError(serverError || 'Account locked — try again later');
				} else {
					setLockedUntil(null);
					setLockUntil(null);
					setAttemptsRemaining(typeof attemptsRemaining === 'number' ? attemptsRemaining : null);
					setError(serverError || 'Invalid email or password');
				}
			} else if (status === 423) {
				const nextLockedUntil = serverLockedUntil || getDefaultLockUntil();
				setLockedUntil(nextLockedUntil);
				setLockUntil(nextLockedUntil);
				setAttemptsRemaining(0);
				setError(serverError || 'Account locked — try again later');
			} else if (status === 429) {
				setLockedUntil(null);
				setLockUntil(null);
				setAttemptsRemaining(null);
				setError('Too many attempts — try again later');
			} else if (serverError) {
				setLockedUntil(null);
				setLockUntil(null);
				setAttemptsRemaining(null);
				setError(serverError);
			} else {
				setLockedUntil(null);
				setLockUntil(null);
				setAttemptsRemaining(null);
				setError('Invalid email or password');
			}
			return null;
		} finally {
			setLoading(false);
		}
	};

	const verify2fa = async (tempToken: string, code: number) => {
		setLoading(true);
		setError(null);
		try {
			const response = await authApi.verify2fa(tempToken, code);
			persistAuth(response);
			return true;
		} catch (err: any) {
			const status = err?.response?.status;
			const serverError = err?.response?.data?.error || err?.response?.data?.message;
			if (status === 401) {
				setError('Invalid two-factor authentication code');
			} else if (serverError) {
				setError(serverError);
			} else {
				setError('Invalid two-factor authentication code');
			}
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
			persistAuth(response);
			return true;
		} catch (err: any) {
			const status = err?.response?.status;
			const serverError = err?.response?.data?.error || err?.response?.data?.message;
			if (status === 409) {
				setError('An account with this email already exists');
			} else if (serverError) {
				setError(serverError);
			} else {
				setError('Error creating account');
			}
			return false;
		} finally {
			setLoading(false);
		}
	};

	const logout = () => {
		console.warn('AuthContext.logout() called — clearing local auth state', { time: new Date().toISOString() });
		try { (window as any).__copilot_lastLogoutStack = new Error().stack; } catch (e) {}
		console.trace();
		localStorage.removeItem('token');
		localStorage.removeItem('userId');
		localStorage.removeItem('userName');
		localStorage.removeItem('userRole');
		localStorage.removeItem('lockedUntil');
		setLockedUntil(null);
		setError(null);
		setAuthState({ token: null, userName: '', userRole: '', lockedUntil: null });
	};

	const value = useMemo<AuthContextValue>(() => ({
		isAuthenticated: !!token,
		token,
		userName,
		userRole,
		lockedUntil,
		attemptsRemaining,
		loading,
		error,
		login,
		verify2fa,
		register,
		logout,
	}), [token, userName, userRole, lockedUntil, attemptsRemaining, loading, error]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
