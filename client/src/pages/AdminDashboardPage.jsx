import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    checkAdminSession,
    fetchRegistrations,
    deleteRegistration as deleteRegistrationApi,
    restoreRegistration as restoreRegistrationApi,
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

const buildSingleRegistrationPdf = async (row, filename) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    const lineGap = 16;
    let y = margin;

    const ensureSpace = (requiredHeight = lineGap) => {
        if (y + requiredHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    const addHeading = (text) => {
        ensureSpace(24);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(text, margin, y);
        y += 20;
    };

    const addField = (label, value) => {
        const safeValue = String(value ?? '').trim() || '-';
        const lines = doc.splitTextToSize(`${label}: ${safeValue}`, maxWidth);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        lines.forEach((line) => {
            ensureSpace(lineGap);
            doc.text(line, margin, y);
            y += lineGap;
        });
    };

    const eventDetails = row?.eventDetails && typeof row.eventDetails === 'object'
        ? row.eventDetails
        : {};

    addHeading('WINGS 2k26 - Registration Response');
    addField('Name', row?.name);
    addField('Registration ID', row?.regId);
    addField('Email', row?.email);
    addField('Phone', row?.phone);
    addField('College', row?.college);
    addField('Department / Year', `${row?.department || '-'} / ${row?.year || '-'}`);
    addField('Participation Type', row?.participationType || 'individual');
    addField('Team Name', row?.teamName);
    addField('Team Members', (row?.teamMembers || []).join(', '));
    addField('Events', (row?.events || []).map((event) => formatEventName(event)).join(', '));
    addField('Technical Submission', getTechnicalSubmissionStatus(row));

    addHeading('Payment & Validation');
    addField('Payment Reference', row?.paymentReference);
    addField('Payment Status', row?.paymentStatus || 'submitted');
    addField('Payment Verified By', row?.paymentVerifiedBy);
    addField('Payment Verified At',
        String(row?.paymentStatus || '').toLowerCase() === 'verified'
            ? formatDate(row?.paymentVerifiedAt)
            : ''
    );
    addField('Validation Status', row?.validationStatus || 'pending');
    addField('Invitation Status', row?.invitationStatus || 'queued');
    addField('Validation Message', row?.validationMessage);
    addField('Created At', formatDate(row?.createdAt));

    addHeading('Technical Event Details');
    if (Object.keys(eventDetails).length === 0) {
        addField('Details', '-');
    } else {
        Object.entries(eventDetails).forEach(([eventKey, details]) => {
            addField('Event', formatEventName(eventKey));
            addField('Topic', details?.topic || '-');
            addField(
                'Abstract PDF',
                details?.abstractPdfName || (details?.abstractPdfDataUrl ? 'Uploaded PDF' : '-')
            );
            y += 6;
        });
    }

    doc.save(filename);
};

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

const getPaymentBadgeClass = (status) => {
    const value = String(status || 'submitted').toLowerCase();
    if (value === 'verified') return 'badge badge-success';
    if (value === 'failed') return 'badge badge-danger';
    return 'badge badge-warn';
};

const getValidationBadgeClass = (status) => {
    const value = String(status || 'pending').toLowerCase();
    if (value === 'approved') return 'badge badge-success';
    if (value === 'rejected') return 'badge badge-danger';
    return 'badge badge-warn';
};

const getInviteBadgeClass = (status) => {
    const value = String(status || 'queued').toLowerCase();
    if (value === 'sent') return 'badge badge-success';
    if (value === 'failed') return 'badge badge-danger';
    return 'badge badge-info';
};

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
    const [restoringId, setRestoringId] = useState(null);
    const [paymentUpdatingId, setPaymentUpdatingId] = useState(null);
    const [isTrashView, setIsTrashView] = useState(false);
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

    const loadRegistrations = useCallback(async (currentLimit, trashView = isTrashView) => {
        const ok = await checkAdminSession();
        if (!ok) {
            navigate('/admin-login', { replace: true });
            return;
        }
        setStatus(trashView ? 'Loading trashed registrations...' : 'Loading registrations...');
        try {
            const result = await fetchRegistrations(currentLimit, { onlyDeleted: trashView });
            const scopedRows = (Array.isArray(result.data) ? result.data : []).filter((row) =>
                trashView ? row?.isDeleted === true : row?.isDeleted !== true
            );
            const data = sortByRegistrationTimeDesc(scopedRows);
            setAllRegistrations(data);
            setStatus(
                trashView
                    ? `Loaded ${data.length} trashed registration(s).`
                    : `Loaded ${data.length} registration(s).`,
                'ok'
            );
            return data;
        } catch (error) {
            setAllRegistrations([]);
            setFilteredRegistrations([]);
            setStatus(error.message || 'Unexpected error occurred.', 'err');
            return [];
        }
    }, [isTrashView, navigate]);

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

    useEffect(() => {
        if (!selectedRegistration) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedRegistration(null);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedRegistration]);

    const handleRefresh = async () => {
        await loadRegistrationControl();
        const data = await loadRegistrations(limit, isTrashView);
        if (data) applyFilters(data, searchQuery, eventFilter, sortOrder);
    };

    const handleToggleTrashView = async () => {
        const nextView = !isTrashView;
        setIsTrashView(nextView);
        setSelectedRegistration(null);
        const data = await loadRegistrations(limit, nextView);
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
        const data = await loadRegistrations(newLimit, isTrashView);
        if (data) applyFilters(data, searchQuery, eventFilter, sortOrder);
    };

    const handleDelete = async (row) => {
        const deleteKey = row?.regId || row?.id;
        const confirmed = window.confirm(
            `Delete registration for ${row?.name || 'this user'} (${row?.regId || 'no reg id'})? This cannot be undone.`
        );
        if (!confirmed) return;

        setDeletingId(deleteKey);
        setStatus('Deleting registration...');

        try {
            await deleteRegistrationApi({ id: row?.id, regId: row?.regId });
            setStatus('Registration moved to trash.', 'ok');
            await handleRefresh();
        } catch (error) {
            setStatus(error.message || 'Could not delete registration.', 'err');
        } finally {
            setDeletingId(null);
        }
    };

    const handleRestore = async (row) => {
        const restoreKey = row?.regId || row?.id;
        if (!row?.regId) {
            setStatus('Cannot restore this record. Missing registration ID.', 'err');
            return;
        }

        setRestoringId(restoreKey);
        setStatus('Restoring registration from trash...');

        try {
            await restoreRegistrationApi(row.regId, 'admin');
            setStatus('Registration restored successfully.', 'ok');
            await handleRefresh();
        } catch (error) {
            setStatus(error.message || 'Could not restore registration.', 'err');
        } finally {
            setRestoringId(null);
        }
    };

    const handleViewDetails = (row) => {
        setSelectedRegistration(row);
        setStatus(`Viewing details for ${row?.name || row?.regId || 'selected registrant'}.`, 'ok');
    };

    const handleDownloadSingleResponse = async (row) => {
        if (!row) {
            setStatus('Select a registration first.', 'err');
            return;
        }

        const safeId = String(row.regId || row.name || 'registrant')
            .trim()
            .replace(/[^a-zA-Z0-9-_]+/g, '-');
        const stamp = new Date().toISOString().slice(0, 10);
        try {
            await buildSingleRegistrationPdf(row, `wings-registration-response-${safeId}-${stamp}.pdf`);
            setStatus('Selected registration response PDF downloaded.', 'ok');
        } catch (error) {
            setStatus(error?.message || 'Could not generate PDF right now.', 'err');
        }
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
            const viewForReload = row?.isDeleted === true ? true : isTrashView;
            const data = await loadRegistrations(limit, viewForReload);
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
                                type="button"
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
                                <button id="refreshBtn" type="button" onClick={handleRefresh}>
                                    Refresh Data
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleToggleTrashView}
                                >
                                    {isTrashView ? 'Show Active Registrations' : 'Show Trash'}
                                </button>
                                <button
                                    id="exportCsvBtn"
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleExport('csv')}
                                >
                                    Export CSV
                                </button>
                                <button
                                    id="exportExcelBtn"
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleExport('excel')}
                                >
                                    Export Excel
                                </button>
                                <button id="logoutBtn" type="button" className="logout-btn" onClick={handleLogout}>
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
                        <div
                            className="details-modal-overlay"
                            role="presentation"
                            onClick={() => setSelectedRegistration(null)}
                        >
                        <div
                            className="selected-response-panel details-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="selectedRegistrantTitle"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                className="details-modal-close"
                                aria-label="Close registrant details popup"
                                onClick={() => setSelectedRegistration(null)}
                            >
                                ×
                            </button>
                            <div className="selected-response-head">
                                <h3 id="selectedRegistrantTitle">Registrant Details</h3>
                                <div className="selected-response-actions">
                                    <button
                                        type="button"
                                        className="action-btn action-btn-secondary"
                                        onClick={() => handleDownloadSingleResponse(selectedRegistration)}
                                    >
                                        Download Response PDF
                                    </button>
                                    <button
                                        type="button"
                                        className="action-btn action-btn-secondary"
                                        onClick={() => handleDownloadAllAbstractPdfs(selectedRegistration)}
                                    >
                                        Download Abstract PDFs
                                    </button>
                                    <button
                                        type="button"
                                        className="action-btn action-btn-ghost"
                                        onClick={() => setSelectedRegistration(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            <div className="selected-response-kpis">
                                <span className={getPaymentBadgeClass(selectedRegistration.paymentStatus)}>
                                    Payment: {selectedRegistration.paymentStatus || 'submitted'}
                                </span>
                                <span className={getValidationBadgeClass(selectedRegistration.validationStatus)}>
                                    Validation: {selectedRegistration.validationStatus || 'pending'}
                                </span>
                                <span className={getInviteBadgeClass(selectedRegistration.invitationStatus)}>
                                    Invite: {selectedRegistration.invitationStatus || 'queued'}
                                </span>
                                <span className="badge badge-info">
                                    Technical: {getTechnicalSubmissionStatus(selectedRegistration)}
                                </span>
                            </div>
                            <div className="selected-response-grid">
                                <div><span className="detail-label">Name</span>{selectedRegistration.name || '-'}</div>
                                <div><span className="detail-label">Reg ID</span>{selectedRegistration.regId || '-'}</div>
                                <div><span className="detail-label">Email</span>{selectedRegistration.email || '-'}</div>
                                <div><span className="detail-label">Phone</span>{selectedRegistration.phone || '-'}</div>
                                <div><span className="detail-label">College</span>{selectedRegistration.college || '-'}</div>
                                <div><span className="detail-label">Department / Year</span>{selectedRegistration.department || '-'} / {selectedRegistration.year || '-'}</div>
                                <div><span className="detail-label">Participation</span>{selectedRegistration.participationType || 'individual'}</div>
                                <div><span className="detail-label">Team Name</span>{selectedRegistration.teamName || '-'}</div>
                                <div className="full"><span className="detail-label">Team Members</span>{(selectedRegistration.teamMembers || []).join(', ') || '-'}</div>
                                <div className="full"><span className="detail-label">Events</span>{(selectedRegistration.events || []).map((event) => formatEventName(event)).join(', ') || '-'}</div>
                                <div className="full">
                                    <span className="detail-label">Technical Event Details</span>
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
                                <div><span className="detail-label">Payment Ref</span>{selectedRegistration.paymentReference || '-'}</div>
                                <div><span className="detail-label">Payment Verified By</span>{selectedRegistration.paymentVerifiedBy || '-'}</div>
                                <div>
                                    <span className="detail-label">Payment Verified At</span>
                                    {String(selectedRegistration.paymentStatus || '').toLowerCase() === 'verified'
                                        ? formatDate(selectedRegistration.paymentVerifiedAt)
                                        : ''}
                                </div>
                                <div><span className="detail-label">Created At</span>{formatDate(selectedRegistration.createdAt)}</div>
                                <div className="full"><span className="detail-label">Validation Message</span>{selectedRegistration.validationMessage || '-'}</div>
                                <div className="full response-payment-actions">
                                    <button
                                        type="button"
                                        className="action-btn action-btn-primary"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'verified')}
                                    >
                                        {paymentUpdatingId === selectedRegistration.id ? 'Updating...' : 'Mark Verified'}
                                    </button>
                                    <button
                                        type="button"
                                        className="action-btn action-btn-danger"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'failed')}
                                    >
                                        Mark Failed
                                    </button>
                                    <button
                                        type="button"
                                        className="action-btn action-btn-ghost"
                                        disabled={paymentUpdatingId === selectedRegistration.id}
                                        onClick={() => handlePaymentStatusUpdate(selectedRegistration, 'pending')}
                                    >
                                        Reset Pending
                                    </button>
                                </div>
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
                                        <tr key={row.regId || row.id || index}>
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
                                                    <span className={getPaymentBadgeClass(row.paymentStatus)}>
                                                        status: {escapeHtml(row.paymentStatus || 'submitted')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td data-label="Validation / Invite">
                                                <div>
                                                    <span className={getValidationBadgeClass(row.validationStatus)}>
                                                        validation: {escapeHtml(row.validationStatus || 'pending')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className={getInviteBadgeClass(row.invitationStatus)}>
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
                                                        className="action-btn action-btn-primary view-btn"
                                                        onClick={() => handleViewDetails(row)}
                                                    >
                                                        View
                                                    </button>
                                                    {isTrashView ? (
                                                        <button
                                                            type="button"
                                                            className="action-btn action-btn-secondary view-btn"
                                                            disabled={restoringId === (row.regId || row.id)}
                                                            onClick={() => handleRestore(row)}
                                                        >
                                                            {restoringId === (row.regId || row.id) ? 'Restoring...' : 'Restore'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="action-btn action-btn-secondary view-btn"
                                                                disabled={!hasAbstractPdfs(row)}
                                                                onClick={() => handleDownloadAllAbstractPdfs(row)}
                                                                title={hasAbstractPdfs(row) ? 'Download uploaded abstract PDFs' : 'No abstract PDFs uploaded'}
                                                            >
                                                                Abstract PDFs
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="action-btn action-btn-danger delete-btn"
                                                                disabled={deletingId === (row.regId || row.id)}
                                                                onClick={() => handleDelete(row)}
                                                            >
                                                                {deletingId === (row.regId || row.id) ? 'Deleting...' : 'Delete'}
                                                            </button>
                                                        </>
                                                    )}
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
