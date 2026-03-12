
import React, { useState } from 'react';
import QRScanner from '../components/QRScanner';
import { fetchRegistrationDetailsByIdOrEmail } from '../services/api';
import '../styles/admin.css';
import './OnlineVerificationPage.css';

// You can replace this with your actual logo path
import pydahFlag from '../../assets/PydahFlag.png';

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
    <div className="online-verification-bg">
      <div className="online-verification-header">
        <img src={pydahFlag} alt="Pydah Flag" className="online-verification-logo" />
        <span className="online-verification-title">WINGS 2K26<br /><span>Online Verification</span></span>
      </div>
      <div className="online-verification-card">
        <div className="online-verification-scanner">
          <QRScanner
            constraints={{ facingMode: 'environment' }}
            onResult={handleQRResult}
            style={{ width: '100%' }}
          />
        </div>
        <div className="online-verification-scaninfo">
          {qrScanResult ? `Scanned: ${qrScanResult}` : 'Align the QR code inside the box'}
        </div>
        <form onSubmit={handleVerify} className="online-verification-form">
          <label>Enter Email ID or Registered ID
            <div className="online-verification-form-row">
              <input
                type="text"
                value={verifyId}
                onChange={e => setVerifyId(e.target.value)}
                required
                placeholder="Enter Email ID or Registered ID"
              />
              <button type="submit" disabled={loading} className="online-verification-btn search" title="Search">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2"/><line x1="14.2" y1="14.2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
              <button type="button" onClick={() => { setVerifyId(''); setVerifyResult(null); setQrScanResult(''); }} className="online-verification-btn clear" title="Clear">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
          </label>
        </form>
        {verifyResult && verifyResult !== 'notfound' && (
          <div className="online-verification-result">
            <div className="ov-result-header">
              <span className="ov-result-verified" title="Verified">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/><polyline points="6,10.5 9,13.5 14,7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className="ov-result-name">{verifyResult.name}</span>
              <span className={`ov-result-status ${verifyResult.status === 'Verified' || verifyResult.validationStatus === 'Verified' ? 'verified' : 'not-verified'}`}>
                {verifyResult.status || verifyResult.validationStatus || verifyResult.paymentStatus || 'Pending'}
              </span>
            </div>
            <div className="ov-result-row">
              <div>
                <div className="ov-label">Email</div>
                <div className="ov-value">{verifyResult.email}</div>
              </div>
              <div>
                <div className="ov-label">Phone</div>
                <div className="ov-value">{verifyResult.phone}</div>
              </div>
            </div>
            <div className="ov-result-row">
              <div>
                <div className="ov-label">College</div>
                <div className="ov-value">{verifyResult.college}</div>
              </div>
              <div>
                <div className="ov-label">Department</div>
                <div className="ov-value">{verifyResult.department}</div>
              </div>
              <div>
                <div className="ov-label">Year</div>
                <div className="ov-value">{verifyResult.year}</div>
              </div>
            </div>
            <div className="ov-result-row ov-events-row">
              <div className="ov-label">Registered Events</div>
              <div className="ov-events-list">
                {(verifyResult.events || []).length > 0 ? (
                  verifyResult.events.map((ev, idx) => (
                    <span key={idx} className="ov-event-chip">{ev}</span>
                  ))
                ) : (
                  <span className="ov-value" style={{ fontStyle: 'italic' }}>None</span>
                )}
              </div>
            </div>
            <div className="ov-result-row ov-id-row">
              <div className="ov-label">Registration ID</div>
              <div className="ov-value ov-id-value">{verifyResult.regId}</div>
              <button type="button" title="Copy ID" onClick={() => navigator.clipboard.writeText(verifyResult.regId)} className="ov-copy-btn">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="5" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="2" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
              </button>
            </div>
            {verifyResult.admitCardUrl && (
              <div className="ov-print-row">
                <a href={verifyResult.admitCardUrl} target="_blank" rel="noopener noreferrer" className="ov-print-btn">Print Admit Card</a>
              </div>
            )}
          </div>
        )}
        {verifyResult === 'notfound' && <p className="error" style={{ color: '#ff6b6b', marginTop: 10, fontWeight: 600 }}>No registration found for this ID/email.</p>}
      </div>
    </div>
  );
};

export default OnlineVerificationPage;
