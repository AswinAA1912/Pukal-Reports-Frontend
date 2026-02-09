// src/services/auth.services.ts
import { getHostAPI } from "../config/portalBaseURL";

// Payload we send to backend
export interface GlobalLoginPayload {
  Global_User_ID: string;
  Password: string;
}

export interface GlobalLoginData {
  Web_Api: string;
  Autheticate_Id: string;
  Name: string;
}

// Response returned from backend
export interface GlobalLoginResponse {
  Autheticate_Id: string;
  Web_Api: string;
  LOGIN_URL: string;
  Name: string;
  Global_User_ID: number;
  data: GlobalLoginData;
}

// Company interface for Step 2
export interface Company {
  Local_Id: number;
  Global_Id: number;
  Company_Name: string;
  Global_User_Id: number;
}

export interface CompanyResponse {
  Company_Name: string,
  Local_Id: string,
  Global_Id: number,
  Web_Api: string,
  Global_User_ID: string,
  username: string,
  password: string,
}

export type FullUser = {
  UserTypeId: number;
  UserId: number;
  UserName: string;
  BranchId: number | null;
  Company_id: number | null;
  Name: string;
  UserType: string;
  BranchName?: string;
  Company_Name?: string;
  Autheticate_Id: string;
};


// Fetch companies mapped to username
export async function fetchCompanies(username: string): Promise<CompanyResponse[]> {
  const res = await fetch(`https://erpsmt.in/api/authorization/userPortal/accounts?username=${username}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch companies");
  return data.data || [];
}

// Call globalLogin API
export async function globalLogin(
  payload: GlobalLoginPayload
): Promise<GlobalLoginResponse> {
  const res = await fetch(
    `${getHostAPI()}authorization/userPortal/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (!res.ok) throw new Error(data.message || "Login failed");

  return data.data as GlobalLoginResponse;
}

export const getUserByAuth = async (auth: string): Promise<FullUser> => {
  const COMPANY_API = localStorage.getItem("COMPANY_API");

  if (!COMPANY_API) {
    throw new Error("Company API missing. Please login again.");
  }

  // Normalize base URL
  let apiBase = COMPANY_API.trim();
  if (apiBase.endsWith("/")) {
    apiBase = apiBase.slice(0, -1);
  }

  // IMPORTANT: use company API directly
  const url = `${apiBase}/api/authorization/userAuth`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: auth, 
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "User not found");
  }

  return data.data[0];
};














