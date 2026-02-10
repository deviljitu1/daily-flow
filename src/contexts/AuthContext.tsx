import React, { createContext, useContext, useState, useCallback } from 'react';
import { User } from '@/types';
import { seedEmployees } from '@/data/seed';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wt_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string): boolean => {
    const employees: User[] = JSON.parse(
      localStorage.getItem('wt_employees') || JSON.stringify(seedEmployees)
    );
    const found = employees.find(e => e.email === email && e.password === password);
    if (found && found.isActive) {
      setUser(found);
      localStorage.setItem('wt_user', JSON.stringify(found));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('wt_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
