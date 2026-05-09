import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db, recordActivity } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from './ThemeContext';
import './AIExam.css';

const FREE_LIMIT = 10;
const TOTAL_QUESTIONS = 100;

const SUBJECT_META = {
  physics:               { label: 'Physics',            type: 'Grade 12 Natural Science'  },
  chemistry:             { label: 'Chemistry',          type: 'Grade 12 Natural Science'  },
  biology:               { label: 'Biology',            type: 'Grade 12 Natural Science'  },
  mathematics:           { label: 'Mathematics',        type: 'Grade 12 Natural Science'  },
  history:               { label: 'History',            type: 'Grade 12 Social Science'   },
  geography:             { label: 'Geography',          type: 'Grade 12 Social Science'   },
  economics:             { label: 'Economics',          type: 'Grade 12 Social Science'   },
  civics:                { label: 'Civics',             type: 'Grade 12 Social Science'   },
  english:               { label: 'English',            type: 'Grade 12 Social Science'   },
  'remedial-physics':    { label: 'Physics',            type: 'Remedial Natural Science'  },
  'remedial-chemistry':  { label: 'Chemistry',          type: 'Remedial Natural Science'  },
  'remedial-biology':    { label: 'Biology',            type: 'Remedial Natural Science'  },
  'remedial-mathematics':{ label: 'Mathematics',        type: 'Remedial Natural Science'  },
  'remedial-history':    { label: 'History',            type: 'Remedial Social Science'   },
  'remedial-geography':  { label: 'Geography',          type: 'Remedial Social Science'   },
  'remedial-economics':  { label: 'Economics',          type: 'Remedial Social Science'   },
  'remedial-civics':     { label: 'Civics',             type: 'Remedial Social Science'   },
  'remedial-english':    { label: 'English',            type: 'Remedial Social Science'   },
};

