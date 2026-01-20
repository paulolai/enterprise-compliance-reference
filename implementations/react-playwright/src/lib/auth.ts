// Simple auth context for React components
import React from 'react';

export interface User {
  name: string;
  tenureYears: number;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Local auth client that mimics a real auth provider
export class AuthClient {
  private static instance: AuthClient;
  private state: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
  };
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Try to load from localStorage
    this.loadFromStorage();
  }

  static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  getState(): AuthState {
    return { ...this.state };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  async login(email: string, password: string): Promise<AuthState> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.state = {
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
    };

    this.saveToStorage();
    this.notify();
    return this.getState();
  }

  async register(email: string, name: string, password: string): Promise<AuthState> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    this.state = {
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
    };

    this.saveToStorage();
    this.notify();
    return this.getState();
  }

  logout(): void {
    this.state = {
      user: null,
      token: null,
      isAuthenticated: false,
    };

    this.clearStorage();
    this.notify();
  }

  private saveToStorage() {
    localStorage.setItem('auth_user', JSON.stringify(this.state.user));
    localStorage.setItem('auth_token', this.state.token || '');
  }

  private loadFromStorage() {
    try {
      const userStr = localStorage.getItem('auth_user');
      const token = localStorage.getItem('auth_token');

      if (userStr && userStr !== 'null') {
        const user = JSON.parse(userStr);
        this.state = {
          user,
          token,
          isAuthenticated: !!user,
        };
      }
    } catch (e) {
      console.warn('Failed to load auth from storage:', e);
    }
  }

  private clearStorage() {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }
}

// Singleton instance
export const authClient = AuthClient.getInstance();

// React hook for auth
export function useAuth() {
  const [state, setState] = React.useState(authClient.getState());

  React.useEffect(() => {
    return authClient.subscribe(() => setState(authClient.getState()));
  }, []);

  return {
    ...state,
    login: authClient.login.bind(authClient),
    register: authClient.register.bind(authClient),
    logout: authClient.logout.bind(authClient),
  };
}
