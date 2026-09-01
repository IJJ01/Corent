import "../styles/userFooter.css";
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="logo">CoRent</div>
          <div className="footer-text">
            Find a home.
            <br />
            Find roommates.
            <br />
            Find your place.
          </div>
          <div className="footer-socials">
            <i className="fa-brands fa-square-linkedin"></i>
            <i className="fa-brands fa-instagram"></i>
            <i className="fa-brands fa-x-twitter"></i>
          </div>
        </div>
        <div className="footer-right">
          <div className="footer-column">
            <p className="footer-column-title">Company</p>
            <div className="footer-column-links">
              <a href="http://">About</a>
              <a href="http://">Careers</a>
              <a href="http://">Contact us</a>
            </div>
          </div>
          <div className="footer-column">
            <p className="footer-column-title">Legal</p>
            <div className="footer-column-links">
              <a href="http://">Privacy policy</a>
              <a href="http://">Terms of service</a>
              <a href="http://">Code of conduct</a>
            </div>
          </div>
        </div>
      </div>
      <div className="copyright">© 2026 CoRent. All rights reserved.</div>
    </footer>
  );
}
