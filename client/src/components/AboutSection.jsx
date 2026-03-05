export default function AboutSection() {
    return (
        <section className="about" id="about">
            <h2 className="section-title">About WINGS 2026</h2>
            <div className="about-content">
                <p>
                    WINGS 2026 is the most anticipated annual event of our college,
                    bringing together students from all Pydah Campuses to showcase their
                    talents, skills, and creativity.
                </p>
                <p>
                    This two-day extravaganza features competitions, cultural
                    performances, and networking opportunities that transform students
                    into future leaders.
                </p>

                <div className="college-promo" aria-label="College promotion">
                    <div className="college-logo-box" role="img" aria-label="Pydah College logo">
                        <img src="/assets/pydah-college.jpeg" alt="Pydah College" />
                    </div>
                    <div className="college-promo-content">
                        <h3>Pydah College of Engineering</h3>
                        <p>
                            Proudly hosting WINGS 2k26 with a vibrant campus culture, innovation-led learning,
                            and opportunities that shape future leaders.
                        </p>
                        <div className="promo-tags">
                            <span>NAAC-aligned Quality</span>
                            <span>Innovation Ecosystem</span>
                            <span>Career-focused Training</span>
                        </div>
                        <a
                            className="college-cta"
                            href="https://www.pydah.edu.in"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Visit College Website
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
