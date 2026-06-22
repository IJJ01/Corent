import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

export default function Login() {
  const { login, loginMock } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const nav = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const out = await apiPost("/auth/login", { email, password });
      const data = out?.data;

      // 🚨 Validate backend response

      // 1️⃣ persist auth data
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user.user_id);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("is_admin", data.user.is_admin ? "1" : "0");

      // 2️⃣ update auth context (THIS WAS MISSING)
      login({
        token: data.access_token,
        user: data.user,
      });

      setMsg({ type: "ok", text: "Signed in successfully." });

      // 3️⃣ redirect
      if (data.user.is_admin) {
        nav("/admin/overview", { replace: true });
      } else {
        const redirectTo = location.state?.from || "/browse";
        nav(redirectTo, { replace: true });
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      const msgFromApi =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Login failed. Please try again.";

      setMsg({
        type: "err",
        text: msgFromApi,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPage">
      <div className="authCard">
        <h1 className="logo">CoRent</h1>
        <div className="textSection">
        <h1 className="authTitle">Welcome back</h1>
        <p className="authSubtitle">
          New to CoRent?
          <span>
            <Link to="/signup">Create an account</Link>
          </span>
        </p>
       </div>
        <form onSubmit={handleSubmit} className="authForm">
          {msg && (
            <div className={msg.type === "err" ? "error" : "success"}>
              {msg.text}
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label>Password</label>
              <div className="authLinks">
            <Link to="/reset-password">Forgot password?</Link>
          </div>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn--solid" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="divider">
            <span>or</span>
          </div>

          <button className="btn btn--ghost">
            <i class="fa-brands fa-google"></i>
            <span>Continue with Google</span>
          </button>
        </form>
      </div>
    </div>
  );
}
