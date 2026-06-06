import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/default-avatar.jpg";
import { apiGet, apiPut, apiUploadAvatar } from "../../api/client";



function fmtDate(d = new Date()) {
    try {
        return d.toLocaleDateString("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    } catch {
        return String(d);
    }
}

//added
function fmtDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}




function Icon({ name }) {
    // simple inline icons (clean, no library)
    const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
    const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

    if (name === "grid")
        return (
            <svg {...common}>
                <path {...stroke} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
            </svg>
        );

    if (name === "user")
        return (
            <svg {...common}>
                <path {...stroke} d="M20 21a8 8 0 1 0-16 0" />
                <path {...stroke} d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
            </svg>
        );

    if (name === "bell")
        return (
            <svg {...common}>
                <path {...stroke} d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path {...stroke} d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        );

    if (name === "search")
        return (
            <svg {...common}>
                <path {...stroke} d="M21 21l-4.3-4.3" />
                <path {...stroke} d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" />
            </svg>
        );

    if (name === "settings")
        return (
            <svg {...common}>
                <path
                    {...stroke}
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                />
                <path
                    {...stroke}
                    d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6H10l-.4 2.6a7.3 7.3 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 0 0 1.7 1l.4 2.6h4.2l.4-2.6a7.3 7.3 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z"
                />
            </svg>
        );



    if (name === "logout")
        return (
            <svg {...common}>
                <path {...stroke} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path {...stroke} d="M16 17l5-5-5-5" />
                <path {...stroke} d="M21 12H9" />
            </svg>
        );

    return null;
}

