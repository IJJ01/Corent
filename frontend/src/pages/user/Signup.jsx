import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../../api/client";
import defaultAvatar from "../../assets/default-avatar.jpg";

export default function Signup() {
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 3;

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

  function nextStep() {
    setMsg(null);
    if (step === 1) {
      if (!firstName || !lastName || !birthDate || !cin) {
        setMsg({
          type: "err",
          text: "Please fill in all fields before continuing.",
        });
        return;
      }
    }
    if (step === 2) {
      if (!email || !phoneNumber || !adress || !city) {
        setMsg({
          type: "err",
          text: "Please fill in all fields before continuing.",
        });
        return;
      }
    }
    setStep((s) => s + 1);
  }

  function prevStep() {
    setMsg(null);
    setStep((s) => s - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);

    if (password !== confirmPassword) {
      setMsg({ type: "err", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
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

  const stepLabels = ["Personal info", "Contact & location", "Password"];

  return (
    <div className="authPage">
      <div className="authCard signupCard">
        {/* Header */}
        <div className="textSection">
          <h1 className="logo">CoRent</h1>
          <h1 className="authTitle">Create your account</h1>
          <div className="helpRow">
            <Link to="/login" className="linkMuted">
              Already have an account? <span>Sign in</span>
            </Link>
          </div>
        </div>

        {/* Step indicator */}

        {/* Form */}
        <form onSubmit={handleSubmit} className="formGrid">
          {msg?.type === "ok" && <div className="success">{msg.text}</div>}
          {msg?.type === "err" && <div className="error">{msg.text}</div>}

          {/* Step 1 — Personal info */}
          {step === 1 && (
            <div className="stepFields">
              <div className="formRow">
                <div className="field">
                  <label className="label">First name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Last name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="formRow">
                <div className="field">
                  <label className="label">CIN</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. AB123456"
                    value={cin}
                    onChange={(e) => setCin(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Birth date</label>
                  <input
                    className="input"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Contact & location */}
          {step === 2 && (
            <div className="stepFields">
              <div className="formRow">
                <div className="field">
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="label">Phone number</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="+212..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Address</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Street, building, etc."
                  value={adress}
                  onChange={(e) => setAdress(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label">City</label>
                <input
                  className="input"
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Password */}
          {step === 3 && (
            <div className="stepFields">
              <div className="field">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <p className="authSubtitle">
            Step {step} of {TOTAL_STEPS} - {stepLabels[step - 1]}
          </p>

          {/* Navigation buttons */}
          <div className="stepActions">
            {step > 1 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={prevStep}
              >
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className="btn btn--solid stepNext"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn--solid stepNext"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create account"}
              </button>
            )}
          </div>
        </form>
        <div className="stepIndicator">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`stepDot ${step > i + 1 ? "stepDot--done" : ""} ${step === i + 1 ? "stepDot--active" : ""}`}
              />
            ))}
          </div>
      </div>
    </div>
  );
}
