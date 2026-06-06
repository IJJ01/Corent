import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const LS_TOKEN = "co_rent_token";
const LS_USER_ID = "co_rent_user_id";

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");

  // 🔁 Load from localStorage once (on refresh)
  useEffect(() => {
    const t = localStorage.getItem(LS_TOKEN) || "";
    const u = localStorage.getItem(LS_USER_ID) || "";
    setToken(t);
    setUserId(u);
  }, []);

  // ✅ REAL LOGIN (USED BY Login.jsx)
  const login = ({ token, user }) => {
    const t = String(token || "").trim();
    const uid = String(user?.user_id || "").trim();

    if (!t || !uid) {
      console.warn("login() called without token or user_id");
      return;
    }

    // persist (keep your existing keys)
    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_USER_ID, uid);

    // also keep these for api/http.js compatibility
    localStorage.setItem("access_token", t);
    localStorage.setItem("user_id", uid);
    localStorage.setItem("user", JSON.stringify(user));

    setToken(t);
    setUserId(uid);
  };

  // 🧪 MOCK LOGIN (DEV ONLY – unchanged)
  const loginMock = ({ userId, token }) => {
    const uid = String(userId || "").trim();
    const t = String(token || "").trim();

    localStorage.setItem(LS_TOKEN, t);
    localStorage.setItem(LS_USER_ID, uid);
    localStorage.setItem("access_token", t);
    localStorage.setItem("user_id", uid);

    setToken(t);
    setUserId(uid);
  };

  const logout = () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user");
    localStorage.removeItem("is_admin");

    setToken("");
    setUserId("");
  };

  const value = useMemo(
    () => ({
      token,
      userId,
      // keep your convenience shape
      user: userId ? { id: userId } : null,
      isAuthed: Boolean(token && userId),
      login,       // ✅ NOW EXISTS
      loginMock,
      logout,
    }),
    [token, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
