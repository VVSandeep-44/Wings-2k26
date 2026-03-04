import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
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
    }, []);

    return (
        <>
            <Navbar />
            <HeroSection />
            <div className="mid-sections-bg">
                <AboutSection />
                <RegistrationSection />
                <ContactSection />
            </div>
            <Footer />
        </>
    );
}