const AIExam = () => {
  const { subject } = useParams();
  const history = useHistory();
  const { currentUser } = useAuth();
  const { darkMode } = useTheme();

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [timer, setTimer] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const meta = SUBJECT_META[subject] || { label: subject, type: 'Grade 12' };
  const progressKey = `${currentUser?.uid}_${subject}`;

  // Check if user has paid for this subject or full access
  const checkPaymentStatus = async (uid, email) => {
    try {
      const subjectMeta = SUBJECT_META[subject];
      const subjectLabel = subjectMeta?.label || subject;

      // Query by userId
      const q1 = query(
        collection(db, 'payments'),
        where('userId', '==', uid),
        where('status', '==', 'success')
      );
      const snap1 = await getDocs(q1);

      // Query by email as fallback
      const q2 = query(
        collection(db, 'payments'),
        where('userEmail', '==', email),
        where('status', '==', 'success')
      );
      const snap2 = await getDocs(q2);

      const allDocs = [...snap1.docs, ...snap2.docs];

      for (const d of allDocs) {
        const data = d.data();
        // Full access plan unlocks everything
        if (data.plan === 'full') return true;
        // Single subject — check if it matches
        if (data.plan === 'single') {
          const paidSubject = (data.subject || '').toLowerCase();
          if (
            paidSubject === subjectLabel.toLowerCase() ||
            paidSubject === subject.toLowerCase() ||
            paidSubject.includes(subjectLabel.toLowerCase())
          ) return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Payment check error:', e);
      return false;
    }
  };

  // Load saved progress or generate new
  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      try {
        // Check real payment status first
        const paid = await checkPaymentStatus(currentUser.uid, currentUser.email);
        setIsPaid(paid);

        const snap = await getDoc(doc(db, 'examProgress', progressKey));
        if (snap.exists()) {
          const data = snap.data();
          const isFallback = data.questions?.[0]?.question?.includes('Practice Question');
          if (data.questions?.length && !isFallback) {
            setQuestions(data.questions);
            setAnswers(data.answers || {});
            setCurrent(data.currentQuestion || 0);
            setTimer(data.timer || 0);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error('Load error:', e);
      }
      await generateQuestions();
    };
    load();
    // eslint-disable-next-line
  }, [subject, currentUser]);

  // Timer — counts up
  useEffect(() => {
    if (loading || examFinished || showPaywall) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [loading, examFinished, showPaywall]);

  // Auto-save every 15s
  useEffect(() => {
    if (!questions.length || examFinished) return;
    const id = setInterval(() => saveProgress(), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [questions, answers, current, timer, isPaid]);

  const generateQuestions = async () => {
    setGenerating(true);
    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'examQuestions'), 
        where('subject', '==', meta.label), 
        where('status', '==', 'approved')
      );
      const snap = await getDocs(q);
      const qs = snap.docs.map(doc => doc.data());
      
      // Shuffle questions to make it dynamic
      qs.sort(() => Math.random() - 0.5);
      
      // Select only up to 70 questions for the exam
      const selectedQs = qs.slice(0, 70);

      if (selectedQs.length === 0) {
        setQuestions([{ question: 'NO_QUESTIONS' }]);
      } else {
        // If a teacher only provided a few questions, cap at FREE_LIMIT if user hasn't paid? 
        // We'll just load all available and rely on the UI logic to block them if !isPaid and current >= FREE_LIMIT
        setQuestions(selectedQs);
        await persistProgress(selectedQs, {}, 0, 0, false);
        if (currentUser) {
          recordActivity(currentUser.uid, currentUser.email, 'Started Exam', `Subject: ${meta.label}`);
        }
      }
    } catch (err) {
      console.error("Error fetching exams:", err);
      setQuestions([{ question: 'NO_QUESTIONS' }]);
    }

    setGenerating(false);
    setLoading(false);
  };

  const persistProgress = async (qs, ans, cur, t, paid) => {
    if (!currentUser) return;
    setSavingProgress(true);
    try {
      await setDoc(
        doc(db, 'examProgress', progressKey),
        { uid: currentUser.uid, subject, questions: qs, answers: ans, currentQuestion: cur, timer: t, isPaid: paid, updatedAt: new Date() },
        { merge: true }
      );
    } catch (e) {
      console.error('Save error:', e);
    }
    setSavingProgress(false);
  };

  const saveProgress = useCallback(() => {
    persistProgress(questions, answers, current, timer, isPaid);
    // eslint-disable-next-line
  }, [questions, answers, current, timer, isPaid]);

  const handleAnswer = (index) => {
    if (examFinished) return;
    if (current >= FREE_LIMIT && !isPaid) { setShowPaywall(true); return; }
    setAnswers((prev) => ({ ...prev, [current]: index }));
  };

  const goNext = () => {
    const next = current + 1;
    if (next >= FREE_LIMIT && !isPaid) { setShowPaywall(true); return; }
    if (next >= questions.length) { finishExam(); return; }
    setShowExplanation(false);
    setCurrent(next);
  };

  const goPrev = () => { if (current > 0) { setShowExplanation(false); setCurrent(current - 1); } };

  const finishExam = () => {
    persistProgress(questions, answers, current, timer, isPaid);
    setExamFinished(true);
    setShowResult(true);
    if (currentUser) {
      // Need to compute score immediately here or use answers directly since getScore uses state
      let correct = 0;
      questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
      const total = Object.keys(answers).length;
      const pct = Math.round((correct / Math.max(total, 1)) * 100);
      recordActivity(currentUser.uid, currentUser.email, 'Finished Exam', `Subject: ${meta.label}, Score: ${pct}%`);
    }
  };

  const handlePayment = () => {
    persistProgress(questions, answers, current, timer, isPaid);
    history.push(`/dashboard?openPayment=1&subject=${encodeURIComponent(meta.label)}&subjectKey=${encodeURIComponent(subject)}`);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getScore = () => {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const total = Object.keys(answers).length;
    return { correct, total, pct: Math.round((correct / Math.max(total, 1)) * 100) };
  };

  const isEmptyBank = questions.length > 0 && questions[0]?.question === 'NO_QUESTIONS';

  // ── LOADING ──
  if (loading || generating) {
    return (
      <div className={`ai-exam-wrap ${darkMode ? 'dark' : 'light'}`}>
        <div className="ai-loading">
          <div className="ai-spinner" />
          <h3>{generating ? `Preparing ${meta.label} questions...` : 'Loading your exam...'}</h3>
          <p>Please wait a moment</p>
        </div>
      </div>
    );
  }

  // ── EMPTY QUESTION BANK ──
  if (isEmptyBank) {
    return (
      <div className={`ai-exam-wrap ${darkMode ? 'dark' : 'light'}`}>
        <div className="ai-loading">
          <div className="busy-icon">📭</div>
          <h3>No Questions Available</h3>
          <p>There are no approved questions for {meta.label} yet. Please check back later!</p>
          <button
            className="refresh-btn"
            style={{ marginTop: '0.75rem', background: 'transparent', border: '1px solid #ccc' }}
            onClick={() => history.push('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (showResult) {
    const { correct, total, pct } = getScore();
    return (
      <div className={`ai-exam-wrap ${darkMode ? 'dark' : 'light'}`}>
        <div className="ai-result-card">
          <div className="result-emoji">{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
          <h2>Exam Complete!</h2>
          <div className="result-score-ring">
            <span className="result-pct">{pct}%</span>
          </div>
          <p className="result-detail">{correct} correct out of {total} answered</p>
          <p className="result-time">Time: {formatTime(timer)}</p>
          <div className="result-actions">
            <button className="result-btn secondary" onClick={() => history.push('/dashboard')}>✕ Exit</button>
            <button className="result-btn primary" onClick={() => { setShowResult(false); setAnswers({}); setCurrent(0); setTimer(0); setExamFinished(false); generateQuestions(); }}>
              New Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className={`ai-exam-wrap ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="ai-exam-header">
        <div className="ai-exam-title">
          <span className="subject-badge">{meta.label}</span>
          <span className="subject-type">{meta.type}</span>
          {savingProgress && <span className="saving-dot">💾</span>}
        </div>
        <div className="header-right">
          <button className="refresh-btn" onClick={generateQuestions} title="Get new questions">🔄 Refresh</button>
          <div className="ai-timer">⏱ {formatTime(timer)}</div>
          <button className="close-btn" onClick={() => history.push('/dashboard')} title="Exit exam">✕</button>
        </div>
      </div>

      {/* Progress */}
      <div className="ai-progress-bar">
        <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="ai-progress-info">
        <span>Question {current + 1} / {questions.length}</span>
        <span>{Object.keys(answers).length} answered</span>
        {!isPaid && (
          <span className="free-badge">
            🆓 {current < FREE_LIMIT ? `${FREE_LIMIT - current} free left` : 'Free limit reached'}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="ai-question-card">
        <div className="q-number">Q{current + 1}</div>
        <p className="q-text">{q?.question}</p>
        <div className="q-options">
          {q?.options.map((opt, i) => {
            const isSelected = answers[current] === i;
            const isCorrect = examFinished && i === q.correct;
            const isWrong = examFinished && isSelected && i !== q.correct;
            return (
              <button
                key={i}
                className={`q-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={examFinished}
              >
                <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                <span className="opt-text">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation toggle — show after answering */}
        {answers[current] !== undefined && q?.explanation && (
          <div className="explanation-wrap">
            <button
              className={`explanation-toggle ${showExplanation ? 'open' : ''}`}
              onClick={() => setShowExplanation(v => !v)}
            >
              <span>💡 {showExplanation ? 'Hide Explanation' : 'Show Explanation'}</span>
              <span className="exp-arrow">{showExplanation ? '▲' : '▼'}</span>
            </button>
            {showExplanation && (
              <div className="explanation-box">
                <div className="exp-correct-label">
                  ✅ Correct Answer: <strong>{String.fromCharCode(65 + q.correct)}) {q.options[q.correct]}</strong>
                </div>
                <p className="exp-text">{q.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="ai-nav">
        <button className="ai-nav-btn" onClick={goPrev} disabled={current === 0}>← Prev</button>
        <div className="q-dots">
          {questions.slice(Math.max(0, current - 4), current + 5).map((_, idx) => {
            const ri = Math.max(0, current - 4) + idx;
            return (
              <span
                key={ri}
                className={`q-dot ${ri === current ? 'active' : ''} ${answers[ri] !== undefined ? 'done' : ''} ${ri >= FREE_LIMIT && !isPaid ? 'locked' : ''}`}
                onClick={() => {
                  if (ri >= FREE_LIMIT && !isPaid) { setShowPaywall(true); return; }
                  setCurrent(ri);
                }}
              />
            );
          })}
        </div>
        {current < questions.length - 1
          ? <button className="ai-nav-btn primary" onClick={goNext}>Next →</button>
          : <button className="ai-nav-btn finish" onClick={finishExam}>Finish ✓</button>
        }
      </div>

      {/* Paywall */}
      {showPaywall && (
        <div className="paywall-overlay">
          <div className={`paywall-card ${darkMode ? 'dark' : ''}`}>

            <div className="paywall-icon">🔒</div>
            <h2>Free Limit Reached</h2>
            <p>You've completed your <strong>10 free questions</strong> for</p>
            <p className="paywall-subject-name">{meta.label}</p>

            <div className="paywall-options">
              {/* Option 1: Pay for this subject only */}
              <div className="paywall-option" onClick={handlePayment}>
                <div className="paywall-option-header">
                  <span className="paywall-option-icon">📖</span>
                  <div>
                    <div className="paywall-option-title">Unlock {meta.label}</div>
                    <div className="paywall-option-desc">Full 100 questions for this subject</div>
                  </div>
                  <div className="paywall-option-price">ETB 99</div>
                </div>
              </div>

              {/* Option 2: Pay for all subjects */}
              <div className="paywall-option paywall-option-best" onClick={() => {
                persistProgress(questions, answers, current, timer, isPaid);
                history.push('/dashboard?openPayment=1&plan=full');
              }}>
                <div className="paywall-best-badge">Best Value</div>
                <div className="paywall-option-header">
                  <span className="paywall-option-icon">📚</span>
                  <div>
                    <div className="paywall-option-title">Unlock All Subjects</div>
                    <div className="paywall-option-desc">Natural, Social & Remedial — everything</div>
                  </div>
                  <div className="paywall-option-price">ETB 499</div>
                </div>
              </div>
            </div>

            <div className="paywall-features">
              <span>✅ 100 AI-generated questions per subject</span>
              <span>✅ Progress saved to your account</span>
              <span>✅ Detailed score & explanation</span>
              <span>✅ Unlimited retries with new questions</span>
            </div>

            <button className="paywall-btn" onClick={handlePayment}>
              💳 Pay ETB 99 — Unlock {meta.label}
            </button>

            <button
              className="paywall-recheck"
              onClick={async () => {
                const paid = await checkPaymentStatus(currentUser.uid, currentUser.email);
                if (paid) { setIsPaid(true); setShowPaywall(false); }
                else alert('No verified payment found yet. Complete your payment first.');
              }}
            >
              ✅ I already paid — Check again
            </button>

            <button className="paywall-cancel" onClick={() => { setShowPaywall(false); history.push('/dashboard'); }}>
              ← Back to Dashboard
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default AIExam;
