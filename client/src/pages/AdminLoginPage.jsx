import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkAdminSession, adminLogin } from '../services/api';
import '../styles/admin-login.css';

export default function AdminLoginPage() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (searchParams.get('from') === 'logout') {
            setStatusMessage('Logged out successfully.');
            setStatusType('ok');
        }

        checkAdminSession().then((ok) => {
            if (ok) navigate('/admin', { replace: true });
        });
    }, [navigate, searchParams]);

    const handleLogin = async () => {
        const trimmedPassword = password.trim();
        if (!trimmedPassword) {
            setStatusMessage('Please enter admin password.');
            setStatusType('err');
            return;
        }

        setStatusMessage('Verifying credentials...');
        setStatusType('');

        try {
            await adminLogin(trimmedPassword);
            setStatusMessage('Login successful. Redirecting...');
            setStatusType('ok');
            setTimeout(() => navigate('/admin', { replace: true }), 400);
        } catch (error) {
            setStatusMessage(error.message || 'Login failed.');
            setStatusType('err');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLogin();
    };

    return (
        <div className="admin-login-body">
            <div className="card">
                <h1>Admin Login</h1>
                <p>Enter admin password to access registrations dashboard.</p>
                <div className="password-wrap">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Admin password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        id="togglePassword"
                        type="button"
                        className="toggle-password"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? 'Hide' : 'Show'}
                    </button>
                </div>
                <button id="loginBtn" onClick={handleLogin}>
                    Login
                </button>
                <div id="status" className={`status ${statusType}`}>
                    {statusMessage}
                </div>
            </div>
        </div>
    );
}
