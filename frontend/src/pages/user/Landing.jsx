import { Link, useNavigate } from "react-router-dom";
import heroImg from "./hero_img.png";
import houseOwner from "./houseowner.png";


export default function Landing() {
  const navigate = useNavigate();


  return (
    <div className="landing-container">
      <div className="landing-nav">
        <div className="logo">CoRent</div>
        <div className="landing-links">
          <Link to="/Browse">Browse homes</Link>
          <Link to="/create">List a property</Link>
          <a href="#features">Why CoRent?</a>
        </div>
        <div className="landing-actions">
          <button
            className="btn ghost-btn"
            type="button"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </button>
        </div>
      </div>
      <div className="landing-hero">
        <img src={heroImg} alt="Coliving Illustration" />
        <div className="landing-hero-Left">
          <h1 className="landing-headline">
            Find a Home<span className="accent-dot">.</span>
            <br />
            Find Roommates<span className="accent-dot">.</span>
          </h1>
          <div className="landing-subline">
            A platform for
            <br />
            shared housing,
            <br />
            roommate matching,
            <br />
            and easier renting.
          </div>

          <div className="landing-hero-cta">
            <button
              className="btn btn--cta"
              type="button"
              onClick={() => navigate("/Browse")}
            >
              Find a home
            </button>
            <button
              className="btn btn--cta"
              type="button"
              onClick={() => navigate("/create")}
            >
              List a property
            </button>
          </div>
        </div>
      </div>
      <div className="landing-value">
        <p>
          10,000+
          <br />
          <span className="underLabel">Homes</span>
        </p>
        <p>
          25,000+
          <br />
          <span className="underLabel">Tenants</span>
        </p>
        <p>
          3,500+
          <br />
          <span className="underLabel">Homeowners</span>
        </p>
        <p>
          40+
          <br />
          <span className="underLabel">Cities</span>
        </p>
      </div>
      <div className="landing-tenant-cta">
        <div className="page-title">
          Ready to find your <br /> next home?
        </div>
        <div className="page-undertext">
          <span className="accent-words">Discover</span> available houses,
          <br />
          find compatible roommates,
          <br />
          and apply to the <span className="accent-words">home</span>
          <br />
          that fits you<span className="accent-dot">.</span>
        </div>
        <div className="landing-hero-cta">
          <button
            className="btn btn--cta"
            type="button"
            onClick={() => navigate("/Browse")}
          >
            Browse Listings
          </button>
        </div>
      </div>
      <div className="landing-renter-cta">
        <div className="landing-graphic">
          <img src={houseOwner} alt="List your property" />
        </div>
        <div className="landing-renter-cta-text">
          <div className="page-title">
            Have a Property
            <br /> to Rent?
          </div>
          <div className="page-undertext">
            <span className="accent-words">List</span> your property,
            <br />
            <span className="accent-words">reach</span> potential tenants,
            <br />
            and <span className="accent-words">manage</span> applications
            <br />
            all in <span className="accent-words">one place</span>.
          </div>
          <div className="landing-hero-cta">
            <button
              className="btn btn--cta"
              type="button"
              onClick={() => navigate("/create")}
            >
              Create Listing
            </button>
          </div>
        </div>
      </div>

      <div className="landing-features">
        <div className="page-title" id="features">
          Why CoRent?
        </div>
        <div className="feature-content">
          <div className="feature-lot">
            <div className="iconBox"></div>
            <div className="feature-text">
              <span className="feature-text-title">Roommate Matching</span>
              <br />
              We match you with roommates who actually fit
              <br />
              your lifestyle, budget, and daily habits.
            </div>
          </div>
          <div className="feature-lot">
            <div className="iconBox"></div>
            <div className="feature-text">
              <span className="feature-text-title">
                Verified Listings & Profiles
              </span>
              <br />
              Every property and user goes through verification,
              <br />
              so you know who you're renting from or to.
            </div>
          </div>
          <div className="feature-lot">
            <div className="iconBox"></div>
            <div className="feature-text">
              <span className="feature-text-title">
                Secure Applications & Payments
              </span>
              <br />
              Submit applications, sign agreements, and handle
              <br />
              rent payments, all encrypted, all in one place.
            </div>
          </div>
          <div className="feature-lot">
            <div className="iconBox"></div>
            <div className="feature-text">
              <span className="feature-text-title">In-App Messaging</span>
              <br />
              Message landlords, tenants, or roommates directly
              <br />
              on CoRent, no need to share contact info early.
            </div>
          </div>
        </div>
      </div>

      <div className="lading-closure-cta">
        <div className="brandOverlay">
          CORENTCORENTCORENT
          <br />
          CORENTCORENTCORENT
        </div>
        <div className="landing-closure-content">
          <div className="closure-headline">What are you waiting for?</div>
          <div className="closure-cta landing-hero-cta">
            <button
              className="btn btn--cta"
              type="button"
              onClick={() => navigate("/Browse")}
            >
              Find a home
            </button>
            <button
              className="btn btn--cta"
              type="button"
              onClick={() => navigate("/create")}
            >
              List a property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