export default function Profile() {
    const nav = useNavigate();

    const token = localStorage.getItem("access_token") || "";
    const userId = localStorage.getItem("user_id") || "";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [editing, setEditing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState("");

    const [pwOpen, setPwOpen] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwMsg, setPwMsg] = useState(null);

    const [pw, setPw] = useState({
        old_password: "",
        new_password: "",
        confirm_password: "",
    });



    const [form, setForm] = useState({
        user_id: userId,
        email: "",
        phone_number: "",
        CIN: "",
        first_name: "",
        last_name: "",
        birth_date: "",
        profile_pic_url: "",
        adress: "",
        city: "",
    });

    function setPwField(k, v) {
        setPw((p) => ({ ...p, [k]: v }));
    }


    function setField(k, v) {
        setForm((p) => ({ ...p, [k]: v }));
    }

    useEffect(() => {
        if (!token || !userId) {
            nav("/login");
            return;
        }

        (async () => {
            setLoading(true);
            setMsg(null);
            try {
                const out = await apiGet("/me");
                console.log("PROFILE_RAW:", out);
                console.log("PROFILE_DATA:", out?.data);


                if (out?.data?.ok === false) {
                    setMsg({ type: "err", text: out?.data?.message || "Unable to load profile." });
                } else {
                    //const u = out?.data || {};
                    const u = out?.data?.user || {};

                    //added
                    setLastUpdate(u.edited_at || u.updated_at || "");


                    setForm((p) => ({
                        ...p,
                        user_id: u.user_id || userId,

                        email: u.email ?? p.email,
                        phone_number: u.phone_number ?? u.phone ?? p.phone_number,
                        CIN: u.CIN ?? u.cin ?? p.CIN,

                        first_name: u.first_name ?? p.first_name,
                        last_name: u.last_name ?? p.last_name,

                        birth_date: u.birth_date ?? u.birthDate ?? p.birth_date,
                        profile_pic_url: u.profile_pic_url ?? p.profile_pic_url,

                        adress: u.adress ?? u.address ?? p.adress,
                        city: u.city ?? p.city,
                    }));

                }
            } catch {
                setMsg({ type: "err", text: "Network error. Please try again." });
            } finally {
                setLoading(false);
            }
        })();
    }, [nav, token, userId]);

    async function handleSave(e) {
        e.preventDefault();
        setMsg(null);
        setSaving(true);

        try {
            const payload = {
                ...form,
                profile_pic_url: form.profile_pic_url || "",
                address: form.adress,
            };

            const out = await apiPut("/me", payload);

            if (out?.data?.ok) {
                setMsg({ type: "ok", text: "Profile updated successfully." });
                setEditing(false);
            } else {
                setMsg({ type: "err", text: out?.data?.message || "Update failed." });
            }
        } catch {
            setMsg({ type: "err", text: "Network error. Please try again." });
        } finally {
            setSaving(false);
        }
    }

    function handleLogout() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        nav("/login");
    }

    // ADDED FOR CHANGE PASSWORD
    async function handleChangePassword(e) {
        e.preventDefault();
        setPwMsg(null);

        if (!pw.old_password || !pw.new_password) {
            setPwMsg({ type: "err", text: "Please fill all fields." });
            return;
        }
        if (pw.new_password.length < 8) {
            setPwMsg({ type: "err", text: "New password must be at least 8 characters." });
            return;
        }
        if (pw.new_password !== pw.confirm_password) {
            setPwMsg({ type: "err", text: "Passwords do not match." });
            return;
        }

        setPwSaving(true);
        try {
            // TODO: implement this route later in API gateway
            const out = await apiPut("/api/users/change-password", {
                old_password: pw.old_password,
                new_password: pw.new_password,
            });

            if (out?.data?.ok) {
                setPwMsg({ type: "ok", text: out?.data?.message || "Password updated successfully." });
                setPw({ old_password: "", new_password: "", confirm_password: "" });

                // close after a short moment
                setTimeout(() => setPwOpen(false), 700);
            } else {
                setPwMsg({ type: "err", text: out?.data?.message || "Unable to update password." });
            }
        } catch {
            setPwMsg({ type: "err", text: "Network error. Please try again." });
        } finally {
            setPwSaving(false);
        }
    }







    const avatarSrc = form.profile_pic_url || defaultAvatar;
    const fullName = `${form.first_name || ""} ${form.last_name || ""}`.trim() || "Your Profile";

    return (
        <div className="profilePage">
            <div className="profileShell">
                {/* Sidebar */}
                <aside className="profileSidebar">
                    {/* DIR HNA ROUTE DYAL LISTINGS */}
                    <Link to="/listings" className="sbItem" title="Listings">
                        <Icon name="grid" />
                    </Link>
                    <div className="sbItem sbItem--active" title="Profile">
                        <Icon name="user" />
                    </div>


                    {/* 🔧 Settings (Change password) */}
                    <button
                        className={`sbItem ${pwOpen ? "sbItem--active" : ""}`}
                        title="Security"
                        type="button"
                        onClick={() => setPwOpen(true)}
                    >
                        <Icon name="settings" />
                    </button>

                    <div className="sbItem" title="Notifications">
                        <Icon name="bell" />
                    </div>

                    <div className="sbSpacer" />

                    <button className="sbItem sbLogout" onClick={handleLogout} title="Logout" type="button">
                        <Icon name="logout" />
                    </button>
                </aside>

                {/* Main */}
                <main className="profileMain">
                    {/* Top bar */}
                    <div className="profileTop">
                        <div className="profileWelcome">
                            <h2>Your Profile</h2>
                            <p>
                                <span style={{ opacity: 0.7 }}>Your last update : </span>
                                {fmtDateTime(lastUpdate)}{" "}
                            </p>

                        </div>

                        <div className="profileTopRight">


                            {/* <button className="iconBtn" type="button" title="Notifications">
                                <Icon name="bell" />
                            </button> */}



                            <img className="topAvatar" src={avatarSrc} alt="Avatar" />
                        </div>
                    </div>

                    {/* Banner strip */}
                    <div className="profileBanner" />

                    {/* Main card */}
                    <div className="profileCard">
                        <div className="profileHeaderRow">
                            <div className="profileIdentity">
                                <img className="profileAvatar" src={avatarSrc} alt="Profile avatar" />
                                <div>
                                    <h3 className="profileName">{fullName}</h3>
                                    <p className="profileEmail">{form.email || "—"}</p>
                                </div>
                            </div>

                            <button
                                className="editBtn"
                                type="button"
                                onClick={() => setEditing((v) => !v)}
                                disabled={loading}
                            >
                                {editing ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        <div className="profileCardBody">
                            {loading ? (
                                <div className="smallNote">Loading profile…</div>
                            ) : (
                                <form onSubmit={handleSave}>
                                    <div className="form2col">
                                        <div className="field">
                                            <div className="fieldLabel">First name</div>
                                            <input
                                                className="fieldInput"
                                                value={form.first_name}
                                                onChange={(e) => setField("first_name", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">Last name</div>
                                            <input
                                                className="fieldInput"
                                                value={form.last_name}
                                                onChange={(e) => setField("last_name", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">Email</div>
                                            <input className="fieldInput" value={form.email} disabled />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">Phone number</div>
                                            <input
                                                className="fieldInput"
                                                value={form.phone_number}
                                                onChange={(e) => setField("phone_number", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">CIN</div>
                                            <input
                                                className="fieldInput"
                                                value={form.CIN}
                                                onChange={(e) => setField("CIN", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">Birth date</div>
                                            <input
                                                className="fieldInput"
                                                type="date"
                                                value={form.birth_date || ""}
                                                onChange={(e) => setField("birth_date", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">City</div>
                                            <input
                                                className="fieldInput"
                                                value={form.city}
                                                onChange={(e) => setField("city", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field">
                                            <div className="fieldLabel">Address</div>
                                            <input
                                                className="fieldInput"
                                                value={form.adress}
                                                onChange={(e) => setField("adress", e.target.value)}
                                                disabled={!editing}
                                            />
                                        </div>

                                        <div className="field" style={{ gridColumn: "1 / -1" }}>
                                            <div className="fieldLabel">Profile picture</div>

                                            <input
                                                className="fieldInput"
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                disabled={!editing}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setMsg(null);
                                                    try {
                                                        const up = await apiUploadAvatar(file);
                                                        if (up?.data?.ok && up?.data?.url) {
                                                            setField("profile_pic_url", up.data.url);
                                                            setMsg({ type: "ok", text: "Avatar uploaded. Don’t forget to save changes." });
                                                        } else {
                                                            setMsg({ type: "err", text: up?.data?.message || "Upload failed." });
                                                        }
                                                    } catch {
                                                        setMsg({ type: "err", text: "Network error while uploading." });
                                                    }
                                                }}
                                            />

                                            <div className="smallNote">
                                                Upload JPG/PNG/WEBP (max 3MB). The image URL will be saved in your profile.
                                            </div>
                                        </div>

                                    </div>

                                    {msg?.type === "ok" && (
                                        <div style={{ marginTop: 12 }} className="notice">
                                            {msg.text}
                                        </div>
                                    )}
                                    {msg?.type === "err" && (
                                        <div style={{ marginTop: 12 }} className="error">
                                            {msg.text}
                                        </div>
                                    )}

                                    {editing && (
                                        <div className="profileActionsRow">
                                            <button className="btnSoft" type="button" onClick={() => setEditing(false)}>
                                                Cancel
                                            </button>
                                            <button className="btnSave" type="submit" disabled={saving}>
                                                {saving ? "Saving..." : "Save changes"}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>

                    {/* added for change password */}
                    {pwOpen && (
                        <div
                            className="modalOverlay"
                            onClick={() => setPwOpen(false)}
                            role="presentation"
                        >
                            <div
                                className="modalCard"
                                onClick={(e) => e.stopPropagation()}
                                role="dialog"
                                aria-modal="true"
                            >
                                <div className="modalHeader">
                                    <div>
                                        <h3 style={{ margin: 0 }}>Change password</h3>
                                        <p style={{ margin: "6px 0 0", opacity: 0.7, fontSize: 13 }}>
                                            Enter your current password and choose a new one.
                                        </p>
                                    </div>

                                    <button className="iconBtn" type="button" onClick={() => setPwOpen(false)} title="Close">
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleChangePassword} className="modalBody">
                                    <div className="field">
                                        <div className="fieldLabel">Current password</div>
                                        <input
                                            className="fieldInput"
                                            type="password"
                                            value={pw.old_password}
                                            onChange={(e) => setPwField("old_password", e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="field">
                                        <div className="fieldLabel">New password</div>
                                        <input
                                            className="fieldInput"
                                            type="password"
                                            value={pw.new_password}
                                            onChange={(e) => setPwField("new_password", e.target.value)}
                                        />
                                    </div>

                                    <div className="field">
                                        <div className="fieldLabel">Confirm new password</div>
                                        <input
                                            className="fieldInput"
                                            type="password"
                                            value={pw.confirm_password}
                                            onChange={(e) => setPwField("confirm_password", e.target.value)}
                                        />
                                    </div>

                                    {pwMsg?.type === "ok" && <div className="notice" style={{ marginTop: 10 }}>{pwMsg.text}</div>}
                                    {pwMsg?.type === "err" && <div className="error" style={{ marginTop: 10 }}>{pwMsg.text}</div>}

                                    <div className="modalActions">
                                        <button className="btnSoft" type="button" onClick={() => setPwOpen(false)}>
                                            Cancel
                                        </button>
                                        <button className="btnSave" type="submit" disabled={pwSaving}>
                                            {pwSaving ? "Saving..." : "Update password"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}




                </main>
            </div>
        </div>
    );
}
