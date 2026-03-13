import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { submitRegistration, checkHealth, fetchRegistrationStatus } from '../services/api';

const PAYMENT_QR_VALUE =
    import.meta.env.VITE_PAYMENT_QR_VALUE ||
    'upi://pay?pa=303908985042716@cnrb&pn=Wings%202k26&am=300&cu=INR&tn=WINGS%202k26%20Registration';
const REGISTRATION_FEE_TEXT = '₹300';

const MAX_EVENTS = 2;

const technicalEvents = [
    { value: 'project-expo', label: 'Project Expo', description: 'Showcase your innovative project and explain its impact.' },
    { value: 'circuitry', label: 'Circuitry', description: 'Design and troubleshoot practical circuits.' },
    { value: 'robotics', label: 'Robotics', description: 'Build and control bots in task rounds.' },
    { value: 'web-planting-ai', label: 'Web Planting with AI', description: 'Create web solutions with AI workflows.' },
    { value: 'techno-quiz', label: 'Techno Quiz', description: 'Quick quiz on tech and innovation.' },
    { value: 'debugging', label: 'Debugging Events', description: 'Find and fix code issues under time limits.' },
    { value: 'startup-pitching', label: 'Startup Idea Pitching', description: 'Pitch startup ideas to judges.' },
    { value: 'paper-presentations', label: 'Paper Presentations (PPT)', description: 'Present technical ideas with PPT.' },
];

const TECHNICAL_EVENT_VALUES = new Set(technicalEvents.map((event) => event.value));
const TECHNICAL_EVENT_LABELS = Object.fromEntries(
    technicalEvents.map((event) => [event.value, event.label])
);
const TECHNICAL_EVENTS_REQUIRING_DETAILS = new Set([
    'project-expo',
    'startup-pitching',
    'paper-presentations',
]);
const MAX_ABSTRACT_PDF_SIZE_MB = 5;

