// src/config/api.ts
import axios from "axios";
import baseURL from "./portalBaseURL";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default api;
