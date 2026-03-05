import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    checkAdminSession,
    fetchRegistrations,
    deleteRegistration as deleteRegistrationApi,
    updateRegistrationPaymentStatus,
    fetchAdminRegistrationStatus,
    updateAdminRegistrationStatus,
    adminLogout,
} from '../services/api';
import '../styles/admin.css';

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
};

const escapeCsv = (value) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const EVENT_OPTIONS = [
    { value: 'circuitry', label: 'Circuitry' },
    { value: 'robotics', label: 'Robotics' },
    { value: 'web-planting-ai', label: 'Web Planting with AI' },
    { value: 'project-expo', label: 'Project Expo' },
    { value: 'techno-quiz', label: 'Techno Quiz' },
    { value: 'debugging', label: 'Debugging Events' },
    { value: 'startup-pitching', label: 'Startup Idea Pitching' },
    { value: 'paper-presentations', label: 'Paper Presentations (PPT)' },
    { value: 'short-film', label: 'Short Film Making' },
    { value: 'standup-comedy', label: 'Standup Comedy' },
    { value: 'ad-making', label: 'Ad Making' },
];

const EVENT_LABEL_MAP = Object.fromEntries(
    EVENT_OPTIONS.map((event) => [event.value, event.label])
);

const TECHNICAL_DETAILS_REQUIRED_EVENTS = new Set([
    'project-expo',
    'startup-pitching',
    'paper-presentations',
]);

const formatEventName = (value) => EVENT_LABEL_MAP[value] || value || '-';

const getRequiredTechnicalEvents = (events) =>
    (Array.isArray(events) ? events : []).filter((event) =>
        TECHNICAL_DETAILS_REQUIRED_EVENTS.has(event)
    );

const hasSubmissionDetails = (details) =>
    Boolean(details?.topic?.trim()) &&
    Boolean((details?.abstractPdfDataUrl || details?.abstract || '').trim());

const getTechnicalSubmissionStatus = (row) => {
    const requiredEvents = getRequiredTechnicalEvents(row?.events);
    if (requiredEvents.length === 0) {
        return 'Not Applicable';
    }

    const eventDetails = row?.eventDetails && typeof row.eventDetails === 'object'
        ? row.eventDetails
        : {};
    const hasPending = requiredEvents.some((event) => !hasSubmissionDetails(eventDetails[event]));

    return hasPending ? 'Pending' : 'Submitted';
};

const getTechnicalTopicsSummary = (row) => {
    const requiredEvents = getRequiredTechnicalEvents(row?.events);
    const eventDetails = row?.eventDetails && typeof row.eventDetails === 'object'
        ? row.eventDetails
        : {};

    return requiredEvents
        .map((event) => {
            const details = eventDetails[event];
            if (!details?.topic) return '';
            return `${formatEventName(event)}: ${details.topic}`;
        })
        .filter(Boolean)
        .join(' | ');
};

const getTechnicalPdfSummary = (row) => {
    const requiredEvents = getRequiredTechnicalEvents(row?.events);
    const eventDetails = row?.eventDetails && typeof row.eventDetails === 'object'
        ? row.eventDetails
        : {};

    return requiredEvents
        .map((event) => {
            const details = eventDetails[event];
            const filename = details?.abstractPdfName || (details?.abstractPdfDataUrl ? 'Uploaded PDF' : '');
            if (!filename) return '';
            return `${formatEventName(event)}: ${filename}`;
        })
        .filter(Boolean)
        .join(' | ');
};

const sortByRegistrationTimeDesc = (rows) =>
    [...rows].sort((a, b) => {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
    });

const sortByRegistrationTimeAsc = (rows) =>
    [...rows].sort((a, b) => {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        return (Number.isFinite(timeA) ? timeA : 0) - (Number.isFinite(timeB) ? timeB : 0);
    });

