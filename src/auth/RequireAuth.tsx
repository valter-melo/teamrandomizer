import { Navigate } from "react-router-dom";
import { authStore } from "./store";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = authStore.getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
