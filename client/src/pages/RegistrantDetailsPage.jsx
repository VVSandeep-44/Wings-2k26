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

    return (
        <main className="registration-view-page">
            <div className="registration-view-shell">
                <header className="registration-view-head">
                    <p className="registration-view-kicker">WINGS 2k26</p>
                    <h1>Registration Details</h1>
                    <p>Present this page at check-in for quick verification.</p>
                </header>

                {loading ? <p className="registration-view-state">Loading your details...</p> : null}
                {!loading && error ? <p className="registration-view-state error">{error}</p> : null}

                {!loading && !error && data ? (
                    <section className="registration-view-grid">
                        <article className="registration-view-card highlight">
                            <p className="label">Registration ID</p>
                            <p className="value mono">{data.regId || '-'}</p>
                        </article>

                        <article className="registration-view-card">
                            <p className="label">Name</p>
                            <p className="value">{data.name || '-'}</p>
                            <p className="label">Email</p>
                            <p className="value">{data.email || '-'}</p>
                            <p className="label">Phone</p>
                            <p className="value">{data.phone || '-'}</p>
                        </article>

                        <article className="registration-view-card">
                            <p className="label">College</p>
                            <p className="value">{data.college || '-'}</p>
                            <p className="label">Department / Year</p>
                            <p className="value">{data.department || '-'} / {data.year || '-'}</p>
                        </article>

                        <article className="registration-view-card">
                            <p className="label">Participation</p>
                            <p className="value">{formatStatus(data.participationType)}</p>
                            <p className="label">Team Name</p>
                            <p className="value">{data.teamName || '-'}</p>
                            <p className="label">Team Members</p>
                            <p className="value">{(data.teamMembers || []).join(', ') || '-'}</p>
                        </article>

                        <article className="registration-view-card full">
                            <p className="label">Selected Events</p>
                            <p className="value">{eventList.join(', ') || '-'}</p>
                        </article>

                        <article className="registration-view-card">
                            <p className="label">Payment Reference</p>
                            <p className="value mono">{data.paymentReference || '-'}</p>
                            <p className="label">Payment Status</p>
                            <p className="value">{formatStatus(data.paymentStatus)}</p>
                            <p className="label">Payment Verified At</p>
                            <p className="value">
                                {String(data.paymentStatus || '').toLowerCase() === 'verified'
                                    ? formatDate(data.paymentVerifiedAt)
                                    : ''}
                            </p>
                        </article>

                        <article className="registration-view-card">
                            <p className="label">Validation</p>
                            <p className="value">{formatStatus(data.validationStatus)}</p>
                            <p className="label">Invitation</p>
                            <p className="value">{formatStatus(data.invitationStatus)}</p>
                            <p className="label">Registered At</p>
                            <p className="value">{formatDate(data.createdAt)}</p>
                        </article>
                    </section>
                ) : null}

                <footer className="registration-view-footer">
                    <Link to="/">Back to WINGS 2k26</Link>
                </footer>
            </div>
        </main>
    );
}
