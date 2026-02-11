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
import { toast } from "react-toastify";

export type User = {
  id: number;
  uniqueName: string;
  Name?: string | null;
  Company_Name?: string | null;
  companyId?: number | null;
  Global_User_Id?: string;
};

export type Company = {
  id: number;
  name: string;
  api: string;
};

export type AuthContextType = {
  user: User | null;
  token: string | null;
  companies: Company[];
  login: (token: string, user: User, companies: Company[], companyApi?: string) => void;
  logout: () => void;
  switchCompany: (company: Company) => Promise<void>;
  isInitializing: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load user & companies on page refresh
useEffect(() => {
  const init = async () => {
    const storedToken = localStorage.getItem("AUTH_ID");
    const storedUser = localStorage.getItem("user");
    const storedCompanies = localStorage.getItem("companies");
    const storedCompanyApi = localStorage.getItem("COMPANY_API");

    // Restore token
    if (storedToken) setToken(storedToken);

    // Restore companies
    if (storedCompanies) setCompanies(JSON.parse(storedCompanies));

    // Restore user from storage first
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Try fetching fresh user data if token + company API exist
    if (storedToken && storedCompanyApi) {
      try {
        const fullUser = await getUserByAuth(storedToken);
        if (fullUser && fullUser.UserId) {
          const formattedUser: User = {
            id: fullUser.UserId,
            uniqueName: fullUser.UserName,
            Name: fullUser.Name,
            companyId: fullUser.Company_id || undefined,
            Company_Name: fullUser.Company_Name || undefined,
            Global_User_Id: fullUser.Autheticate_Id || storedToken,
          };
          setUser(formattedUser);
          localStorage.setItem("user", JSON.stringify(formattedUser));
        }
      } catch (err) {
        console.warn("Failed to fetch user, keeping stored user:", err);
      }
    }

    setIsInitializing(false);
  };

  init();
}, []);

  // Login function
  const login = useCallback(
    (newToken: string, newUser: User, userCompanies: Company[], companyApi?: string) => {
      setToken(newToken);
      setUser(newUser);
      setCompanies(userCompanies);

      localStorage.setItem("AUTH_ID", newToken);
      localStorage.setItem("user", JSON.stringify(newUser));
      localStorage.setItem("companies", JSON.stringify(userCompanies));

      if (companyApi) localStorage.setItem("COMPANY_API", companyApi);
    },
    []
  );

  // Logout function
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setCompanies([]);
    localStorage.removeItem("AUTH_ID");
    localStorage.removeItem("COMPANY_API");
    localStorage.removeItem("user");
    localStorage.removeItem("companies");
  }, []);

  // Switch company function
  const switchCompany = useCallback(
    async (company: Company) => {
      if (!user) return;

      try {
        localStorage.setItem("COMPANY_API", company.api);

        const updatedUser: User = {
          ...user,
          companyId: company.id,
          Company_Name: company.name,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        toast.success(`Switched to company: ${company.name}`);
      } catch (err) {
        console.error("Failed to switch company:", err);
        toast.error("Failed to switch company. Please try again.");
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, token, companies, login, logout, switchCompany, isInitializing }),
    [user, token, companies, login, logout, switchCompany, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
