import axios from "axios";
import { authStore } from "../auth/store";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
