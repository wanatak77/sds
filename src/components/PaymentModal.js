import React, { useState, useEffect } from 'react';
import { getPaymentConfig, submitManualPayment } from '../firebase';
import './PaymentModal.css';

// All available subjects
const ALL_SUBJECTS = [
  // Grade 12 Natural Science
  { key: 'physics',              label: 'Physics',            icon: '⚛️',  stream: 'Grade 12 Natural' },
  { key: 'chemistry',            label: 'Chemistry',          icon: '🧪',  stream: 'Grade 12 Natural' },
  { key: 'biology',              label: 'Biology',            icon: '🧬',  stream: 'Grade 12 Natural' },
  { key: 'mathematics',          label: 'Mathematics',        icon: '🔢',  stream: 'Grade 12 Natural' },
  // Grade 12 Social Science
  { key: 'history',              label: 'History',            icon: '📜',  stream: 'Grade 12 Social'  },
  { key: 'geography',            label: 'Geography',          icon: '🌍',  stream: 'Grade 12 Social'  },
  { key: 'economics',            label: 'Economics',          icon: '💰',  stream: 'Grade 12 Social'  },
  { key: 'civics',               label: 'Civics',             icon: '🏛️',  stream: 'Grade 12 Social'  },
  { key: 'english',              label: 'English',            icon: '📖',  stream: 'Grade 12 Social'  },
  // Remedial
  { key: 'remedial-physics',     label: 'Remedial Physics',   icon: '🔧',  stream: 'Remedial'         },
  { key: 'remedial-chemistry',   label: 'Remedial Chemistry', icon: '🧪',  stream: 'Remedial'         },
  { key: 'remedial-biology',     label: 'Remedial Biology',   icon: '🧬',  stream: 'Remedial'         },
  { key: 'remedial-mathematics', label: 'Remedial Math',      icon: '🔢',  stream: 'Remedial'         },
  { key: 'remedial-history',     label: 'Remedial History',   icon: '📜',  stream: 'Remedial'         },
  { key: 'remedial-geography',   label: 'Remedial Geography', icon: '🌍',  stream: 'Remedial'         },
  { key: 'remedial-economics',   label: 'Remedial Economics', icon: '💰',  stream: 'Remedial'         },
  { key: 'remedial-civics',      label: 'Remedial Civics',    icon: '🏛️',  stream: 'Remedial'         },
  { key: 'remedial-english',     label: 'Remedial English',   icon: '📖',  stream: 'Remedial'         },
];

const STREAMS = [...new Set(ALL_SUBJECTS.map(s => s.stream))];