const buildCsv = (rows) => {
    const headers = [
        'Name', 'Email', 'Phone', 'College', 'Department', 'Year',
        'Events', 'Registration ID', 'Participation Type', 'Team Name', 'Team Members', 'Payment Reference', 'Payment Status', 'Validation Status', 'Invitation Status',
        'Technical Submission Status', 'Technical Topics', 'Abstract PDF Files', 'Validation Message', 'Created At',
    ];
    const lines = [headers.join(',')];
    rows.forEach((row) => {
        lines.push(
            [
                escapeCsv(row.name), escapeCsv(row.email), escapeCsv(row.phone),
                escapeCsv(row.college), escapeCsv(row.department), escapeCsv(row.year),
                escapeCsv((row.events || []).map((event) => formatEventName(event)).join(' | ')), escapeCsv(row.regId),
                escapeCsv(row.participationType || 'individual'),
                escapeCsv(row.teamName || ''),
                escapeCsv((row.teamMembers || []).join(' | ')),
                escapeCsv(row.paymentReference || ''),
                escapeCsv(row.paymentStatus || 'submitted'),
                escapeCsv(row.validationStatus || 'pending'),
                escapeCsv(row.invitationStatus || 'queued'),
                escapeCsv(getTechnicalSubmissionStatus(row)),
                escapeCsv(getTechnicalTopicsSummary(row)),
                escapeCsv(getTechnicalPdfSummary(row)),
                escapeCsv(row.validationMessage || ''),
                escapeCsv(formatDate(row.createdAt)),
            ].join(',')
        );
    });
    return lines.join('\n');
};

const buildSingleRegistrationResponseJson = (row) =>
    JSON.stringify(
        {
            name: row?.name || '',
            email: row?.email || '',
            phone: row?.phone || '',
            college: row?.college || '',
            department: row?.department || '',
            year: row?.year || '',
            events: Array.isArray(row?.events) ? row.events : [],
            eventDetails:
                row?.eventDetails && typeof row.eventDetails === 'object'
                    ? row.eventDetails
                    : {},
            technicalSubmissionStatus: getTechnicalSubmissionStatus(row),
            regId: row?.regId || '',
            participationType: row?.participationType || 'individual',
            teamName: row?.teamName || '',
            teamMembers: Array.isArray(row?.teamMembers) ? row.teamMembers : [],
            paymentReference: row?.paymentReference || '',
            paymentStatus: row?.paymentStatus || 'submitted',
            paymentVerifiedBy: row?.paymentVerifiedBy || '',
            paymentVerifiedAt: row?.paymentVerifiedAt || null,
            validationStatus: row?.validationStatus || 'pending',
            invitationStatus: row?.invitationStatus || 'queued',
            validationMessage: row?.validationMessage || '',
            createdAt: row?.createdAt || null,
            createdAtFormatted: formatDate(row?.createdAt),
        },
        null,
        2
    );

const getAbstractPdfEntries = (row) => {
    const details = row?.eventDetails && typeof row.eventDetails === 'object'
        ? row.eventDetails
        : {};

    return Object.entries(details)
        .map(([eventKey, eventDetail]) => ({
            eventKey,
            fileName: eventDetail?.abstractPdfName || `${eventKey}-abstract.pdf`,
            dataUrl: eventDetail?.abstractPdfDataUrl || '',
        }))
        .filter((entry) => entry.dataUrl && entry.dataUrl.startsWith('data:application/pdf;base64,'));
};

    const hasAbstractPdfs = (row) => getAbstractPdfEntries(row).length > 0;

const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};

