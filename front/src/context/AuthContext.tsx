import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import { AuthContext } from './AuthContextValue';
import type { AuthContextValue } from './AuthContextValue';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types';

type AuthErrorResponse = {
	error?: string;
	message?: string;
	lockedUntil?: string;
	attemptsRemaining?: number;
};

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
		const timer = window.setTimeout(() => {
			setLockedUntil(null);
			localStorage.removeItem('lockedUntil');
			setError(null);
		}, Math.max(ms, 0));
		return () => window.clearTimeout(timer);
	}, [lockedUntil]);

	useEffect(() => {
		const handleStorage = () => setAuthState(readAuthState());
		window.addEventListener('storage', handleStorage);
		return () => window.removeEventListener('storage', handleStorage);
	}, []);

	const persistAuth = useCallback((response: Exclude<LoginResponse, { twoFactorRequired: true }>) => {
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
	}, []);


	const login = useCallback(async (data: LoginRequest): Promise<LoginResponse | null> => {
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
		} catch (err: unknown) {
			const apiError = isAxiosError<AuthErrorResponse>(err) ? err : undefined;
			const status = apiError?.response?.status;
			const serverError = apiError?.response?.data?.error || apiError?.response?.data?.message;
			const serverLockedUntil = apiError?.response?.data?.lockedUntil;
			const attemptsRemaining = apiError?.response?.data?.attemptsRemaining;
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
	}, [persistAuth]);

	const verify2fa = useCallback(async (tempToken: string, code: number) => {
		setLoading(true);
		setError(null);
		try {
			const response = await authApi.verify2fa(tempToken, code);
			persistAuth(response);
			return true;
		} catch (err: unknown) {
			const apiError = isAxiosError<AuthErrorResponse>(err) ? err : undefined;
			const status = apiError?.response?.status;
			const serverError = apiError?.response?.data?.error || apiError?.response?.data?.message;
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
	}, [persistAuth]);

	const register = useCallback(async (data: RegisterRequest) => {
		setLoading(true);
		setError(null);
		try {
			const response = await authApi.register(data);
			persistAuth(response);
			return true;
		} catch (err: unknown) {
			const apiError = isAxiosError<AuthErrorResponse>(err) ? err : undefined;
			const status = apiError?.response?.status;
			const serverError = apiError?.response?.data?.error || apiError?.response?.data?.message;
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
	}, [persistAuth]);

	const logout = useCallback(() => {
		console.warn('AuthContext.logout() called — clearing local auth state', { time: new Date().toISOString() });
		(window as Window & { __copilot_lastLogoutStack?: string }).__copilot_lastLogoutStack = new Error().stack;
		console.trace();
		localStorage.removeItem('token');
		localStorage.removeItem('userId');
		localStorage.removeItem('userName');
		localStorage.removeItem('userRole');
		localStorage.removeItem('lockedUntil');
		setLockedUntil(null);
		setError(null);
		setAuthState({ token: null, userName: '', userRole: '', lockedUntil: null });
	}, []);

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
	}), [token, userName, userRole, lockedUntil, attemptsRemaining, loading, error, login, register, verify2fa, logout]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