// step: 'choose' | 'subjects' | 'confirm' | 'status'
const PaymentModal = ({ isOpen, onClose, userEmail, userName, userId }) => {
  const [step, setStep]               = useState('choose');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [plan, setPlan]               = useState(null); // 'full' | 'single'
  const [loading, setLoading]         = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({ phone: '', telegram: '', accountName: '' });
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        const config = await getPaymentConfig();
        setPaymentConfig(config);
      };
      fetchConfig();
    }
  }, [isOpen]);

  const reset = () => {
    setStep('choose');
    setSelectedSubject(null);
    setPlan(null);
    setLoading(false);
    setReceiptFile(null);
    setSubmitStatus(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleChooseFull = () => {
    setPlan('full');
    setSelectedSubject({ key: 'all', label: 'All Subjects', icon: '📚' });
    setStep('confirm');
  };

  const handleChooseSingle = () => {
    setPlan('single');
    setStep('subjects');
  };

  const handleSelectSubject = (subject) => {
    setSelectedSubject(subject);
    setStep('confirm');
  };

  const amount = plan === 'full' ? 500 : 50;

  const handleManualSubmit = async () => {
    if (!receiptFile) {
      alert('Please select a receipt screenshot first!');
      return;
    }
    setLoading(true);
    try {
      await submitManualPayment(
        userId, 
        userName,
        selectedSubject.key,
        selectedSubject.label,
        receiptFile
      );
      setSubmitStatus('success');
      setTimeout(() => {
        handleClose();
      }, 4000);
    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="pm-overlay" onClick={handleClose}>
      <div className="pm-sheet" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="pm-handle" />
        <div className="pm-header">
          {step !== 'choose' && submitStatus !== 'success' && (
            <button className="pm-back" onClick={() => setStep(step === 'confirm' && plan === 'single' ? 'subjects' : 'choose')}>
              ← Back
            </button>
          )}
          <span className="pm-title">
            {step === 'choose'   && '💳 Choose Plan'}
            {step === 'subjects' && '📚 Select Subject'}
            {step === 'confirm'  && '✅ Manual Payment'}
          </span>
          <button className="pm-close" onClick={handleClose}>✕</button>
        </div>

        {/* ══ STEP 1: Choose plan ══ */}
        {step === 'choose' && (
          <div className="pm-body">
            <p className="pm-subtitle">Select your access level:</p>

            <div className="pm-plan-card pm-full" onClick={handleChooseFull}>
              <div className="pm-plan-left">
                <div className="pm-plan-icon">📚</div>
                <div>
                  <div className="pm-plan-name">Full Access</div>
                  <div className="pm-plan-desc">Unlock every subject & stream</div>
                </div>
              </div>
              <div className="pm-plan-right">
                <div className="pm-plan-price">ETB 500</div>
              </div>
            </div>

            <div className="pm-plan-card pm-single" onClick={handleChooseSingle}>
              <div className="pm-plan-left">
                <div className="pm-plan-icon">📖</div>
                <div>
                  <div className="pm-plan-name">Single Subject</div>
                  <div className="pm-plan-desc">Pick one specific subject</div>
                </div>
              </div>
              <div className="pm-plan-right">
                <div className="pm-plan-price">ETB 50</div>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Subject list ══ */}
        {step === 'subjects' && (
          <div className="pm-body pm-subjects-body">
            <p className="pm-subtitle">Select one subject — ETB 50</p>
            {STREAMS.map(stream => (
              <div key={stream} className="pm-stream-group">
                <div className="pm-stream-label">{stream}</div>
                {ALL_SUBJECTS.filter(s => s.stream === stream).map(subject => (
                  <button
                    key={subject.key}
                    className="pm-subject-row"
                    onClick={() => handleSelectSubject(subject)}
                  >
                    <span className="pm-subject-icon">{subject.icon}</span>
                    <span className="pm-subject-name">{subject.label}</span>
                    <span className="pm-subject-arrow">›</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ══ STEP 3: Manual Payment Instructions ══ */}
        {step === 'confirm' && (
          <div className="pm-body">
            {submitStatus === 'success' ? (
              <div className="pm-status-screen">
                <div className="pm-success-icon">✓</div>
                <h3>Submitted Successfully!</h3>
                <p>Admin will verify your payment shortly. Access will be granted automatically.</p>
              </div>
            ) : (
              <>
                <div className="pm-instruction-box">
                  <p>Transfer <strong>ETB {amount}</strong> to the account below and send/upload the receipt.</p>
                </div>

                <div className="pm-creds-card">
                  <div className="pm-cred-item pm-copyable" onClick={() => {
                    navigator.clipboard.writeText(paymentConfig.phone);
                    alert('Telebirr number copied to clipboard!');
                  }}>
                    <div className="pm-cred-header">
                      <label>Telebirr Number</label>
                      <span className="pm-copy-badge">Click to Copy</span>
                    </div>
                    <div className="pm-val">
                      {paymentConfig.phone || '09xxxxxxxx'} 
                      <i className="fas fa-copy"></i>
                    </div>
                  </div>
                  <div className="pm-cred-item">
                    <label>Account Name</label>
                    <div className="pm-val">{paymentConfig.accountName || 'SDS TECH'}</div>
                  </div>
                </div>

                <div className="pm-action-links">
                  <a 
                    href={`https://t.me/${(paymentConfig.telegram || 'Sdsedu').replace('@','')}`} 
                    target="_blank" rel="noreferrer" 
                    className="pm-telegram-btn"
                  >
                    <i className="fab fa-telegram"></i> Send Receipt via Telegram
                  </a>
                  <p className="pm-telegram-hint">Click the button above to send your screenshot to admin for instant activation.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;

