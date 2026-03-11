import React, { useState } from 'react';
import QRScanner from '../components/QRScanner';
import { fetchRegistrationDetailsByIdOrEmail } from '../services/api';
import '../styles/admin.css';

const OnlineVerificationPage = () => {
  const [verifyId, setVerifyId] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrScanResult, setQrScanResult] = useState('');

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
      <h2>Online Registration Verification</h2>
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
        </div>
      )}
      {verifyResult === 'notfound' && <p className="error">No registration found for this ID/email.</p>}
    </div>
  );
};

export default OnlineVerificationPage;
