import { useEffect, useRef } from 'react';

const features = [
    { icon: 'fas fa-music', title: 'Cultural Events', description: 'Music, Dance, Drama & More' },
    { icon: 'fas fa-lightbulb', title: 'Innovation', description: 'Hackathons & Tech Events' },
    { icon: 'fas fa-trophy', title: 'Competitions', description: 'Amazing Prizes' },
];

export default function AboutSection() {
    const featuresRef = useRef(null);

    useEffect(() => {
        const el = featuresRef.current;
        if (!el || el.dataset.marqueeReady === 'true') return;

        const cards = Array.from(el.querySelectorAll('.feature-box'));
        if (cards.length === 0) return;

        const track = document.createElement('div');
        track.className = 'features-track';

        cards.forEach((card) => track.appendChild(card));
        cards.forEach((card) => {
            const clone = card.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        });

        el.appendChild(track);
        el.dataset.marqueeReady = 'true';
    }, []);

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

                <div className="features" ref={featuresRef}>
                    {features.map((feature) => (
                        <div className="feature-box" key={feature.title}>
                            <i className={feature.icon}></i>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
