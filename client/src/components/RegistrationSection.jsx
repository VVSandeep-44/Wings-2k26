import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { submitRegistration, checkHealth } from '../services/api';

const QR_URL = 'https://wings-2k26.onrender.com/#register';

const MAX_EVENTS = 2;

const technicalEvents = [
    { value: 'circuitry', label: 'Circuitry' },
    { value: 'robotics', label: 'Robotics' },
    { value: 'web-planting-ai', label: 'Web Planting with AI' },
    { value: 'techno-quiz', label: 'Techno Quiz' },
    { value: 'debugging', label: 'Debugging Events' },
    { value: 'startup-pitching', label: 'Startup Idea Pitching' },
    { value: 'paper-presentations', label: 'Paper Presentations (PPT)' },
];

const nonTechnicalEvents = [
    { value: 'short-film', label: 'Short Film Making' },
    { value: 'standup-comedy', label: 'Standup Comedy' },
    { value: 'ad-making', label: 'Ad Making' },
];

const departments = [
    { value: '', label: 'Select Department' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'diploma', label: 'Diploma' },
    { value: 'degree', label: 'Degree' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'other', label: 'Other' },
];

const years = [
    { value: '', label: 'Select Year' },
    { value: '1st', label: '1st Year' },
    { value: '2nd', label: '2nd Year' },
    { value: '3rd', label: '3rd Year' },
    { value: '4th', label: '4th Year' },
];