const nonTechnicalEvents = [
    { value: 'short-film', label: 'Short Film Making', description: 'Create and present a short story film.' },
    { value: 'standup-comedy', label: 'Standup Comedy', description: 'Perform original comedy live on stage.' },
    { value: 'ad-making', label: 'Ad Making', description: 'Build and pitch a creative ad concept.' },
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
        participationType: 'individual',
        teammate2: '',
        teammate3: '',
        paymentReference: '',
    });
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [technicalEventDetails, setTechnicalEventDetails] = useState({});
    const [activeTechnicalEvent, setActiveTechnicalEvent] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [registrationControl, setRegistrationControl] = useState({
        isOpen: true,
        reason: '',
    });
    const warmupDoneRef = useRef(false);

    const loadRegistrationStatus = async () => {
        try {
            const status = await fetchRegistrationStatus();
            setRegistrationControl({
                isOpen: status.isOpen !== false,
                reason: status.reason || '',
            });
            return status;
        } catch (_error) {
            return { isOpen: true, reason: '' };
        }
    };

    useEffect(() => {
        loadRegistrationStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const isTechnicalEvent = (eventValue) => TECHNICAL_EVENT_VALUES.has(eventValue);
    const isTechnicalEventDetailsRequired = (eventValue) =>
        TECHNICAL_EVENTS_REQUIRING_DETAILS.has(eventValue);

    const hasRequiredTechnicalDetails = (eventValue) => {
        const details = technicalEventDetails[eventValue];
        if (!details) return false;
        return Boolean(details.topic?.trim()) && Boolean(details.abstractPdfDataUrl?.trim());
    };

    const getTechnicalEventLabel = (eventValue) =>
        TECHNICAL_EVENT_LABELS[eventValue] || eventValue;

    const handleEventToggle = (eventValue) => {
        const alreadySelected = selectedEvents.includes(eventValue);

        if (alreadySelected) {
            setSelectedEvents((prev) => prev.filter((event) => event !== eventValue));
            if (isTechnicalEvent(eventValue)) {
                setTechnicalEventDetails((prev) => {
                    const next = { ...prev };
                    delete next[eventValue];
                    return next;
                });
                if (activeTechnicalEvent === eventValue) {
                    setActiveTechnicalEvent('');
                }
            }
            return;
        }

        if (selectedEvents.length >= MAX_EVENTS) {
            setStatusMessage(`You can select up to ${MAX_EVENTS} events only.`);
            setStatusType('error');
            return;
        }

        setSelectedEvents((prev) => [...prev, eventValue]);
        if (isTechnicalEventDetailsRequired(eventValue)) {
            setActiveTechnicalEvent(eventValue);
        }
    };

    const handleOpenTechnicalDetails = (eventValue) => {
        if (!isTechnicalEventDetailsRequired(eventValue)) return;
        if (activeTechnicalEvent === eventValue) {
            setActiveTechnicalEvent('');
            requestAnimationFrame(() => setActiveTechnicalEvent(eventValue));
            return;
        }
        setActiveTechnicalEvent(eventValue);
    };

    const handleTechnicalDetailsChange = (field, value) => {
        if (!activeTechnicalEvent) return;
        setTechnicalEventDetails((prev) => {
            const existing = prev[activeTechnicalEvent] || {
                topic: '',
                abstractPdfName: '',
                abstractPdfDataUrl: '',
            };
            return {
                ...prev,
                [activeTechnicalEvent]: {
                    ...existing,
                    [field]: value,
                },
            };
        });
    };

    const handleTechnicalAbstractFileChange = (e) => {
        if (!activeTechnicalEvent) return;

        const file = e.target.files?.[0];
        if (!file) {
            handleTechnicalDetailsChange('abstractPdfName', '');
            handleTechnicalDetailsChange('abstractPdfDataUrl', '');
            return;
        }

        if (file.type !== 'application/pdf') {
            setStatusMessage('Please upload abstract in PDF format only.');
            setStatusType('error');
            e.target.value = '';
            return;
        }

        const maxBytes = MAX_ABSTRACT_PDF_SIZE_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            setStatusMessage(`Abstract PDF must be ${MAX_ABSTRACT_PDF_SIZE_MB} MB or smaller.`);
            setStatusType('error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === 'string' ? reader.result : '';
            handleTechnicalDetailsChange('abstractPdfName', file.name);
            handleTechnicalDetailsChange('abstractPdfDataUrl', dataUrl);
            setStatusMessage('Abstract PDF attached successfully.');
            setStatusType('success');
        };
        reader.onerror = () => {
            setStatusMessage('Unable to read the selected PDF. Please try again.');
            setStatusType('error');
        };
        reader.readAsDataURL(file);
    };

    const handleSaveTechnicalDetails = () => {
        if (!activeTechnicalEvent) return;
        const details = technicalEventDetails[activeTechnicalEvent] || {
            topic: '',
            abstractPdfName: '',
            abstractPdfDataUrl: '',
        };
        if (!details.topic.trim() || !details.abstractPdfDataUrl.trim()) {
            setStatusMessage('Please provide both Topic and Abstract PDF for the selected technical event.');
            setStatusType('error');
            return;
        }
        setStatusMessage(`${getTechnicalEventLabel(activeTechnicalEvent)} details saved.`);
        setStatusType('success');
        setActiveTechnicalEvent('');
    };

    const handleCancelTechnicalDetails = () => {
        if (!activeTechnicalEvent) return;
        const eventToRemove = activeTechnicalEvent;
        setSelectedEvents((prev) => prev.filter((event) => event !== eventToRemove));
        setTechnicalEventDetails((prev) => {
            const next = { ...prev };
            delete next[eventToRemove];
            return next;
        });
        setActiveTechnicalEvent('');
        setStatusMessage(`${getTechnicalEventLabel(eventToRemove)} was removed from selected events.`);
        setStatusType('error');
    };

    const handleFormFocus = () => {
        if (warmupDoneRef.current) return;
        warmupDoneRef.current = true;
        checkHealth();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const latestStatus = await loadRegistrationStatus();
        if (latestStatus?.isOpen === false) {
            setStatusMessage(latestStatus.reason || 'Registrations are currently closed by the admin.');
            setStatusType('error');
            return;
        }

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

        const selectedTechnicalEvents = selectedEvents.filter((eventValue) =>
            isTechnicalEventDetailsRequired(eventValue)
        );
        const missingTechnicalDetails = selectedTechnicalEvents.filter(
            (eventValue) => !hasRequiredTechnicalDetails(eventValue)
        );

        if (missingTechnicalDetails.length > 0) {
            const firstMissing = missingTechnicalDetails[0];
            setStatusMessage(
                `Please add Topic and Abstract PDF for ${getTechnicalEventLabel(firstMissing)}.`
            );
            setStatusType('error');
            setActiveTechnicalEvent(firstMissing);
            return;
        }

        if (formData.participationType === 'team') {
            const teammates = [formData.teammate2, formData.teammate3]
                .map((member) => member.trim())
                .filter(Boolean);

            if (teammates.length === 0) {
                setStatusMessage('For team registration, add at least one teammate (max 3 members total).');
                setStatusType('error');
                return;
            }
        }

        if (!formData.paymentReference.trim()) {
            setStatusMessage('Please complete payment and enter transaction/reference ID.');
            setStatusType('error');
            return;
        }

        const newRegId =
            'WINGS2026-' + Math.random().toString(36).substring(2, 11).toUpperCase();

        const eventDetailsPayload = selectedTechnicalEvents.reduce((acc, eventValue) => {
            const details = technicalEventDetails[eventValue] || {
                topic: '',
                abstractPdfName: '',
                abstractPdfDataUrl: '',
            };
            acc[eventValue] = {
                topic: details.topic.trim(),
                abstractPdfName: details.abstractPdfName || '',
                abstractPdfDataUrl: details.abstractPdfDataUrl || '',
            };
            return acc;
        }, {});

        const payload = {
            name: formData.name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            college: formData.college.trim(),
            department: formData.department,
            year: formData.year,
            events: selectedEvents,
            participationType: formData.participationType,
            teamName: '',
            teamMembers:
                formData.participationType === 'team'
                    ? [formData.name.trim(), formData.teammate2.trim(), formData.teammate3.trim()]
                        .filter(Boolean)
                        .slice(0, 3)
                    : [formData.name.trim()],
            paymentReference: formData.paymentReference.trim(),
            eventDetails: eventDetailsPayload,
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
            setFormData({
                name: '',
                email: '',
                phone: '',
                college: '',
                department: '',
                year: '',
                participationType: 'individual',
                teammate2: '',
                teammate3: '',
                paymentReference: '',
            });
            setSelectedEvents([]);
            setTechnicalEventDetails({});
            setActiveTechnicalEvent('');
        } catch (error) {
            setStatusMessage(error.message || 'Registration failed');
            setStatusType('error');
        } finally {
            setIsSubmitting(false);
            setShowBanner(false);
        }
    };

    const technicalDetailsModal = activeTechnicalEvent && isTechnicalEventDetailsRequired(activeTechnicalEvent) ? (
        <div className="technical-details-modal-overlay" role="presentation">
            <div
                className="technical-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="technicalDetailsTitle"
            >
                <h3 id="technicalDetailsTitle">{getTechnicalEventLabel(activeTechnicalEvent)} Details</h3>
                <p>
                    Please provide the required details for this technical event submission.
                </p>

                <div className="technical-details-fields">
                    <label htmlFor="technicalEventTopic">Project Title *</label>
                    <input
                        id="technicalEventTopic"
                        type="text"
                        placeholder="Enter your topic"
                        value={technicalEventDetails[activeTechnicalEvent]?.topic || ''}
                        onChange={(e) => handleTechnicalDetailsChange('topic', e.target.value)}
                    />

                    <label htmlFor="technicalEventAbstractPdf">Abstract PDF *</label>
                    <input
                        id="technicalEventAbstractPdf"
                        type="file"
                        accept="application/pdf"
                        onChange={handleTechnicalAbstractFileChange}
                    />
                    <small>
                        Upload a PDF file (max {MAX_ABSTRACT_PDF_SIZE_MB} MB).
                        {technicalEventDetails[activeTechnicalEvent]?.abstractPdfName
                            ? ` Selected: ${technicalEventDetails[activeTechnicalEvent].abstractPdfName}`
                            : ''}
                    </small>
                </div>

                <div className="technical-details-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelTechnicalDetails}
                    >
                        Cancel Event
                    </button>
                    <button
                        type="button"
                        className="submit-btn"
                        onClick={handleSaveTechnicalDetails}
                    >
                        Save Details
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            {createPortal(technicalDetailsModal, document.body)}

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
                <div className="registration-deadline-inline" role="note" aria-label="Registration deadline notice">
                    <i className="fas fa-clock"></i>
                    <span>
                        <span style={{ color: '#fffbe6' }}>On-spot registrations available from 9AM - 12PM.</span>
                        <br />
                        <span style={{ color: '#fffbe6' }}>Technical events start at 10 AM .</span>
                    </span>
                </div>
                {registrationControl.isOpen === false ? (
                    <div className="registration-closed-inline" role="alert" aria-live="polite">
                        <i className="fas fa-ban"></i>
                        <span>
                            Registrations are currently closed.
                            {registrationControl.reason ? ` ${registrationControl.reason}` : ''}
                        </span>
                    </div>
                ) : null}

                <div className="registration-container">
                    {/* Registration Form */}
                    <div className="form-container">
                        <form id="registrationForm" onSubmit={handleSubmit} onFocus={handleFormFocus}>
                            <div className="form-grid">
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
                            </div>

                            <details className="mobile-accordion events-accordion" open>
                                <summary>
                                    Events * ({selectedEvents.length}/{MAX_EVENTS})
                                </summary>
                                <div className="accordion-content form-group">
                                    <label className="events-label">
                                        Events * <small>
                                            (Choose up to {MAX_EVENTS} from any category — {selectedEvents.length}/{MAX_EVENTS} selected)
                                        </small>
                                    </label>
                                    <div className="checkbox-group events-layout" id="events">
                                        <details className="event-category event-category-collapse">
                                            <summary className="event-category-title">
                                                <span><i className="fas fa-microchip"></i> Technical</span>
                                            </summary>
                                            <div className="event-list">
                                                {technicalEvents.map((evt) => (
                                                    <div className="event-option-wrap" key={evt.value}>
                                                        <label className="event-option">
                                                            <input
                                                                type="checkbox"
                                                                name="events"
                                                                value={evt.value}
                                                                checked={selectedEvents.includes(evt.value)}
                                                                disabled={!selectedEvents.includes(evt.value) && selectedEvents.length >= MAX_EVENTS}
                                                                onChange={() => handleEventToggle(evt.value)}
                                                            />
                                                            <span>
                                                                <strong>{evt.label}</strong>
                                                                {evt.description ? <small>{evt.description}</small> : null}
                                                            </span>
                                                        </label>
                                                        {selectedEvents.includes(evt.value) && isTechnicalEventDetailsRequired(evt.value) ? (
                                                            <button
                                                                type="button"
                                                                className="event-details-btn"
                                                                onClick={() => handleOpenTechnicalDetails(evt.value)}
                                                            >
                                                                {hasRequiredTechnicalDetails(evt.value)
                                                                    ? 'Edit Details'
                                                                    : 'Add Details'}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                        <details className="event-category event-category-collapse">
                                            <summary className="event-category-title">
                                                <span><i className="fas fa-palette"></i> Non-Technical</span>
                                            </summary>
                                            <div className="event-list">
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
                                                        <span>
                                                            <strong>{evt.label}</strong>
                                                            {evt.description ? <small>{evt.description}</small> : null}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </details>

                            <div className="form-group team-section">
                                <label htmlFor="participationType">Participation Type *</label>
                                <select
                                    id="participationType"
                                    name="participationType"
                                    required
                                    value={formData.participationType}
                                    onChange={handleInputChange}
                                >
                                    <option value="individual">Individual</option>
                                    <option value="team">Team (max 3 members)</option>
                                </select>

                                {formData.participationType === 'team' ? (
                                    <div className="team-fields">
                                        <input
                                            type="text"
                                            id="teammate2"
                                            name="teammate2"
                                            placeholder="Teammate 2 name *"
                                            required
                                            value={formData.teammate2}
                                            onChange={handleInputChange}
                                        />
                                        <input
                                            type="text"
                                            id="teammate3"
                                            name="teammate3"
                                            placeholder="Teammate 3 name (optional)"
                                            value={formData.teammate3}
                                            onChange={handleInputChange}
                                        />
                                        <small className="team-help">
                                            Team can have up to 3 members including you.
                                        </small>
                                    </div>
                                ) : null}
                            </div>

                            <details className="mobile-accordion payment-accordion" open>
                                <summary>
                                    Payment * ({REGISTRATION_FEE_TEXT})
                                </summary>
                                <div className="accordion-content form-group payment-group">
                                    <label>Payment *</label>
                                    <div className="payment-qr-box">
                                        <p className="payment-amount">Registration Fee: {REGISTRATION_FEE_TEXT}</p>
                                        <p className="payment-note">Scan the QR and complete payment before submitting.</p>
                                        <div className="payment-qr">
                                            <QRCodeCanvas
                                                value={PAYMENT_QR_VALUE}
                                                size={170}
                                                bgColor="#ffffff"
                                                fgColor="#000000"
                                                level="H"
                                            />
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        id="paymentReference"
                                        name="paymentReference"
                                        placeholder="Enter UPI transaction/reference ID"
                                        required
                                        value={formData.paymentReference}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </details>

                            <button type="submit" className="submit-btn" disabled={isSubmitting || registrationControl.isOpen === false}>
                                {registrationControl.isOpen === false
                                    ? 'Registrations Closed'
                                    : isSubmitting
                                        ? 'Loading...'
                                        : 'Submit Registration'}
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

                </div>
            </section>
        </>
    );
}