export default function AdminDashboardPage() {
    const [allRegistrations, setAllRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [statusMessage, setStatusMessage] = useState('Enter admin password to load data.');
    const [statusType, setStatusType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [eventFilter, setEventFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [limit, setLimit] = useState(20);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [paymentUpdatingId, setPaymentUpdatingId] = useState(null);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [registrationControl, setRegistrationControl] = useState({
        isOpen: true,
        reason: '',
        updatedAt: null,
        updatedBy: 'system',
    });
    const [isUpdatingRegistrationStatus, setIsUpdatingRegistrationStatus] = useState(false);
    const [showCloseConfirmPopup, setShowCloseConfirmPopup] = useState(false);
    const navigate = useNavigate();

    const setStatus = (message, type = '') => {
        setStatusMessage(message);
        setStatusType(type);
    };

    const applyFilters = useCallback(
        (data, query, selectedEvent, selectedSortOrder = 'newest') => {
            const sourceData = Array.isArray(data) ? data : [];
            const sortedData =
                selectedSortOrder === 'oldest'
                    ? sortByRegistrationTimeAsc(sourceData)
                    : sortByRegistrationTimeDesc(sourceData);
            const q = query.trim().toLowerCase();
            const filtered = sortedData.filter((row) => {
                const events = Array.isArray(row.events) ? row.events : [];
                const eventMatches = selectedEvent === 'all' || events.includes(selectedEvent);
                if (!eventMatches) return false;
                if (!q) return true;
                const searchable = [
                    row.name, row.email, row.phone, row.college,
                    row.department, row.year, row.regId, events.join(' '),
                ].join(' ').toLowerCase();
                return searchable.includes(q);
            });
            setFilteredRegistrations(filtered);
            if (sortedData.length > 0) {
                setStatus(`Showing ${filtered.length} of ${sortedData.length} registration(s).`, 'ok');
            }
        },
        []
    );

    const loadRegistrations = useCallback(async (currentLimit) => {
        const ok = await checkAdminSession();
        if (!ok) {
            navigate('/admin-login', { replace: true });
            return;
        }
        setStatus('Loading registrations...');
        try {
            const result = await fetchRegistrations(currentLimit);
            const data = sortByRegistrationTimeDesc(result.data || []);
            setAllRegistrations(data);
            setStatus(`Loaded ${result.count} registration(s).`, 'ok');
            return data;
        } catch (error) {
            setAllRegistrations([]);
            setFilteredRegistrations([]);
            setStatus(error.message || 'Unexpected error occurred.', 'err');
            return [];
        }
    }, [navigate]);

    const loadRegistrationControl = useCallback(async () => {
        try {
            const result = await fetchAdminRegistrationStatus();
            setRegistrationControl({
                isOpen: result.isOpen !== false,
                reason: result.reason || '',
                updatedAt: result.updatedAt || null,
                updatedBy: result.updatedBy || 'system',
            });
        } catch (error) {
            setStatus(error.message || 'Could not load registration controls.', 'err');
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            const ok = await checkAdminSession();
            if (!ok) {
                navigate('/admin-login', { replace: true });
                return;
            }
            await loadRegistrationControl();
            const data = await loadRegistrations(limit);
            if (data) applyFilters(data, searchQuery, eventFilter, sortOrder);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyFilters(allRegistrations, searchQuery, eventFilter, sortOrder);
    }, [searchQuery, eventFilter, sortOrder, allRegistrations, applyFilters]);

    useEffect(() => {
        if (!selectedRegistration) return;
        const selectedKey = selectedRegistration.id || selectedRegistration.regId;
        const stillExists = filteredRegistrations.some(
            (item) => (item.id || item.regId) === selectedKey
        );
        if (!stillExists) {
            setSelectedRegistration(null);
        }
    }, [filteredRegistrations, selectedRegistration]);

    const handleRefresh = async () => {
        await loadRegistrationControl();
        const data = await loadRegistrations(limit);
        if (data) applyFilters(data, searchQuery, eventFilter, sortOrder);
    };

    const executeRegistrationToggle = async (nextIsOpen) => {
        setIsUpdatingRegistrationStatus(true);
        setStatus(nextIsOpen ? 'Opening registrations...' : 'Closing registrations...');

        try {
            const result = await updateAdminRegistrationStatus(
                nextIsOpen,
                '',
                'admin'
            );
            setRegistrationControl({
                isOpen: result.isOpen !== false,
                reason: result.reason || '',
                updatedAt: result.updatedAt || null,
                updatedBy: result.updatedBy || 'admin',
            });
            setStatus(result.message || 'Registration status updated.', 'ok');
        } catch (error) {
            setStatus(error.message || 'Could not update registration status.', 'err');
        } finally {
            setIsUpdatingRegistrationStatus(false);
        }
    };

    const handleToggleRegistrations = async (nextIsOpen) => {
        if (!nextIsOpen) {
            const firstConfirm = window.confirm(
                'Are you sure you want to close registrations? Users will not be able to submit the form.'
            );
            if (!firstConfirm) return;
            setShowCloseConfirmPopup(true);
            return;
        }

        await executeRegistrationToggle(true);
    };

    const handlePopupCloseConfirm = async () => {
        setShowCloseConfirmPopup(false);
        await executeRegistrationToggle(false);
    };

    const handleLimitChange = async (newLimit) => {
        setLimit(newLimit);
        const data = await loadRegistrations(newLimit);
        if (data) applyFilters(data, searchQuery, eventFilter, sortOrder);
    };

    const handleDelete = async (id, name) => {
        const confirmed = window.confirm(
            `Delete registration for ${name || 'this user'}? This cannot be undone.`
        );
        if (!confirmed) return;

        setDeletingId(id);
        setStatus('Deleting registration...');

        try {
            await deleteRegistrationApi(id);
            setStatus('Registration deleted successfully.', 'ok');
            await handleRefresh();
        } catch (error) {
            setStatus(error.message || 'Could not delete registration.', 'err');
        } finally {
            setDeletingId(null);
        }
    };

    const handleViewDetails = (row) => {
        setSelectedRegistration(row);
        setStatus(`Viewing details for ${row?.name || row?.regId || 'selected registrant'}.`, 'ok');
    };

    const handleDownloadSingleResponse = (row) => {
        if (!row) {
            setStatus('Select a registration first.', 'err');
            return;
        }

        const safeId = String(row.regId || row.name || 'registrant')
            .trim()
            .replace(/[^a-zA-Z0-9-_]+/g, '-');
        const stamp = new Date().toISOString().slice(0, 10);
        const jsonContent = buildSingleRegistrationResponseJson(row);
        downloadFile(
            jsonContent,
            `wings-registration-response-${safeId}-${stamp}.json`,
            'application/json;charset=utf-8;'
        );
        setStatus('Selected registration response downloaded.', 'ok');
    };

    const handleDownloadAllAbstractPdfs = (row) => {
        const entries = getAbstractPdfEntries(row);

        if (entries.length === 0) {
            setStatus('No abstract PDFs are available for this registrant.', 'err');
            return;
        }

        entries.forEach((entry, index) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = entry.dataUrl;
                link.download = entry.fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, index * 120);
        });

        setStatus(`Downloading ${entries.length} abstract PDF(s).`, 'ok');
    };

    const handlePaymentStatusUpdate = async (row, paymentStatus) => {
        if (!row?.id) {
            setStatus('Unable to update payment status for this record.', 'err');
            return;
        }

        setPaymentUpdatingId(row.id);
        setStatus(`Updating payment status to ${paymentStatus}...`);

        try {
            await updateRegistrationPaymentStatus(row.id, paymentStatus, 'admin');
            const data = await loadRegistrations(limit);
            if (data) {
                applyFilters(data, searchQuery, eventFilter, sortOrder);
                const updatedRow = data.find((item) => item.id === row.id) || null;
                setSelectedRegistration(updatedRow);
            }
            setStatus(`Payment marked as ${paymentStatus}.`, 'ok');
        } catch (error) {
            setStatus(error.message || 'Could not update payment status.', 'err');
        } finally {
            setPaymentUpdatingId(null);
        }
    };

    const handleExport = (type) => {
        if (!filteredRegistrations.length) {
            setStatus('Load registrations before exporting.', 'err');
            return;
        }
        const stamp = new Date().toISOString().slice(0, 10);
        const csvContent = buildCsv(filteredRegistrations);
        if (type === 'excel') {
            downloadFile(csvContent, `wings-registrations-${stamp}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
            setStatus('Excel export downloaded.', 'ok');
        } else {
            downloadFile(csvContent, `wings-registrations-${stamp}.csv`, 'text/csv;charset=utf-8;');
            setStatus('CSV export downloaded.', 'ok');
        }
    };

    const handleLogout = async () => {
        try {
            await adminLogout();
        } finally {
            navigate('/admin-login?from=logout', { replace: true });
        }
    };

    const handleClickOutsideMenu = (e) => {
        if (menuOpen && !e.target.closest('.controls-menu-wrap')) {
            setMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleClickOutsideMenu);
        return () => document.removeEventListener('click', handleClickOutsideMenu);
    });

    return (
        <div className="admin-dashboard-body">
            <div className="wrap">
                <div className="head">
                    <h1>WINGS 2k26 Admin Dashboard</h1>
                    <div className="head-logo" aria-label="Pydah logo">
                        <img src="/assets/pydah-logo.jpeg" alt="Pydah Logo" />
                    </div>
                </div>

                <div className="panel">
                    <div className="controls-navbar">
                        <input
                            id="searchInput"
                            type="text"
                            placeholder="Search name, email, reg ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            id="eventFilter"
                            value={eventFilter}
                            onChange={(e) => setEventFilter(e.target.value)}
                        >
                            <option value="all">All Events</option>
                            {EVENT_OPTIONS.map((event) => (
                                <option key={event.value} value={event.value}>
                                    {event.label}
                                </option>
                            ))}
                        </select>
                        <div className="controls-menu-wrap">
                            <button
                                id="menuBtn"
                                className="btn-secondary menu-btn"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen(!menuOpen)}
                            >
                                {menuOpen ? 'Menu ▴' : 'Menu ▾'}
                            </button>
                            <div id="menuPanel" className={`controls-menu${menuOpen ? ' open' : ''}`}>
                                <select
                                    id="limit"
                                    value={limit}
                                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                                >
                                    <option value={20}>Last 20</option>
                                    <option value={50}>Last 50</option>
                                    <option value={100}>Last 100</option>
                                </select>
                                <select
                                    id="sortOrder"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                                <button id="refreshBtn" onClick={handleRefresh}>
                                    Refresh Data
                                </button>
                                <button
                                    id="exportCsvBtn"
                                    className="btn-secondary"
                                    onClick={() => handleExport('csv')}
                                >
                                    Export CSV
                                </button>
                                <button
                                    id="exportExcelBtn"
                                    className="btn-secondary"
                                    onClick={() => handleExport('excel')}
                                >
                                    Export Excel
                                </button>
                                <button id="logoutBtn" className="logout-btn" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="status" className={`status ${statusType}`}>
                        {statusMessage}
                    </div>

                    {showCloseConfirmPopup ? (
                        <div className="close-confirm-overlay" role="presentation">
                            <div className="close-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="closeConfirmTitle">
                                <h3 id="closeConfirmTitle">Confirm Closing Registrations</h3>
                                <p>
                                    This will immediately block new registrations on the website.
                                    Do you want to proceed?
                                </p>
                                <div className="close-confirm-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowCloseConfirmPopup(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePopupCloseConfirm}
                                        disabled={isUpdatingRegistrationStatus}
                                    >
                                        Yes, Close Registrations
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="registration-control-panel">
                        <div className="registration-control-head">
                            <h3>Registration Access Control</h3>
                            <span className={`registration-state ${registrationControl.isOpen ? 'open' : 'closed'}`}>
                                {registrationControl.isOpen ? 'OPEN' : 'CLOSED'}
                            </span>
                        </div>
                    
                        <div className="registration-control-actions">
                            <div className="registration-control-buttons">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleToggleRegistrations(false)}
                                    disabled={isUpdatingRegistrationStatus || registrationControl.isOpen === false}
                                >
                                    Close Registrations
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleRegistrations(true)}
                                    disabled={isUpdatingRegistrationStatus || registrationControl.isOpen === true}
                                >
                                    Open Registrations
                                </button>
                            </div>
                        </div>
                    </div>

                    {selectedRegistration && (
                        <div className="selected-response-panel">
                            <div className="selected-response-head">
                                <h3>Registrant Details</h3>
                                <div className="selected-response-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => handleDownloadSingleResponse(selectedRegistration)}
                                    >
                                        Download This Response
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => handleDownloadAllAbstractPdfs(selectedRegistration)}
                                    >
                                        Download Abstract PDFs
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setSelectedRegistration(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            <div className="selected-response-grid">
                                <div><strong>Name:</strong> {selectedRegistration.name || '-'}</div>
                                <div><strong>Reg ID:</strong> {selectedRegistration.regId || '-'}</div>
                                <div><strong>Email:</strong> {selectedRegistration.email || '-'}</div>
                                <div><strong>Phone:</strong> {selectedRegistration.phone || '-'}</div>
                                <div><strong>College:</strong> {selectedRegistration.college || '-'}</div>
                                <div><strong>Department / Year:</strong> {selectedRegistration.department || '-'} / {selectedRegistration.year || '-'}</div>
                                <div><strong>Participation:</strong> {selectedRegistration.participationType || 'individual'}</div>
                                <div><strong>Team Name:</strong> {selectedRegistration.teamName || '-'}</div>
                                <div className="full"><strong>Team Members:</strong> {(selectedRegistration.teamMembers || []).join(', ') || '-'}</div>
                                <div className="full"><strong>Events:</strong> {(selectedRegistration.events || []).map((event) => formatEventName(event)).join(', ') || '-'}</div>
                                <div><strong>Technical Submission:</strong> {getTechnicalSubmissionStatus(selectedRegistration)}</div>
                                <div className="full">
                                    <strong>Technical Event Details:</strong>{' '}
                                    {Object.keys(selectedRegistration.eventDetails || {}).length === 0 ? (
                                        '-'
                                    ) : (
                                        <div className="meta event-details-list">
                                            {Object.entries(selectedRegistration.eventDetails || {}).map(([eventKey, details]) => (
                                                <div key={eventKey} className="event-details-item">
                                                    <div>
                                                        <strong>{formatEventName(eventKey)}:</strong>
                                                    </div>
                                                    <div>Topic: {details?.topic || '-'}</div>
                                                    <div>
                                                        Abstract PDF: {details?.abstractPdfName || details?.abstract ? (details?.abstractPdfName || 'Uploaded') : '-'}
                                                    </div>
                                                    {details?.abstractPdfDataUrl ? (
                                                        <div className="event-details-links">
                                                            <a
                                                                href={details.abstractPdfDataUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="event-details-pdf-link"
                                                            >
                                                                View PDF
                                                            </a>
                                                            <a
                                                                href={details.abstractPdfDataUrl}
                                                                download={details?.abstractPdfName || `${eventKey}-abstract.pdf`}
                                                                className="event-details-pdf-link"
                                                            >
                                                                Download PDF
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div><strong>Payment Ref:</strong> {selectedRegistration.paymentReference || '-'}</div>
                                <div><strong>Payment Status:</strong> {selectedRegistration.paymentStatus || 'submitted'}</div>
                                <div><strong>Payment Verified By:</strong> {selectedRegistration.paymentVerifiedBy || '-'}</div>
                                <div><strong>Payment Verified At:</strong> {formatDate(selectedRegistration.paymentVerifiedAt)}</div>
                                <div><strong>Validation:</strong> {selectedRegistration.validationStatus || 'pending'}</div>
                                <div><strong>Invite:</strong> {selectedRegistration.invitationStatus || 'queued'}</div>
                                <div className="full"><strong>Validation Message:</strong> {selectedRegistration.validationMessage || '-'}</div>
                                <div className="full"><strong>Created At:</strong> {formatDate(selectedRegistration.createdAt)}</div>
                                <div className="full response-payment-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'verified')}
                                    >
                                        {paymentUpdatingId === selectedRegistration.id ? 'Updating...' : 'Mark Verified'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'failed')}
                                    >
                                        Mark Failed
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'pending')}
                                    >
                                        Reset Pending
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>College</th>
                                    <th>Dept / Year</th>
                                    <th>Events</th>
                                    <th>Reg ID</th>
                                    <th>Team</th>
                                    <th>Payment</th>
                                    <th>Validation / Invite</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="rows">
                                {filteredRegistrations.length === 0 ? (
                                    <tr>
                                        <td className="empty" colSpan="12">
                                            {allRegistrations.length === 0
                                                ? 'No data loaded'
                                                : 'No registrations found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map((row, index) => (
                                        <tr key={row.id || row.regId || index}>
                                            <td data-label="#">{index + 1}</td>
                                            <td data-label="Name">{row.name}</td>
                                            <td data-label="Contact">
                                                <div>{row.email}</div>
                                                <div className="muted">{row.phone}</div>
                                            </td>
                                            <td data-label="College">{row.college}</td>
                                            <td data-label="Dept / Year">
                                                {row.department} / {row.year}
                                            </td>
                                            <td data-label="Events">
                                                {(row.events || []).map((event) => (
                                                    <span className="badge" key={event}>
                                                        {formatEventName(event)}
                                                    </span>
                                                ))}
                                            </td>
                                            <td data-label="Reg ID">{row.regId}</td>
                                            <td data-label="Team">
                                                <div className="meta">Type: {row.participationType || 'individual'}</div>
                                                <div className="meta">Team: {row.teamName || '-'}</div>
                                                <div className="meta">Members: {(row.teamMembers || []).join(', ') || '-'}</div>
                                            </td>
                                            <td data-label="Payment">
                                                <div className="meta">Ref: {row.paymentReference || '-'}</div>
                                                <div>
                                                    <span className="badge">
                                                        status: {escapeHtml(row.paymentStatus || 'submitted')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td data-label="Validation / Invite">
                                                <div>
                                                    <span className="badge">
                                                        validation: {escapeHtml(row.validationStatus || 'pending')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="badge">
                                                        invite: {escapeHtml(row.invitationStatus || 'queued')}
                                                    </span>
                                                </div>
                                                <div className="meta">
                                                    {escapeHtml(row.validationMessage || '-')}
                                                </div>
                                            </td>
                                            <td data-label="Created">{formatDate(row.createdAt)}</td>
                                            <td data-label="Actions">
                                                <div className="row-actions">
                                                    <button
                                                        type="button"
                                                        className="btn-secondary view-btn"
                                                        onClick={() => handleViewDetails(row)}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary view-btn"
                                                        disabled={!hasAbstractPdfs(row)}
                                                        onClick={() => handleDownloadAllAbstractPdfs(row)}
                                                        title={hasAbstractPdfs(row) ? 'Download uploaded abstract PDFs' : 'No abstract PDFs uploaded'}
                                                    >
                                                        Abstract PDFs
                                                    </button>
                                                    <button
                                                        className="delete-btn"
                                                        disabled={deletingId === row.id}
                                                        onClick={() => handleDelete(row.id, row.name)}
                                                    >
                                                        {deletingId === row.id ? 'Deleting...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
