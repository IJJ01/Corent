import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const MOCK_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";

export default function ProtectedRoute({ children }) {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (MOCK_BYPASS) return children;

  if (!isAuthed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return children;
}
