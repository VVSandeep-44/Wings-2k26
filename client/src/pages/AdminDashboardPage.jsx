import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    checkAdminSession,
    fetchRegistrations,
    deleteRegistration as deleteRegistrationApi,
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

const buildCsv = (rows) => {
    const headers = [
        'Name', 'Email', 'Phone', 'College', 'Department', 'Year',
        'Events', 'Registration ID', 'Participation Type', 'Team Name', 'Team Members', 'Payment Reference', 'Payment Status', 'Validation Status', 'Invitation Status',
        'Validation Message', 'Created At',
    ];
    const lines = [headers.join(',')];
    rows.forEach((row) => {
        lines.push(
            [
                escapeCsv(row.name), escapeCsv(row.email), escapeCsv(row.phone),
                escapeCsv(row.college), escapeCsv(row.department), escapeCsv(row.year),
                escapeCsv((row.events || []).join(' | ')), escapeCsv(row.regId),
                escapeCsv(row.participationType || 'individual'),
                escapeCsv(row.teamName || ''),
                escapeCsv((row.teamMembers || []).join(' | ')),
                escapeCsv(row.paymentReference || ''),
                escapeCsv(row.paymentStatus || 'submitted'),
                escapeCsv(row.validationStatus || 'pending'),
                escapeCsv(row.invitationStatus || 'queued'),
                escapeCsv(row.validationMessage || ''),
                escapeCsv(formatDate(row.createdAt)),
            ].join(',')
        );
    });
    return lines.join('\n');
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
    const [limit, setLimit] = useState(20);
    const [menuOpen, setMenuOpen] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    const setStatus = (message, type = '') => {
        setStatusMessage(message);
        setStatusType(type);
    };

    const applyFilters = useCallback(
        (data, query, selectedEvent) => {
            const q = query.trim().toLowerCase();
            const filtered = data.filter((row) => {
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
            if (data.length > 0) {
                setStatus(`Showing ${filtered.length} of ${data.length} registration(s).`, 'ok');
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
            const data = result.data || [];
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

    useEffect(() => {
        const init = async () => {
            const ok = await checkAdminSession();
            if (!ok) {
                navigate('/admin-login', { replace: true });
                return;
            }
            const data = await loadRegistrations(limit);
            if (data) applyFilters(data, searchQuery, eventFilter);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        applyFilters(allRegistrations, searchQuery, eventFilter);
    }, [searchQuery, eventFilter, allRegistrations, applyFilters]);

    const handleRefresh = async () => {
        const data = await loadRegistrations(limit);
        if (data) applyFilters(data, searchQuery, eventFilter);
    };

    const handleLimitChange = async (newLimit) => {
        setLimit(newLimit);
        const data = await loadRegistrations(newLimit);
        if (data) applyFilters(data, searchQuery, eventFilter);
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

    const handleExport = (type) => {
        if (!filteredRegistrations.length) {
            setStatus('Load registrations before exporting.', 'err');
            return;
        }
        const csvContent = buildCsv(filteredRegistrations);
        const stamp = new Date().toISOString().slice(0, 10);
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
                            <option value="cultural">Cultural</option>
                            <option value="technical">Technical</option>
                            <option value="sports">Sports</option>
                            <option value="workshop">Workshop</option>
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
                                                        {event}
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
                                                <button
                                                    className="delete-btn"
                                                    disabled={deletingId === row.id}
                                                    onClick={() => handleDelete(row.id, row.name)}
                                                >
                                                    {deletingId === row.id ? 'Deleting...' : 'Delete'}
                                                </button>
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
