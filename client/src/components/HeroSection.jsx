import { useState, useEffect } from 'react';

const EVENT_START_DATE = '2026-03-13T09:00:00+05:30';

export default function HeroSection() {
    const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
    const [isLive, setIsLive] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        const eventDate = new Date(EVENT_START_DATE).getTime();

        const update = () => {
            const now = Date.now();
            const distance = eventDate - now;

            if (distance <= 0) {
                setIsLive(true);
                return;
            }

            setTimeLeft({
                days: String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0'),
                hours: String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0'),
                minutes: String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0'),
                seconds: String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0'),
            });
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="hero" id="home">
            <video
                className={`hero-bg-video${isVideoReady ? ' ready' : ''}`}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster="/assets/jpg wings.jpeg"
                aria-hidden="true"
                onLoadedData={() => setIsVideoReady(true)}
                onError={() => setIsVideoReady(true)}
            >
                <source src="/assets/herobg.optimized.mp4" type="video/mp4" />
            </video>
            <div className="hero-content">
                <h1>
                    <span className="hero-title-stack">
                        <span className="hero-title-wrap">
                            <img
                                className="hero-title-image"
                                src="/assets/Wingslogo.png"
                                alt="WINGS 2k26"
                                loading="eager"
                                fetchPriority="high"
                                decoding="async"
                                width="900"
                                height="390"
                            />
                        </span>
                        <span className="hero-title-bottom">2026</span>
                    </span>
                </h1>
                <p className="tagline">Spread Your Wings &amp; Fly High!</p>

                <div className="event-details">
                    <p><i className="fas fa-calendar-alt"></i> March 13-14, 2026</p>
                    <p><i className="fas fa-map-marker-alt"></i> Pydah College of Engineering</p>
                    <p><i className="fas fa-users"></i> Biggest College Event of the Year</p>
                </div>

                {isLive ? (
                    <div className="countdown" id="countdown">
                        <p className="countdown-live">WINGS 2026 is live now!</p>
                    </div>
                ) : (
                    <div className="countdown" id="countdown">
                        <div className="countdown-item">
                            <span>{timeLeft.days}</span>
                            <small>Days</small>
                        </div>
                        <div className="countdown-item">
                            <span>{timeLeft.hours}</span>
                            <small>Hours</small>
                        </div>
                        <div className="countdown-item">
                            <span>{timeLeft.minutes}</span>
                            <small>Minutes</small>
                        </div>
                        <div className="countdown-item">
                            <span>{timeLeft.seconds}</span>
                            <small>Seconds</small>
                        </div>
                    </div>
                )}

                <a href="#register" className="cta-button">Register Now</a>
            </div>
        </section>
    );
}