export default function RegistrationSection() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        college: '',
        department: '',
        year: '',
    });
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [regId, setRegId] = useState('');
    const [showBanner, setShowBanner] = useState(false);
    const warmupDoneRef = useRef(false);
    const qrRef = useRef(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEventToggle = (eventValue) => {
        setSelectedEvents((prev) => {
            if (prev.includes(eventValue)) {
                return prev.filter((e) => e !== eventValue);
            }
            if (prev.length >= MAX_EVENTS) return prev;
            return [...prev, eventValue];
        });
    };

    const handleFormFocus = () => {
        if (warmupDoneRef.current) return;
        warmupDoneRef.current = true;
        checkHealth();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isPhoneValid = /^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim());
        if (!isPhoneValid) {
            setStatusMessage('Please enter a valid phone number.');
            setStatusType('error');
            return;
        }

        if (selectedEvents.length === 0) {
            setStatusMessage('Please select at least one event.');
            setStatusType('error');
            return;
        }

        const newRegId =
            'WINGS2026-' + Math.random().toString(36).substring(2, 11).toUpperCase();
        setRegId(newRegId);

        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            college: formData.college.trim(),
            department: formData.department,
            year: formData.year,
            events: selectedEvents,
            regId: newRegId,
            createdAt: new Date().toISOString(),
        };

        setIsSubmitting(true);
        setShowBanner(true);
        setStatusMessage('Waking server... please wait.');
        setStatusType('');

        try {
            await submitRegistration(payload, (retryMsg) => {
                setStatusMessage(retryMsg);
            });

            // Save to localStorage
            const existing = JSON.parse(
                localStorage.getItem('wings2026Registrations') || '[]'
            );
            existing.unshift(payload);
            localStorage.setItem(
                'wings2026Registrations',
                JSON.stringify(existing.slice(0, 5))
            );

            setStatusMessage('Registration successful');
            setStatusType('success');
            setFormData({ name: '', email: '', phone: '', college: '', department: '', year: '' });
            setSelectedEvents([]);
        } catch (error) {
            setStatusMessage(error.message || 'Registration failed');
            setStatusType('error');
        } finally {
            setIsSubmitting(false);
            setShowBanner(false);
        }
    };

    const downloadQR = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'WINGS2026-Registration-QR.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    return (
        <>
            {showBanner && (
                <div
                    className="server-wakeup-banner visible"
                    role="status"
                    aria-live="polite"
                >
                    Server is waking up. Please wait a few seconds...
                </div>
            )}

            <section className="registration" id="register">
                <h2 className="section-title">Register for WINGS 2k26</h2>

                <div className="registration-container">
                    {/* Registration Form */}
                    <div className="form-container">
                        <form id="registrationForm" onSubmit={handleSubmit} onFocus={handleFormFocus}>
                            <div className="form-group">
                                <label htmlFor="name">Full Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="Enter your full name"
                                    required
                                    value={formData.name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email Address *</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="your.email@college.edu"
                                    required
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="+91 98******10"
                                    required
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="college">College Name *</label>
                                <input
                                    type="text"
                                    id="college"
                                    name="college"
                                    placeholder="Your College Name"
                                    required
                                    value={formData.college}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="department">Department *</label>
                                <select
                                    id="department"
                                    name="department"
                                    required
                                    value={formData.department}
                                    onChange={handleInputChange}
                                >
                                    {departments.map((dept) => (
                                        <option key={dept.value} value={dept.value}>
                                            {dept.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="year">Year of Study *</label>
                                <select
                                    id="year"
                                    name="year"
                                    required
                                    value={formData.year}
                                    onChange={handleInputChange}
                                >
                                    {years.map((yr) => (
                                        <option key={yr.value} value={yr.value}>
                                            {yr.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>
                                    Events * <small style={{ fontWeight: 400, color: '#acb4df' }}>
                                        (Choose up to {MAX_EVENTS} from any category — {selectedEvents.length}/{MAX_EVENTS} selected)
                                    </small>
                                </label>
                                <div className="checkbox-group" id="events" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#ece6ff' }}>
                                            <i className="fas fa-microchip"></i> Technical
                                        </p>
                                        <div style={{ display: 'grid', gap: '0.45rem' }}>
                                            {technicalEvents.map((evt) => (
                                                <label className="event-option" key={evt.value}>
                                                    <input
                                                        type="checkbox"
                                                        name="events"
                                                        value={evt.value}
                                                        checked={selectedEvents.includes(evt.value)}
                                                        disabled={!selectedEvents.includes(evt.value) && selectedEvents.length >= MAX_EVENTS}
                                                        onChange={() => handleEventToggle(evt.value)}
                                                    />
                                                    <span>{evt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#ece6ff' }}>
                                            <i className="fas fa-palette"></i> Non-Technical
                                        </p>
                                        <div style={{ display: 'grid', gap: '0.45rem' }}>
                                            {nonTechnicalEvents.map((evt) => (
                                                <label className="event-option" key={evt.value}>
                                                    <input
                                                        type="checkbox"
                                                        name="events"
                                                        value={evt.value}
                                                        checked={selectedEvents.includes(evt.value)}
                                                        disabled={!selectedEvents.includes(evt.value) && selectedEvents.length >= MAX_EVENTS}
                                                        onChange={() => handleEventToggle(evt.value)}
                                                    />
                                                    <span>{evt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Loading...' : 'Submit Registration'}
                            </button>
                            <div
                                className={`form-status ${statusType}`}
                                id="formStatus"
                                role="status"
                                aria-live="polite"
                            >
                                {statusMessage}
                            </div>
                        </form>
                    </div>

                    {/* QR Code Section */}
                    <div className="qr-container">
                        <h3><i className="fas fa-qrcode"></i> Scan to Register</h3>
                        <div id="qrcode" ref={qrRef}>
                            <QRCodeCanvas
                                value={QR_URL}
                                size={200}
                                bgColor="#ffffff"
                                fgColor="#000000"
                                level="H"
                            />
                        </div>
                        <p>Scan this QR code to open the registration form on your phone!</p>
                        <p>
                            <a href={QR_URL} target="_blank" rel="noopener noreferrer">
                                {QR_URL}
                            </a>
                        </p>
                        {regId && (
                            <p className="reg-id">
                                <strong>Registration ID:</strong> {regId}
                            </p>
                        )}
                        <button className="download-btn" onClick={downloadQR}>
                            <i className="fas fa-download"></i> Download QR Code
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
}
