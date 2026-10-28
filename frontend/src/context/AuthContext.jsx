import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('ao04_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ao04_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(username, password);
      const authToken = data.access_token;
      const authUser = data.user || {
        username,
        role: 'admin',
      };

      localStorage.setItem('ao04_token', authToken);
      localStorage.setItem('ao04_user', JSON.stringify(authUser));

      setToken(authToken);
      setUser(authUser);
      return authUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ao04_token');
    localStorage.removeItem('ao04_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token);
  const role = user?.role || 'viewer';
  const isAdmin = role === 'admin';
  const isOperator = role === 'operator' || role === 'admin';
  const isViewer = Boolean(role);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        isAuthenticated,
        role,
        isAdmin,
        isOperator,
        isViewer,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
