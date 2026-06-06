import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiPost } from "../../api/client";

function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
    const nav = useNavigate();
    const q = useQuery();
    const token = q.get("token") || "";

    const [email, setEmail] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirm, setConfirm] = useState("");

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const tokenMode = !!token;

    async function handleSendLink(e) {
        e.preventDefault();
        setMsg(null);
        setLoading(true);

        try {
            const out = await apiPost("/api/auth/forget-password", { email });

            if (out?.data?.ok) {
                setMsg({
                    type: "ok",
                    text: out?.data?.message || "If this email exists, a reset link was sent.",
                });
            } else {
                setMsg({ type: "err", text: out?.data?.message || "Unable to send reset link." });
            }
        } catch {
            setMsg({ type: "err", text: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    }

    async function handleReset(e) {
        e.preventDefault();
        setMsg(null);

        if (newPass.length < 8) {
            setMsg({ type: "err", text: "Password must be at least 8 characters." });
            return;
        }
        if (newPass !== confirm) {
            setMsg({ type: "err", text: "Passwords do not match." });
            return;
        }

        setLoading(true);
        try {
            const out = await apiPost("/api/auth/reset-password", {
                token,
                new_password: newPass,
            });

            if (out?.data?.ok) {
                setMsg({ type: "ok", text: out?.data?.message || "Password updated. You can login now." });
                setTimeout(() => nav("/login", { replace: true }), 800);
            } else {
                setMsg({ type: "err", text: out?.data?.message || "Reset failed." });
            }
        } catch {
            setMsg({ type: "err", text: "Network error. Please try again." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authWrap">
            <div className="authShell">
                <div className="authGrid">
                    <div className="authLeft">
                        <div className="authTop">
                            <div className="authBrand">
                                <div className="authMark" />
                                <div style={{ fontWeight: 900 }}>CoRent</div>
                            </div>
                            <Link to="/" className="linkMuted">Back to home</Link>
                        </div>

                        <div>
                            <h1 className="authTitle">{tokenMode ? "Set a new password" : "Reset your password"}</h1>
                            <p className="authSubtitle">
                                {tokenMode
                                    ? "Enter your new password."
                                    : "Enter your email and we will send you a reset link."}
                            </p>
                        </div>

                        <div className="authCard">
                            {msg?.type === "ok" && <div className="notice">{msg.text}</div>}
                            {msg?.type === "err" && <div className="error">{msg.text}</div>}

                            {!tokenMode ? (
                                <form onSubmit={handleSendLink} className="formGrid">
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

                                    <div className="authActions">
                                        <button className="btn btn--primary" type="submit" disabled={loading}>
                                            {loading ? "Sending..." : "Send reset link"}
                                        </button>

                                        <div className="helpRow">
                                            <Link to="/login" className="linkMuted">Back to sign in</Link>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleReset} className="formGrid">
                                    <div>
                                        <label className="label">New password</label>
                                        <input
                                            className="input"
                                            type="password"
                                            placeholder="New password"
                                            value={newPass}
                                            onChange={(e) => setNewPass(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label">Confirm password</label>
                                        <input
                                            className="input"
                                            type="password"
                                            placeholder="Confirm password"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="authActions">
                                        <button className="btn btn--primary" type="submit" disabled={loading}>
                                            {loading ? "Updating..." : "Update password"}
                                        </button>

                                        <div className="helpRow">
                                            <Link to="/login" className="linkMuted">Back to sign in</Link>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    <div className="authRight">
                        <img
                            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80"
                            alt="Comfortable home"
                        />
                        <div className="authOverlay" />
                        <div className="authRightText">
                            <h3>Secure recovery</h3>
                            <p>We send a time-limited reset link to your email.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
