import { http } from "./http";

export type AuthResponse = { token: string; tenantId: string; userId: string; role: string };

export async function registerTenant(payload: {
  tenantName: string;
  adminName: string;
  email: string;
  password: string;
}) {
  const { data } = await http.post<AuthResponse>("/auth/register-tenant", payload);
  return data;
}

export async function login(payload: { tenantId: string; email: string; password: string }) {
  const { data } = await http.post<AuthResponse>("/auth/login", payload);
  return data;
}