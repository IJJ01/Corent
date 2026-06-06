import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../../api/client";
import defaultAvatar from "../../assets/default-avatar.jpg";


export default function Signup() {
  // Required by proto
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cin, setCin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [adress, setAdress] = useState("");
  const [city, setCity] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (password !== confirmPassword) {
      setMsg({ type: "err", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      // EXACT field names as proto
      const payload = {
        email,
        password,
        phone_number: phoneNumber,
        CIN: cin,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        profile_pic_url: defaultAvatar,
        adress,
        city,
      };

      const out = await apiPost("/auth/signup", payload);

      if (out?.data?.ok) {
        setMsg({
          type: "ok",
          text: "Account created successfully. You can sign in now.",
        });
      } else {
        setMsg({
          type: "err",
          text: out?.data?.message || "Unable to create account.",
        });
      }
    } catch (err) {
      setMsg({ type: "err", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authWrap">
      <div className="authShell">
        <div className="authGrid">
          {/* Left: Form */}
          <div className="authLeft">
            <div className="authTop">
              <div className="authBrand">
                <div className="authMark" />
                <div style={{ fontWeight: 900 }}>CoRent</div>
              </div>
              <Link to="/" className="linkMuted">
                Back to home
              </Link>
            </div>

            <div>
              <h1 className="authTitle">Create your CoRent account</h1>
              <p className="authSubtitle">
                A professional onboarding experience built for trust, clarity, and shared living.
              </p>
            </div>

            <div className="authCard">

              <form onSubmit={handleSubmit} className="formGrid">
                {msg?.type === "ok" && <div className="notice">{msg.text}</div>}
                {msg?.type === "err" && <div className="error">{msg.text}</div>}
                {/* Name */}
                <div className="formRow2">
                  <div>
                    <label className="label">First name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Last name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="formRow2">
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
                    <label className="label">Phone number</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="+212..."
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Identity + birth */}
                <div className="formRow2">
                  <div>
                    <label className="label">CIN</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="CIN"
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Birth date</label>
                    <input
                      className="input"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="label">Address</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Street, building, etc."
                    value={adress}
                    onChange={(e) => setAdress(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">City</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>



                {/* Passwords */}
                <div className="formRow2">
                  <div>
                    <label className="label">Password</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Confirm password</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="authActions">
                  <button className="btn btn--accent" type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create account"}
                  </button>

                  <div className="helpRow">
                    <Link to="/login" className="linkMuted">
                      Already have an account? Sign in
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Image */}
          <div className="authRight">
            <img
              src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80"
              alt="Bright modern apartment interior"
            />
            <div className="authOverlay" />
            <div className="authRightText">
              <h3>Professional shared rentals</h3>
              <p>Join a platform designed to connect tenants with reliable property owners.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
