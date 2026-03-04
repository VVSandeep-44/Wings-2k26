import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
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
        <nav ref={navRef} className={scrolled ? 'scrolled' : ''}>
            <a href="#home" className="logo">
                <i className="fas fa-feather-alt"></i> WINGS 2026
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
                <li><a href="#home" onClick={closeMenu}>Home</a></li>
                <li><a href="#about" onClick={closeMenu}>About</a></li>
                <li><a href="#register" onClick={closeMenu}>Register</a></li>
                <li><a href="#contact" onClick={closeMenu}>Contact</a></li>
            </ul>
        </nav>
    );
}
