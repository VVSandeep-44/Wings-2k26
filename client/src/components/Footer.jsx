export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-top">
                <div className="footer-col footer-brand">
                    <img src="/assets/Wingslogo.png" alt="WINGS 2k26" className="footer-logo" />
                    <p className="footer-tagline">
                        Annual Technical &amp; Cultural Fest of Pydah College of Engineering &amp; Technology, Kakinada.
                    </p>
                </div>

                <div className="footer-col">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#about">About</a></li>
                        <li><a href="#events">Events</a></li>
                        <li><a href="#registration">Register</a></li>
                        <li><a href="#contact">Contact</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Contact</h4>
                    <ul>
                        <li><i className="fas fa-envelope"></i> wings2k26@pydah.edu.in</li>
                        <li><i className="fas fa-map-pin"></i> Pydah Green Campus, Patavala</li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Follow Us</h4>
                    <div className="footer-socials">
                        <a href="https://www.instagram.com/pydahgroupkakinada" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://www.facebook.com/PydahCollegeOfEngineering/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <i className="fab fa-facebook"></i>
                        </a>
                        <a href="https://www.linkedin.com/in/pydah-college-of-engineering-502748250/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                            <i className="fab fa-linkedin"></i>
                        </a>
                        <a href="https://www.youtube.com/channel/UCidXtnOrV8j76ETiWuubaDg" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                            <i className="fab fa-youtube"></i>
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-divider" />

            <div className="footer-bottom">
                <p>
                    &copy; 2026 WINGS 2k26 &mdash; Pydah College of Engineering &amp; Technology. All Rights Reserved.
                </p>
                <p className="footer-made-with">
                    Made with <i className="fas fa-heart"></i> by PCET Students
                </p>
            </div>
        </footer>
    );
}
