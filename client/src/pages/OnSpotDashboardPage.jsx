import React, { useState } from 'react';
import { fetchRegistrationDetailsByIdOrEmail } from '../services/api';
import QRScanner from '../components/QRScanner';
import '../styles/admin.css';

const OnSpotDashboard = () => {
  const [tab, setTab] = useState('onspot');
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
    <div className="admin-dashboard">
      <h2>On-Spot & Online Registration Dashboard</h2>
      <div className="dashboard-tabs">
        <button onClick={() => setTab('onspot')} className={tab === 'onspot' ? 'active' : ''}>On-Spot Registration</button>
        <button onClick={() => setTab('verify')} className={tab === 'verify' ? 'active' : ''}>Online Verification</button>
      </div>
      {tab === 'onspot' && (
        <form className="onspot-form" onSubmit={handleOnSpotSubmit}>
          <h3>On-Spot Registration</h3>
          <label>Name:<input type="text" value={onSpotForm.name} onChange={e => setOnSpotForm({ ...onSpotForm, name: e.target.value })} required /></label>
          <label>Email:<input type="email" value={onSpotForm.email} onChange={e => setOnSpotForm({ ...onSpotForm, email: e.target.value })} required /></label>
          <label>Phone:<input type="tel" value={onSpotForm.phone} onChange={e => setOnSpotForm({ ...onSpotForm, phone: e.target.value })} required /></label>
          <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Register'}</button>
        </form>
      )}
      {tab === 'verify' && (
        <div className="verify-section">
          <h3>Online Registration Verification</h3>
          <div style={{ maxWidth: 350, margin: '0 auto 1rem' }}>
            <QRScanner
              constraints={{ facingMode: 'environment' }}
              onResult={handleQRResult}
              style={{ width: '100%' }}
            />
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#555' }}>
              {qrScanResult ? `Scanned: ${qrScanResult}` : 'Scan QR code on Admit Card'}
            </div>
          </div>
          <form onSubmit={handleVerify} className="verify-form">
            <label>Registration ID or Email:<input type="text" value={verifyId} onChange={e => setVerifyId(e.target.value)} required /></label>
            <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
          </form>
          {verifyResult && verifyResult !== 'notfound' && (
            <div className="verify-result">
              <p><b>Name:</b> {verifyResult.name}</p>
              <p><b>Email:</b> {verifyResult.email}</p>
              <p><b>Phone:</b> {verifyResult.phone}</p>
              <p><b>College:</b> {verifyResult.college}</p>
              <p><b>Department:</b> {verifyResult.department}</p>
              <p><b>Year:</b> {verifyResult.year}</p>
              <p><b>Registered Events:</b> {(verifyResult.events || []).join(', ')}</p>
              <p><b>Registration ID:</b> {verifyResult.regId}</p>
              <p><b>Status:</b> {verifyResult.status || verifyResult.validationStatus || verifyResult.paymentStatus}</p>
              {/* Add more fields as needed */}
            </div>
          )}
          {verifyResult === 'notfound' && <p className="error">No registration found for this ID/email.</p>}
        </div>
      )}
    </div>
  );
};

export default OnSpotDashboard;
