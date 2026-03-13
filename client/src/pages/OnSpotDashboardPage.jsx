import React, { useEffect, useState, useMemo } from 'react';
import { FaUserPlus, FaListAlt } from 'react-icons/fa';
import OnSpotNavbar from '../components/OnSpotNavbar';
import {
  fetchRegistrations,
  submitRegistration,
  fetchRegistrationDetailsByIdOrEmail,
  sendAdmitCard,
} from '../services/api';
import QRScanner from '../components/QRScanner';
import '../styles/admin.css';

const DEFAULT_LIMIT = 100;

const OnSpotDashboard = () => {
  const [registrants, setRegistrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [onSpotForm, setOnSpotForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    collegeAddress: '',
    department: '',
    year: '',
    events: '',
    paymentId: '',
    isTeam: false,
    teamMembers: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('list');
  const [sendingId, setSendingId] = useState('');
  const [sendStatus, setSendStatus] = useState('');

  // Fetch all registrants (online + on-spot)
  const loadRegistrants = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchRegistrations(DEFAULT_LIMIT);
      setRegistrants(result.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load registrants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrants();
  }, []);

  // Add new on-spot registration
  const handleOnSpotSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const payload = { ...onSpotForm, registrationType: 'onspot' };
      const result = await submitRegistration(payload);
      if (result.success) {
        setFormSuccess('Registration successful!');
        setOnSpotForm({ name: '', email: '', phone: '', college: '', department: '', year: '' });
        loadRegistrants();
      } else {
        setFormError(result.message || 'Registration failed');
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setFormLoading(false);
    }
  };

  // Filtered registrants
  const filteredRegistrants = useMemo(() => {
    let data = registrants;
    if (filterType !== 'all') {
      data = data.filter((r) => (r.registrationType || 'online') === filterType);
    }
    if (filter) {
      const f = filter.toLowerCase();
      data = data.filter((r) =>
        (r.name && r.name.toLowerCase().includes(f)) ||
        (r.email && r.email.toLowerCase().includes(f)) ||
        (r.regId && r.regId.toLowerCase().includes(f)) ||
        (r.college && r.college.toLowerCase().includes(f))
      );
    }
    return data;
  }, [registrants, filter, filterType]);

  // Update handleSendAdmitCard
  const handleSendAdmitCard = async (regId, email) => {
    setSendingId(regId);
    setSendStatus(`Sending: email to ${email} ...`);
    try {
      await sendAdmitCard(regId);
      setSendStatus('Sent!');
    } catch (err) {
      setSendStatus('Failed to send: ' + (err.message || 'Error'));
    }
    setTimeout(() => {
      setSendStatus('');
      setSendingId('');
    }, 2000);
  };

  return (
    <>
      <OnSpotNavbar />
      {/* Add top padding to push content below navbar (navbar is fixed, height ~70px) */}
      <div className="onspot-dashboard-container" style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #181c2f 0%, #2b2250 100%)', paddingTop: 100 }}>
        <div style={{ minHeight: 'calc(100vh - 64px)', marginTop: 0, display: 'flex', flexDirection: 'row', width: '100%' }}>
          {/* Modern Sidebar with icons and hover */}
          <aside
            style={{
              position: 'fixed',
              top: 80,
              left: 0,
              height: 'calc(100vh - 80px)',
              width: 230,
              background: 'linear-gradient(160deg, #23264a 80%, #181c2f 100%)',
              borderRight: '2px solid #ff2d95',
              boxShadow: '2px 0 16px #0003',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: 32,
              zIndex: 100,
              gap: 8,
            }}
          >
            <div style={{ color: '#ffd166', fontWeight: 800, fontSize: '1.4rem', marginBottom: 36, letterSpacing: 1, textShadow: '0 2px 8px #0008' }}>Admin Panel</div>
            <button
              onClick={() => setActiveSection('list')}
              style={{
                width: '90%',
                margin: '0 0 12px 0',
                background: activeSection === 'list' ? 'linear-gradient(90deg, #ff2d95, #7c4dff)' : 'transparent',
                color: activeSection === 'list' ? '#fff' : '#ffd166',
                fontWeight: 700,
                fontSize: '1.08rem',
                border: activeSection === 'list' ? '2px solid #ffd166' : '2px solid transparent',
                outline: 'none',
                padding: '12px 0 12px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: activeSection === 'list' ? '0 0 12px #ff2d95' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.2s, border 0.2s, box-shadow 0.2s, color 0.2s',
              }}
              title="View all registrants"
            >
              <FaListAlt style={{ fontSize: 20, marginRight: 6 }} /> Dashboard
            </button>
            <button
              onClick={() => setActiveSection('add')}
              style={{
                width: '90%',
                margin: '0 0 12px 0',
                background: activeSection === 'add' ? 'linear-gradient(90deg, #ff2d95, #7c4dff)' : 'transparent',
                color: activeSection === 'add' ? '#fff' : '#ffd166',
                fontWeight: 700,
                fontSize: '1.08rem',
                border: activeSection === 'add' ? '2px solid #ffd166' : '2px solid transparent',
                outline: 'none',
                padding: '12px 0 12px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: activeSection === 'add' ? '0 0 12px #7c4dff' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'background 0.2s, border 0.2s, box-shadow 0.2s, color 0.2s',
              }}
              title="Add new on-spot registration"
            >
              <FaUserPlus style={{ fontSize: 20, marginRight: 6 }} /> Add Registration
            </button>
          </aside>
          {/* Main content shifted right for sidebar, with modern background */}
          <main style={{ width: '100%', maxWidth: '100%', padding: '24px 0 0 250px', display: 'block', marginLeft: 0, minHeight: 'calc(100vh - 80px)', background: 'linear-gradient(120deg, #23264a 60%, #2b2250 100%)' }}>
            {activeSection === 'add' && (
              <section id="onspot-registration" style={{
                width: '100%',
                maxWidth: '100%',
                marginBottom: 0,
                background: 'transparent',
                borderRadius: 0,
                padding: 0,
                boxShadow: 'none',
                border: 'none',
                position: 'relative',
                zIndex: 2,
              }}>
                <h2 style={{ color: '#ffd166', fontWeight: 800, fontSize: '2.1rem', marginBottom: 10, letterSpacing: 0.5, textAlign: 'left', textShadow: '0 2px 8px #0008' }}>
                  On-Spot Registration
                </h2>
                <div style={{ color: '#aaa', fontWeight: 400, fontSize: '1.1rem', marginBottom: 24, textAlign: 'left', maxWidth: 700 }}>
                  Please fill in the details below to register a participant. For team registrations, check the box and provide team member details.
                </div>
                <form className="onspot-form" onSubmit={handleOnSpotSubmit} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 32,
                  alignItems: 'start',
                  justifyItems: 'start',
                  maxWidth: 950,
                  background: 'rgba(20,22,40,0.98)',
                  borderRadius: 14,
                  padding: '32px 24px',
                  boxShadow: '0 4px 32px #0ff2, 0 2px 16px #ff2d9540',
                  border: '1.5px solid #2de0ff',
                  marginBottom: 32,
                  position: 'relative',
                }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.name}
                      onChange={e => setOnSpotForm({ ...onSpotForm, name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.name ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.name ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.name ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Name</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="tel"
                      value={onSpotForm.phone}
                      onChange={e => setOnSpotForm({ ...onSpotForm, phone: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.phone ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.phone ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.phone ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Mobile Number</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="email"
                      value={onSpotForm.email}
                      onChange={e => setOnSpotForm({ ...onSpotForm, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.email ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.email ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.email ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Email</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.college}
                      onChange={e => setOnSpotForm({ ...onSpotForm, college: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.college ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.college ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.college ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>College</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.collegeAddress}
                      onChange={e => setOnSpotForm({ ...onSpotForm, collegeAddress: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.collegeAddress ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.collegeAddress ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.collegeAddress ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>College Address</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.department}
                      onChange={e => setOnSpotForm({ ...onSpotForm, department: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.department ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.department ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.department ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Department</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.year}
                      onChange={e => setOnSpotForm({ ...onSpotForm, year: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.year ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.year ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.year ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Year</label>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.events}
                      onChange={e => setOnSpotForm({ ...onSpotForm, events: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.events ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.events ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.events ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Technical Events Participating</label>
                    <span style={{ color: '#5fffd7', fontSize: '0.88em', marginTop: 2, display: 'block' }}>e.g. Coding, Quiz, Robotics</span>
                  </div>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="text"
                      value={onSpotForm.paymentId}
                      onChange={e => setOnSpotForm({ ...onSpotForm, paymentId: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: onSpotForm.paymentId ? '22px 12px 6px 12px' : '14px 12px 6px 12px',
                        borderRadius: 8,
                        border: '1.5px solid #2de0ff',
                        background: 'rgba(30,32,60,0.98)',
                        color: '#e0f7fa',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border 0.2s, padding 0.2s',
                        marginBottom: 0,
                      }}
                      onFocus={e => e.target.parentNode.querySelector('label').style.top = '-12px'}
                      onBlur={e => {
                        if (!e.target.value) e.target.parentNode.querySelector('label').style.top = '6px';
                      }}
                    />
                    <label style={{
                      position: 'absolute',
                      left: 14,
                      top: onSpotForm.paymentId ? '-12px' : '6px',
                      color: '#2de0ff',
                      fontWeight: 500,
                      fontSize: onSpotForm.paymentId ? '0.8rem' : '0.93rem',
                      pointerEvents: 'none',
                      transition: '0.2s',
                      background: 'rgba(20,22,40,0.98)',
                      padding: '0 4px',
                    }}>Payment Transaction ID</label>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', fontWeight: 500, gridColumn: '1 / span 2', fontSize: '0.98rem', color: '#2de0ff', marginTop: 8 }}>
                    <input type="checkbox" checked={onSpotForm.isTeam} onChange={e => setOnSpotForm({ ...onSpotForm, isTeam: e.target.checked, teamMembers: '' })} style={{ marginRight: 10, accentColor: '#2de0ff', width: 16, height: 16 }} />
                    Team Registration
                  </label>
                  {onSpotForm.isTeam && (
                    <label style={{ display: 'flex', flexDirection: 'column', fontWeight: 500, gridColumn: '1 / span 2', color: '#2de0ff', marginTop: 8 }}>
                      Team Members (names/emails):
                      <textarea value={onSpotForm.teamMembers} onChange={e => setOnSpotForm({ ...onSpotForm, teamMembers: e.target.value })} rows={3} style={{ marginTop: 8, borderRadius: 8, border: '1.5px solid #2de0ff', padding: 10, fontSize: '0.98em', background: 'rgba(30,32,60,0.98)', color: '#e0f7fa', outline: 'none' }} />
                      <span style={{ color: '#5fffd7', fontSize: '0.88em', marginTop: 2 }}>Enter each member's name and email, one per line or comma separated.</span>
                    </label>
                  )}
                  <div style={{ gridColumn: '1 / span 2', marginTop: 16, textAlign: 'left' }}>
                    <button type="submit" disabled={formLoading} style={{
                      background: 'linear-gradient(90deg, #2de0ff, #5fffd7)',
                      color: '#181a2c',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      border: 'none',
                      borderRadius: 10,
                      padding: '12px 0',
                      width: '100%',
                      boxShadow: '0 2px 12px #2de0ff40',
                      cursor: 'pointer',
                      letterSpacing: 0.3,
                      transition: 'background 0.2s, box-shadow 0.2s',
                    }}>{formLoading ? 'Submitting...' : 'Register'}</button>
                    {formError && <div style={{ color: '#ff2d95', marginTop: 8, fontWeight: 600, fontSize: '0.98em' }}>{formError}</div>}
                    {formSuccess && <div style={{ color: '#5fffd7', marginTop: 8, fontWeight: 600, fontSize: '0.98em' }}>{formSuccess}</div>}
                  </div>
                </form>
              </section>
            )}
            {activeSection === 'list' && (
              <section id="all-registrants" style={{
                width: '100%',
                maxWidth: '100%',
                background: 'transparent',
                borderRadius: 0,
                padding: 0,
                boxShadow: 'none',
                border: 'none',
                position: 'relative',
                zIndex: 2,
              }}>
                <h2 style={{ color: '#ffd166', fontWeight: 800, fontSize: '2.1rem', marginBottom: 10, letterSpacing: 0.5, textAlign: 'left', textShadow: '0 2px 8px #0008' }}>
                  {filterType === 'online' ? 'Online Registrants' : filterType === 'onspot' ? 'On-Spot Registrants' : 'All Registrants'}
                </h2>
                <div style={{ color: '#aaa', fontWeight: 400, fontSize: '1.1rem', marginBottom: 24, textAlign: 'left', maxWidth: 700 }}>
                  {filterType === 'online'
                    ? 'View and manage all online registrants below.'
                    : filterType === 'onspot'
                    ? 'View and manage all on-spot registrants below.'
                    : 'View and manage all online and on-spot registrants below. Use the search and filter options to quickly find participants.'}
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  <input type="text" placeholder="Search by name, email, reg ID, college..." value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1.5px solid #888', minWidth: 220, fontSize: '1rem', background: '#23264a', color: '#fff' }} />
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1.5px solid #888', fontSize: '1rem', background: '#23264a', color: '#fff' }}>
                    <option value="all">All</option>
                    <option value="online">Online</option>
                    <option value="onspot">On-Spot</option>
                  </select>
                  <button onClick={loadRegistrants} style={{ padding: '10px 22px', borderRadius: 8, background: 'linear-gradient(90deg, #ff2d95, #7c4dff)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 8px #ff2d9540' }}>Refresh</button>
                </div>
                {loading ? (
                  <div style={{ color: '#aaa', padding: 16 }}>Loading registrants...</div>
                ) : error ? (
                  <div style={{ color: '#ff6b6b', padding: 16 }}>{error}</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'rgba(35,38,74,0.98)', color: '#fff', borderRadius: 12, overflow: 'hidden', fontSize: '1rem' }}>
                      <thead>
                        <tr style={{ background: '#181c2f' }}>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 120 }}>Name</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 180 }}>Email</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 110 }}>Phone</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 180, maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>College</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 110 }}>Department</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 70 }}>Year</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 120 }}>Reg ID</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 70 }}>Type</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 140 }}>Registered At</th>
                          <th style={{ padding: '14px 10px', textAlign: 'left', minWidth: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegistrants.length === 0 ? (
                          <tr><td colSpan={10} style={{ color: '#aaa', textAlign: 'center', padding: 24 }}>No registrants found.</td></tr>
                        ) : filteredRegistrants.map((r, idx) => (
                          <tr key={r.regId || r._id} style={{ borderBottom: '1px solid #333', background: idx % 2 === 0 ? 'rgba(35,38,74,0.98)' : '#23264a' }}>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', fontWeight: 600 }}>{r.name}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', wordBreak: 'break-all' }}>{r.email}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>{r.phone}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', maxWidth: 220, whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.college}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>{r.department}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>{r.year}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.98em' }}>{r.regId}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', textTransform: 'capitalize' }}>{r.registrationType || 'online'}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top' }}>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                            <td style={{ padding: '10px 10px', verticalAlign: 'top', display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => {
                                  // Construct admit card view URL (public view)
                                  const base = window.location.origin;
                                  const url = `${base}/registration/${encodeURIComponent(r.regId)}`;
                                  window.open(url, '_blank', 'noopener');
                                }}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: 8,
                                  background: '#2de0ff',
                                  color: '#23264a',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  boxShadow: '0 2px 8px #2de0ff40',
                                  marginRight: 0
                                }}
                              >
                                View Admit Card
                              </button>
                              <button onClick={() => handleSendAdmitCard(r.regId, r.email)} disabled={sendingId === r.regId} style={{ padding: '8px 14px', borderRadius: 8, background: '#ffd166', color: '#23264a', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 2px 8px #ffd16640' }}>
                                {sendingId === r.regId ? (sendStatus || 'Sending...') : 'Send Admit Card'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default OnSpotDashboard;
