import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PageLoader from './components/PageLoader';

function App() {
    const [showLoader, setShowLoader] = useState(true);
    const [loaderFadingOut, setLoaderFadingOut] = useState(false);
    const [showSite, setShowSite] = useState(false);

    useEffect(() => {
        let fadeTimeout;
        let removeTimeout;

        const startFadeOut = () => {
            fadeTimeout = window.setTimeout(() => {
                setLoaderFadingOut(true);
                setShowSite(true);
                removeTimeout = window.setTimeout(() => {
                    setShowLoader(false);
                }, 420);
            }, 1700);
        };

        if (document.readyState === 'complete') {
            startFadeOut();
        } else {
            window.addEventListener('load', startFadeOut, { once: true });
        }

        return () => {
            window.removeEventListener('load', startFadeOut);
            if (fadeTimeout) window.clearTimeout(fadeTimeout);
            if (removeTimeout) window.clearTimeout(removeTimeout);
        };
    }, []);

    return (
        <>
            <div className={`site-shell ${showSite ? 'is-ready' : 'is-loading'}`}>
                <div className={showSite ? 'site-load-enter' : ''}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/admin-login" element={<AdminLoginPage />} />
                        <Route path="/admin" element={<AdminDashboardPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </div>
            {showLoader ? <PageLoader fadingOut={loaderFadingOut} /> : null}
        </>
    );
}

export default App;
