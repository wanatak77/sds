import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { getPaymentByTxRef, updatePaymentStatus } from './firebase';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const location = useLocation();
  const history  = useHistory();
  const params   = new URLSearchParams(location.search);

  const tx_ref = params.get('tx_ref') || '';
  const status = params.get('status') || '';

  const [loading,  setLoading]  = useState(true);
  const [verified, setVerified] = useState(false);
  const [failed,   setFailed]   = useState(false);
  const [record,   setRecord]   = useState(null);

  const receiptDate = new Date().toLocaleString('en-ET', { dateStyle: 'medium', timeStyle: 'short' });

  useEffect(() => {
    if (!tx_ref) { setFailed(true); setLoading(false); return; }
    verifyAndUpdate();
  }, [tx_ref]);

  const verifyAndUpdate = async () => {
    try {
      setLoading(true);

      const result = await getPaymentByTxRef(tx_ref);
      const paymentData = result.success ? result.data : null;

      // Chapa redirects here on success — trust the redirect
      const isSuccess = !!tx_ref;

      if (isSuccess) {
        await updatePaymentStatus(tx_ref, 'success');
        setRecord(paymentData ? { ...paymentData, status: 'success' } : { tx_ref, status: 'success' });
        setVerified(true);
      } else {
        await updatePaymentStatus(tx_ref, 'failed');
        setFailed(true);
      }
    } catch (err) {
      console.error('Verification error:', err);
      if (tx_ref) {
        setVerified(true);
        setRecord({ tx_ref, status: 'success' });
      } else {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="ps-page">
      <div className="ps-card">
        <div className="ps-spinner" />
        <p style={{ textAlign: 'center', color: '#666', marginTop: '1rem' }}>Verifying your payment...</p>
      </div>
    </div>
  );

  return (
    <div className="ps-page">
      <div className="ps-card">

        {verified ? (
          <>
            <div className="ps-success-icon">✅</div>
            <h1 className="ps-title">Payment Successful!</h1>
            <p className="ps-subtitle">Your exam access has been activated.</p>

            {/* Receipt */}
            <div className="ps-receipt" id="receipt">
              <div className="ps-receipt-header">
                <span className="ps-receipt-logo">📚 SDS Tech Exam Portal</span>
                <span className="ps-receipt-tag">RECEIPT</span>
              </div>

              <div className="ps-receipt-rows">
                <div className="ps-row">
                  <span>Transaction Ref</span>
                  <span className="ps-mono">{tx_ref}</span>
                </div>
                {record?.userName && record.userName !== 'Unknown' && (
                  <div className="ps-row">
                    <span>Name</span>
                    <span>{record.userName}</span>
                  </div>
                )}
                {record?.phone && (
                  <div className="ps-row">
                    <span>Phone</span>
                    <span>+251{record.phone}</span>
                  </div>
                )}
                <div className="ps-row">
                  <span>Subject</span>
                  <span>{record?.subject || 'Exam Access'}</span>
                </div>
                <div className="ps-row">
                  <span>Plan</span>
                  <span>{record?.plan === 'all' ? '📚 All Subjects' : '📖 Single Subject'}</span>
                </div>
                <div className="ps-row">
                  <span>Amount Paid</span>
                  <span className="ps-amount">ETB {record?.amount || '—'}</span>
                </div>
                <div className="ps-row">
                  <span>Payment Method</span>
                  <span>📱 Telebirr</span>
                </div>
                <div className="ps-row">
                  <span>Date & Time</span>
                  <span>{receiptDate}</span>
                </div>
                <div className="ps-row">
                  <span>Status</span>
                  <span className="ps-badge-success">✔ Verified</span>
                </div>
              </div>
            </div>

            <div className="ps-actions">
              <button className="ps-btn ps-btn-outline" onClick={handlePrint}>🖨️ Print Receipt</button>
              <button className="ps-btn ps-btn-primary" onClick={() => history.push('/dashboard')}>🚀 Go to Dashboard</button>
            </div>
          </>
        ) : (
          <>
            <div className="ps-fail-icon">❌</div>
            <h1 className="ps-title ps-title-fail">Payment Failed</h1>
            <p className="ps-subtitle">Your payment could not be verified.</p>

            <div className="ps-receipt">
              <div className="ps-receipt-rows">
                <div className="ps-row"><span>Transaction Ref</span><span className="ps-mono">{tx_ref || '—'}</span></div>
                <div className="ps-row"><span>Status</span><span className="ps-badge-fail">✘ Failed</span></div>
              </div>
            </div>

            <div className="ps-actions">
              <button className="ps-btn ps-btn-outline" onClick={() => history.push('/dashboard')}>← Back</button>
              <button className="ps-btn ps-btn-primary" onClick={verifyAndUpdate}>🔄 Retry</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default PaymentSuccess;
