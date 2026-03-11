// src/services/auth.services.ts
import { fetchLink } from "../Components/fetchComponent";
import axios from "axios";

/* ---------------------------------- */
/* API Response Wrapper */
/* ---------------------------------- */

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/* ---------------------------------- */
/* Global Login */
/* ---------------------------------- */

export interface GlobalLoginPayload {
  Global_User_ID: string;
  Password: string;
}

export interface GlobalLoginResponse {
  Autheticate_Id: string;
  Web_Api: string;
  LOGIN_URL: string;
  Name: string;
  Global_User_ID: number;
}

/* ---------------------------------- */
/* Company Types */
/* ---------------------------------- */

export interface CompanyResponse {
  Company_Name: string;
  Local_Id: number;
  Global_Id: number;
  Web_Api: string;
  Global_User_ID: string;
  username: string;
  password: string;
}

/* ---------------------------------- */
/* User Types */
/* ---------------------------------- */

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

/* ---------------------------------- */
/* Fetch Companies */
/* ---------------------------------- */

export async function fetchCompanies(
  username: string
): Promise<CompanyResponse[]> {

  const data = await fetchLink<ApiResponse<CompanyResponse[]>>({
    address: `authorization/userPortal/accounts?username=${username}`,
    autoHeaders: false
  });

  if (!data?.success) {
    throw new Error(data?.message || "Company fetch failed");
  }

  return data.data || [];
}

/* ---------------------------------- */
/* Global Login */
/* ---------------------------------- */

export async function globalLogin(
  payload: GlobalLoginPayload
): Promise<GlobalLoginResponse> {

  const data = await fetchLink<ApiResponse<GlobalLoginResponse>>({
    address: `authorization/userPortal/login`,
    method: "POST",
    bodyData: payload,
    autoHeaders: false
  });

  if (!data?.success) {
    throw new Error(data?.message || "Login failed");
  }

  return data.data;
}

/* ---------------------------------- */
/* Get User By Auth */
/* ---------------------------------- */

export const getUserByAuth = async (
  auth: string,
  companyApi?: string
): Promise<FullUser> => {

  let apiBase = companyApi || localStorage.getItem("COMPANY_API");

  if (!apiBase) {
    throw new Error("Company API missing.");
  }

  apiBase = apiBase.trim().replace(/\/$/, "");

  const response = await axios.get<ApiResponse<FullUser[]>>(
    `${apiBase}/api/authorization/userAuth`,
    {
      headers: {
        Authorization: auth
      }
    }
  );

  const data = response.data;

  if (!data?.success || !data?.data?.length) {
    throw new Error(data?.message || "User not found");
  }

  return data.data[0];
};