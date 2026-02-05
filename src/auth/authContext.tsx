// src/auth/authContext.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getUserByAuth } from "../services/auth.services";

export type User = {
  id: number;
  uniqueName: string;
  Name?: string | null;
  Company_Name?: string | null;
  companyId?: number | null;
  Global_User_Id?: string;
};

export type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isInitializing: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 🔄 Load user on page refresh
  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem("AUTH_ID");
      const storedUser = localStorage.getItem("user");
      const companyApi = localStorage.getItem("COMPANY_API");

      if (storedToken && companyApi) {
        setToken(storedToken);

        try {
          // Fetch latest full user info from backend
          const fullUser = await getUserByAuth(storedToken);
          setUser({
            id: fullUser.UserId,
            uniqueName: fullUser.UserName,
            Name: fullUser.Name,
            companyId: fullUser.Company_id || undefined,
            Company_Name: fullUser.Company_Name || undefined,
            Global_User_Id: fullUser.Autheticate_Id || storedToken,
          });

          // Update localStorage
          localStorage.setItem("user", JSON.stringify(fullUser));
        } catch (err) {
          console.error("Failed to fetch user on init:", err);
          localStorage.clear();
        }
      } else if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        localStorage.clear();
      }

      setIsInitializing(false);
    };

    init();
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);

    localStorage.setItem("AUTH_ID", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("AUTH_ID");
    localStorage.removeItem("COMPANY_API");
    localStorage.removeItem("user");
  }, []);

  const value = useMemo(
    () => ({ user, token, login, logout, isInitializing }),
    [user, token, login, logout, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
