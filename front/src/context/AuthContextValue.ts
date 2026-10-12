import { createContext, useContext } from 'react';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types';

export type AuthContextValue = {
	isAuthenticated: boolean;
	token: string | null;
	userName: string;
	userRole: string;
	lockedUntil: string | null;
	attemptsRemaining: number | null;
	loading: boolean;
	error: string | null;
	login: (data: LoginRequest) => Promise<LoginResponse | null>;
	register: (data: RegisterRequest) => Promise<boolean>;
	verify2fa: (tempToken: string, code: number) => Promise<boolean>;
	logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}
