import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import EventsSection from '../components/EventsSection';
import RegistrationSection from '../components/RegistrationSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import { checkHealth } from '../services/api';

export default function HomePage() {
    useEffect(() => {
        // Warm up the server on page load
        checkHealth();

        // Initialize Sentry browser SDK if configured
        const sentryDsn = import.meta.env.VITE_SENTRY_BROWSER_DSN;
        if (sentryDsn) {
            const script = document.createElement('script');
            script.src = 'https://browser.sentry-cdn.com/8.33.0/bundle.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                if (window.Sentry) {
                    window.Sentry.init({
                        dsn: sentryDsn,
                        environment: window.location.hostname.includes('localhost')
                            ? 'development'
                            : 'production',
                        tracesSampleRate: 0.1,
                    });
                }
            };
            document.head.appendChild(script);
        }

        const revealSelector = [
            '.section-title',
            '.about-content > p',
            '.college-promo',
            '.event-card',
            '.registration-deadline-inline',
            '.registration-closed-inline',
            '.form-container',
            '.contact-item',
            '.social-links a',
            'footer p',
            '.event-details',
            '.countdown-item',
            '.cta-button',
        ].join(', ');

        const markedElements = new Set();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
        );

        const markRevealTargets = () => {
            const targets = document.querySelectorAll(revealSelector);
            targets.forEach((element, index) => {
                if (markedElements.has(element)) return;
                markedElements.add(element);
                element.classList.add('reveal-on-scroll');
                element.style.setProperty('--reveal-delay', `${(index % 6) * 70}ms`);
                observer.observe(element);
            });
        };

        markRevealTargets();
        const delayedRefresh = setTimeout(markRevealTargets, 450);

        return () => {
            clearTimeout(delayedRefresh);
            observer.disconnect();
        };
    }, []);

    return (
        <>
            <Navbar />
            <HeroSection />
            <div className="mid-sections-bg">
                <div className="mid-sections-bg-layer" aria-hidden="true" />
                <AboutSection />
                <EventsSection />
                <RegistrationSection />
                <ContactSection />
            </div>
            <Footer />
        </>
    );
}
