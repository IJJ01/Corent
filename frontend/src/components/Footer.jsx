import "../styles/userFooter.css";
export default function Footer() {
    return (
        <footer className="footerDark">
            <div className="footerWrap">
                {/* Brand */}
                <div>
                    <div className="footerBrand">
                        <div className="footerMark" />
                        <div className="footerTitle">CoRent</div>
                    </div>
                    <p className="footerText">
                        CoRent helps tenants and owners manage shared living with clarity, trust, and professional workflows.
                    </p>
                </div>

                {/* Contact */}
                <div>
                    <div className="footerHeading">Contact</div>
                    <ul className="footerList">
                        <li>
                            <a className="footerLink" href="mailto:support@corent.com">
                                support@corent.com
                            </a>
                        </li>
                        <li>
                            <a className="footerLink" href="tel:+212600000000">
                                +212 6 00 00 00 00
                            </a>
                        </li>
                        <li className="footerText">Morocco · Casablanca</li>
                    </ul>
                </div>

                {/* Social */}
                <div>
                    <div className="footerHeading">Social</div>
                    <ul className="footerList">
                        <li>
                            <a className="footerLink" href="#" target="_blank" rel="noreferrer">
                                LinkedIn
                            </a>
                        </li>
                        <li>
                            <a className="footerLink" href="#" target="_blank" rel="noreferrer">
                                X (Twitter)
                            </a>
                        </li>
                        <li>
                            <a className="footerLink" href="#" target="_blank" rel="noreferrer">
                                Instagram
                            </a>
                        </li>
                    </ul>
                    <p className="footerText" style={{ marginTop: 10 }}>
                        Follow product updates and community news.
                    </p>
                </div>
            </div>

            <div className="footerBottom">
                <div>© {new Date().getFullYear()} CoRent. All rights reserved.</div>
                <div>Shared living — simple, secure, professional.</div>
            </div>
        </footer>
    );
}
