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
    <div className="authWrap">
      <div className="authShell">
        <div className="authGrid">
          {/* Left */}
          <div className="authLeft">
            <div className="authTop">
              <div className="authBrand">
                <div className="authMark" />
                <div style={{ fontWeight: 900 }}>CoRent</div>
              </div>
              <Link to="/" className="linkMuted">Back to home</Link>
            </div>

            <div>
              <h1 className="authTitle">Sign in to CoRent</h1>
              <p className="authSubtitle">
                Access your shared living space with a secure, professional login.
              </p>
            </div>

            <div className="authCard">
              <form onSubmit={handleSubmit} className="formGrid">
                {msg?.type === "ok" && <div className="notice">{msg.text}</div>}
                {msg?.type === "err" && <div className="error">{msg.text}</div>}

                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="authActions">
                  <button className="btn btn--primary" type="submit" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </button>

                  {import.meta.env.VITE_USE_MOCK === "true" && (
                    <button
                      type="button"
                      className="btn"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        loginMock({ userId: "u1", token: "mock-token" });
                        nav("/my-listings", { replace: true });
                      }}
                    >
                      Dev Login (Mock User)
                    </button>
                  )}

                  <div className="helpRow">
                    <Link to="/signup" className="linkMuted">
                      Create an account
                    </Link>
                    <Link to="/reset-password" className="linkMuted">
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right */}
          <div className="authRight">
            <img
              src="https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1600&q=80"
              alt="Modern apartment living"
            />
            <div className="authOverlay" />
            <div className="authRightText">
              <h3>Trusted shared living</h3>
              <p>
                Designed for clarity and reliability between tenants and owners — from discovery to application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
