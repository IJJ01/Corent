import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="container">
      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <div className="brand__mark" />
            <div className="brand__name">CoRent</div>
          </div>

          <div className="ctaRow" style={{ marginTop: 0 }}>
            <Link to="/login" className="btn btn--secondary">
              Log in
            </Link>
            <Link to="/signup" className="btn btn--primary">
              Sign up
            </Link>
          </div>
        </div>

        <div className="hero">
          <div className="heroLeft">
            <div className="heroText">
              <h1 className="h1">Co-renting made simple, secure, and professional.</h1>
              <p className="p">
                CoRent connects tenants looking for shared housing with property owners offering well-managed colocation
                spaces. Built to reduce friction and increase trust — from discovery to application.
              </p>
              <p className="p">
                Find compatible roommates, track availability, and communicate transparently — all in one platform.
              </p>
            </div>

            <div className="heroMeta">
              <span className="pill">Verified profiles</span>
              <span className="pill">Clear applications</span>
              <span className="pill">Owner–tenant transparency</span>
            </div>

            <div className="ctaRow heroCtas">
              <Link to="/signup" className="btn btn--accent">
                Create an account
              </Link>
              <Link to="/login" className="btn btn--secondary">
                I already have an account
              </Link>
            </div>
          </div>


          <div className="imageStack">
            <div className="imageCard">
              <img
                src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"
                alt="Shared apartment living"
              />
            </div>

            <div className="imageCard">
              <img
                src="https://images.unsplash.com/photo-1554995207-c18c203602cb"
                alt="Roommates in shared living space"
              />
            </div>

            <div className="imageCard">
              <img
                src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"
                alt="Modern shared apartment"
              />
            </div>
          </div>

        </div>

        <div className="section">
          <h3 style={{ margin: "0 0 8px", color: "var(--navy)" }}>Who is CoRent for?</h3>
          <p className="p">
            CoRent is designed to serve both sides of colocation — tenants looking for a safe shared home,
            and owners who want a structured way to manage shared rentals.
          </p>

          <div className="audienceGrid">
            {/* TENANTS */}
            <div className="audienceCard">
              <div className="audienceMedia">
                <img
                  src="https://images.unsplash.com/photo-1524758631624-e2822e304c36"
                  alt="Roommates in a shared living space"
                />
              </div>
              <div className="audienceBody">
                <div className="audienceTag">
                  <span className="dot" /> For tenants
                </div>
                <h4 className="audienceTitle">Find compatible roommates and quality shared homes</h4>
                <p className="p">
                  Browse trusted listings, present a strong profile, and apply with clarity — without friction.
                </p>
                <ul className="audienceList">
                  <li>Safer profiles and clearer expectations</li>
                  <li>Simple application flow and availability tracking</li>
                  <li>More transparent communication with owners</li>
                </ul>
              </div>
            </div>

            {/* OWNERS */}
            <div className="audienceCard">
              <div className="audienceMedia">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa"
                  alt="Property management and shared housing"
                />
              </div>
              <div className="audienceBody">
                <div className="audienceTag">
                  <span className="dot" /> For owners
                </div>
                <h4 className="audienceTitle">Manage colocation professionally and reduce risk</h4>
                <p className="p">
                  Review applications efficiently, keep the process organized, and maintain a reliable tenant experience.
                </p>
                <ul className="audienceList">
                  <li>Structured review of candidates and requests</li>
                  <li>Clear status updates and reduced back-and-forth</li>
                  <li>Better tenant matching for shared living</li>
                </ul>
              </div>
            </div>
          </div>
        </div>


        <div className="section">
          <h3 style={{ margin: "0 0 8px", color: "var(--navy)" }}>Trust & reliability</h3>
          <p className="p">
            CoRent is built for real-world property rentals and shared living — where trust, privacy, and consistent workflows
            matter. We design the platform to feel professional for owners and safe for tenants.
          </p>

          <div className="trustGrid">
            <div className="trustCards">
              <div className="trustCard">
                <div className="trustHeaderRow">
                  <span className="iconCircle" aria-hidden="true">🔒</span>
                  <h4 className="trustTitle" style={{ margin: 0 }}>Security-first access</h4>
                </div>
                <p className="p">
                  Authentication and access boundaries are designed to protect accounts and reduce risk across the rental process
                  — from application to profile management.
                </p>
              </div>

              <div className="trustCard">
                <div className="trustHeaderRow">
                  <span className="iconCircle" aria-hidden="true">🛡️</span>
                  <h4 className="trustTitle" style={{ margin: 0 }}>Data protection & privacy</h4>
                </div>
                <p className="p">
                  We follow privacy-minded practices: minimal exposure of sensitive information, clear handling of user data, and
                  a platform structure that supports reliable growth.
                </p>
              </div>

              <div className="trustCard">
                <div className="trustHeaderRow">
                  <span className="iconCircle" aria-hidden="true">✅</span>
                  <h4 className="trustTitle" style={{ margin: 0 }}>Reliable rental workflows</h4>
                </div>
                <p className="p">
                  Applications, availability, and communication stay structured. This helps tenants make decisions faster and
                  owners manage colocation professionally with less back-and-forth.
                </p>
              </div>
            </div>

            <div className="trustMedia trustMedia3">
              <div className="trustImage">
                <img
                  src="https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1400&q=80"
                  alt="Modern apartment living"
                />
              </div>

              <div className="trustImage">
                <img
                  src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80"
                  alt="Modern housing interior for rent"
                />
              </div>

              <div className="trustImage">
                <img
                  src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80"
                  alt="Urban rental home and real estate"
                />
              </div>
            </div>
          </div>

          <div className="footerNote">
            <strong>CoRent</strong> — Helping people rent and share homes with confidence.
          </div>
        </div>


      </div>
    </div>
  );
}
