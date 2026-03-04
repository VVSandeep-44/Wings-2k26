export default function ContactSection() {
    return (
        <section className="contact" id="contact">
            <h2 className="section-title">Contact Us</h2>
            <div className="contact-container">
                <div className="contact-info">
                    <div className="contact-item">
                        <i className="fas fa-envelope"></i>
                        <p>princengg@pydah.edu.in</p>
                    </div>
                    <div className="contact-item">
                        <i className="fas fa-phone"></i>
                        <p>+91 73824 56539</p>
                    </div>
                    <div className="contact-item">
                        <i className="fas fa-map-pin"></i>
                        <p>Pydah Green Campus, Patavala - 533461</p>
                    </div>
                </div>
                <div className="social-links">
                    <a href="https://www.instagram.com/pydahgroupkakinada" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-instagram"></i>
                    </a>
                    <a href="https://www.facebook.com/PydahCollegeOfEngineering/" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-facebook"></i>
                    </a>
                    <a href="https://www.linkedin.com/in/pydah-college-of-engineering-502748250/" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-linkedin"></i>
                    </a>
                    <a href="https://www.youtube.com/channel/UCidXtnOrV8j76ETiWuubaDg" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-youtube"></i>
                    </a>
                </div>
            </div>
        </section>
    );
}
