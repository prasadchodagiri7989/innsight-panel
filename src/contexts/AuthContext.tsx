import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, getStoredUser, storeUser, clearTokens, setTokens, getAccessToken, type User } from "@/lib/api";

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(!!getAccessToken());

  useEffect(() => {
    if (!getAccessToken()) { setIsLoading(false); return; }
    authApi.me()
      .then((res) => { setUser(res.data); storeUser(res.data); })
      .catch(() => { clearTokens(); setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { user: u, accessToken, refreshToken } = res.data;
    if (u.role !== 'admin' && u.role !== 'receptionist') {
      throw new Error('Access denied. Admin or Receptionist account required.');
    }
    setTokens(accessToken, refreshToken);
    storeUser(u);
    setUser(u);
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
