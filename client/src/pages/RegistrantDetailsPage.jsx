import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { fetchPublicRegistrationDetails } from '../services/api';
import '../styles/registration-view.css';

const EVENT_LABEL_MAP = {
    circuitry: 'Circuitry',
    robotics: 'Robotics',
    'web-planting-ai': 'Web Planting with AI',
    'project-expo': 'Project Expo',
    'techno-quiz': 'Techno Quiz',
    debugging: 'Debugging Events',
    'startup-pitching': 'Startup Idea Pitching',
    'paper-presentations': 'Paper Presentations (PPT)',
    'short-film': 'Short Film Making',
    'standup-comedy': 'Standup Comedy',
    'ad-making': 'Ad Making',
};

const formatEventLabel = (value) => EVENT_LABEL_MAP[value] || value || '-';

const formatDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const formatStatus = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const getTicketStatus = (data) => {
    const paymentStatus = String(data?.paymentStatus || '').toLowerCase();
    const validationStatus = String(data?.validationStatus || '').toLowerCase();

    if (paymentStatus === 'verified' || validationStatus === 'verified' || validationStatus === 'approved') {
        return 'Verified';
    }

    if (paymentStatus === 'failed' || validationStatus === 'failed' || validationStatus === 'rejected') {
        return 'Failed';
    }

    return 'Submitted';
};

export default function RegistrantDetailsPage() {
    const { regId = '' } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const load = async () => {
            if (!regId || !token) {
                if (active) {
                    setError('This registration link is invalid or incomplete.');
                    setLoading(false);
                }
                return;
            }

            try {
                const details = await fetchPublicRegistrationDetails(regId, token);
                if (!active) return;
                setData(details);
                setError('');
            } catch (fetchError) {
                if (!active) return;
                setError(fetchError.message || 'Could not load your registration details.');
            } finally {
                if (active) setLoading(false);
            }
        };

        load();
        return () => {
            active = false;
        };
    }, [regId, token]);

    const eventList = useMemo(
        () => (Array.isArray(data?.events) ? data.events.map((event) => formatEventLabel(event)) : []),
        [data]
    );

    const ticketStatus = useMemo(() => getTicketStatus(data), [data]);
    const isTeamRegistration = useMemo(
        () => String(data?.participationType || '').toLowerCase() === 'team',
        [data]
    );
    const qrSource = useMemo(() => {
        if (typeof window === 'undefined') return '';
        const value = window.location.href;
        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
    }, []);

    return (
        <main className="registration-view-page">
            <div className="registration-view-shell">
                {loading ? <p className="registration-view-state">Loading your details...</p> : null}
                {!loading && error ? <p className="registration-view-state error">{error}</p> : null}

                {!loading && !error && data ? (
                    <section className="admit-ticket" aria-label="WINGS admit card">
                        <aside className="admit-ticket-left">
                            <img src="/assets/pydah-logo.jpeg" alt="WINGS logo" className="admit-logo" />
                            <p className="admit-brand">WINGS</p>
                            <p className="admit-year">2026</p>
                            <p className="admit-chip">ADMIT CARD</p>
                        </aside>

                        <section className="admit-ticket-right">
                            <img src={qrSource} alt="Registration QR" className="admit-qr" />

                            <p className="admit-label">Participant Name</p>
                            <h1>{data.name || '-'}</h1>

                            <p className="admit-label">College</p>
                            <p className="admit-value">{data.college || '-'}</p>

                            <p className="admit-label">Registered Events</p>
                            <p className="admit-value">{eventList.join(', ') || '-'}</p>

                            <div className="admit-meta-row">
                                <span className="admit-meta">ID: {data.regId || '-'}</span>
                                <span className={`admit-status ${ticketStatus.toLowerCase()}`}>Status: {ticketStatus}</span>
                            </div>

                            <div className="admit-details-grid">
                                <div>
                                    <p className="admit-label">Email</p>
                                    <p className="admit-value">{data.email || '-'}</p>
                                </div>
                                <div>
                                    <p className="admit-label">Phone</p>
                                    <p className="admit-value">{data.phone || '-'}</p>
                                </div>
                                <div>
                                    <p className="admit-label">Department / Year</p>
                                    <p className="admit-value">{data.department || '-'} / {data.year || '-'}</p>
                                </div>
                                <div>
                                    <p className="admit-label">Participation</p>
                                    <p className="admit-value">{formatStatus(data.participationType)}</p>
                                </div>
                                {isTeamRegistration ? (
                                    <>
                                        <div>
                                            <p className="admit-label">Team Name</p>
                                            <p className="admit-value">{data.teamName || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="admit-label">Team Members</p>
                                            <p className="admit-value">{(data.teamMembers || []).join(', ') || '-'}</p>
                                        </div>
                                    </>
                                ) : null}
                                <div>
                                    <p className="admit-label">Payment Ref</p>
                                    <p className="admit-value mono">{data.paymentReference || '-'}</p>
                                </div>
                                <div>
                                    <p className="admit-label">Registered At</p>
                                    <p className="admit-value">{formatDate(data.createdAt)}</p>
                                </div>
                            </div>
                        </section>
                    </section>
                ) : null}

                <footer className="registration-view-footer">
                    <Link to="/">Back to WINGS 2k26</Link>
                </footer>
            </div>
        </main>
    );
}
