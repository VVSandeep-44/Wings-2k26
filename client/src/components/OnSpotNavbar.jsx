import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function OnSpotNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const closeMenu = () => {
        setMenuOpen(false);
    };

    return (
        <nav
            ref={navRef}
            className={scrolled ? 'scrolled' : ''}
            style={{
                background: '#181c2f',
                borderBottom: '2px solid #ff2d95',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                zIndex: 1200,
            }}
        >
            <a href="#onspot-dashboard" className="logo" onClick={closeMenu}>
                <img src="/assets/pydah-logo.jpeg" alt="Pydah Logo" />
            </a>
            <button
                className="menu-toggle"
                id="menuToggle"
                aria-label="Toggle navigation"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
            >
                <i className={menuOpen ? 'fas fa-times' : 'fas fa-bars'}></i>
            </button>
            <ul className={`nav-links${menuOpen ? ' open' : ''}`}>
                <li><a href="#onspot-dashboard" onClick={closeMenu}>On-Spot Dashboard</a></li>
                <li><Link to="/online-verification" onClick={closeMenu}>Online Verification</Link></li>
            </ul>
        </nav>
    );
}
