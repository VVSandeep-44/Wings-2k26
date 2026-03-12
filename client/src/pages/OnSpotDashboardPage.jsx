import React, { useState } from 'react';
import OnSpotNavbar from '../components/OnSpotNavbar';
import { fetchRegistrationDetailsByIdOrEmail } from '../services/api';
import QRScanner from '../components/QRScanner';
import '../styles/admin.css';

const OnSpotDashboard = () => {
  const [activeSection, setActiveSection] = useState('onspot');
  const [onSpotForm, setOnSpotForm] = useState({ name: '', email: '', phone: '' });
  const [verifyId, setVerifyId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');

  // Placeholder: Replace with real API calls
  const handleOnSpotSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('On-spot registration submitted!');
      setOnSpotForm({ name: '', email: '', phone: '' });
    }, 1000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setVerifyResult(null);
    try {
      const data = await fetchRegistrationDetailsByIdOrEmail(verifyId);
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult('notfound');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkVerified = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerifyResult((prev) => ({ ...prev, status: 'Verified' }));
    }, 1000);
  };

  // Auto-verify on QR scan
  const handleQRResult = async (result) => {
    if (!!result) {
      setQrScanResult(result?.text || '');
      setVerifyId(result?.text || '');
      setLoading(true);
      setVerifyResult(null);
      try {
        const data = await fetchRegistrationDetailsByIdOrEmail(result?.text || '');
        setVerifyResult(data);
      } catch (err) {
        setVerifyResult('notfound');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <OnSpotNavbar />
      <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #181c2f 0%, #2b2250 100%)' }}>
        {/* Separate container for sidebar and main content, below navbar */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          minHeight: 'calc(100vh - 64px)',
          marginTop: 0,
        }}>
          {/* Sidebar */}
            <div style={{
              minWidth: 240,
              maxWidth: 260,
              background: '#2d325a',
              border: '2px solid #ff2d95',
              borderRadius: '16px',
              margin: '32px 0 32px 32px',
              padding: '64px 0 32px 0', // Add top padding so links are always visible
              boxShadow: '0 4px 24px 0 #ff2d9580, 0 2px 8px rgba(0,0,0,0.18)',
              height: 'calc(100vh - 128px - 32px)', // Reduce height to avoid overlap
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              zIndex: 10,
            }}>
              <nav style={{ width: '100%' }}>
                <button
                  onClick={() => setActiveSection('onspot')}
                  style={{
                    display: 'block',
                    width: '90%',
                    margin: '18px auto 12px auto',
                    background: activeSection === 'onspot' ? 'linear-gradient(90deg, #ff2d95, #7c4dff)' : '#23264a',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    border: activeSection === 'onspot' ? '2px solid #fff' : '2px solid #444',
                    outline: 'none',
                    padding: '18px 0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: activeSection === 'onspot' ? '0 0 12px #ff2d95' : 'none',
                    transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                  }}
                >
                  On-Spot Registration
                </button>
                <button
                  onClick={() => setActiveSection('total')}
                  style={{
                    display: 'block',
                    width: '90%',
                    margin: '0 auto 12px auto',
                    background: activeSection === 'total' ? 'linear-gradient(90deg, #ff2d95, #7c4dff)' : '#23264a',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    border: activeSection === 'total' ? '2px solid #fff' : '2px solid #444',
                    outline: 'none',
                    padding: '18px 0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: activeSection === 'total' ? '0 0 12px #7c4dff' : 'none',
                    transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                  }}
                >
                  Total Registrations
                </button>
              </nav>
            </div>
            {/* Main content */}
            <main style={{
              width: '100%',
              padding: '32px 0 32px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginLeft: 32,
            }}>
              {activeSection === 'onspot' && (
                <section id="onspot-registration" style={{ width: '100%', maxWidth: 440, marginBottom: 48 }}>
                  <form className="onspot-form" onSubmit={handleOnSpotSubmit}>
                    <h3>On-Spot Registration</h3>
                    <label>Name:<input type="text" value={onSpotForm.name} onChange={e => setOnSpotForm({ ...onSpotForm, name: e.target.value })} required /></label>
                    <label>Email:<input type="email" value={onSpotForm.email} onChange={e => setOnSpotForm({ ...onSpotForm, email: e.target.value })} required /></label>
                    <label>Phone:<input type="tel" value={onSpotForm.phone} onChange={e => setOnSpotForm({ ...onSpotForm, phone: e.target.value })} required /></label>
                    <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Register'}</button>
                  </form>
                </section>
              )}
              {activeSection === 'total' && (
                <section id="total-registrations" style={{ width: '100%', maxWidth: 600 }}>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Total Registrations</h2>
                  {/* Registration stats or table goes here */}
                </section>
              )}
            </main>
          </div>
        </div>
    </>
  );
};

export default OnSpotDashboard;
