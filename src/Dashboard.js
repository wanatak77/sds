import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useHistory, useLocation } from "react-router-dom";
import { logout, getUserPayments, sendMessage, sendChunkedMessage, listenToMessages, uploadFile, getPaymentConfig, submitManualPayment } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from './firebase';
import { useTheme } from './ThemeContext';
import PaymentModal from './components/PaymentModal';
import { askGeneralQuestion } from './geminiService';
import './Dashboard.css';

class UserService {
  static async fetchUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  }
}

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const history = useHistory();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [examData, setExamData] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewLater, setReviewLater] = useState([]);
  const [examResults, setExamResults] = useState(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentSubject, setPaymentSubject] = useState({ key: 'full-access', label: 'Full Exam Access' });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [manualPaymentActive, setManualPaymentActive] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({ phone: '', telegram: '', accountName: '' });
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSubmitStatus, setManualSubmitStatus] = useState(null);
  const [paymentPlan, setPaymentPlan] = useState('single'); // 'single' or 'all'
  const [paidSubjects, setPaidSubjects] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // AI Chat State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Global Subject Configuration
  const allSubjects = [
    { key: 'physics',             icon: '⚛️',  label: 'Physics',            desc: 'Mechanics, Waves, Thermodynamics',     stream: 'natural'  },
    { key: 'chemistry',           icon: '🧪',  label: 'Chemistry',          desc: 'Organic, Inorganic, Physical',         stream: 'natural'  },
    { key: 'biology',             icon: '🧬',  label: 'Biology',            desc: 'Cell Biology, Genetics, Ecology',      stream: 'natural'  },
    { key: 'mathematics',         icon: '🔢',  label: 'Mathematics',        desc: 'Algebra, Calculus, Trigonometry',      stream: 'natural'  },
    { key: 'history',             icon: '📜',  label: 'History',            desc: 'Ethiopian & World History',            stream: 'social'   },
    { key: 'geography',           icon: '🌍',  label: 'Geography',          desc: 'Physical & Human Geography',           stream: 'social'   },
    { key: 'economics',           icon: '💰',  label: 'Economics',          desc: 'Micro, Macro, Development',            stream: 'social'   },
    { key: 'civics',              icon: '🏛️',  label: 'Civics',             desc: 'Democracy, Human Rights, Citizenship', stream: 'social'   },
    { key: 'english',             icon: '📖',  label: 'English',            desc: 'Grammar, Literature, Writing',         stream: 'social'   },
    { key: 'remedial-physics',    icon: '🔧',  label: 'Remedial Physics',   desc: 'Foundation Physics Concepts',          stream: 'remedial' },
    { key: 'remedial-chemistry',  icon: '🧪',  label: 'Remedial Chemistry', desc: 'Foundation Chemistry Concepts',        stream: 'remedial' },
    { key: 'remedial-biology',    icon: '🧬',  label: 'Remedial Biology',   desc: 'Foundation Life Sciences',             stream: 'remedial' },
    { key: 'remedial-mathematics',icon: '🔢',  label: 'Remedial Math',      desc: 'Foundation Mathematics',               stream: 'remedial' },
    { key: 'remedial-history',    icon: '📜',  label: 'Remedial History',   desc: 'Foundation Historical Concepts',       stream: 'remedial' },
    { key: 'remedial-geography',  icon: '🌍',  label: 'Remedial Geography', desc: 'Foundation Geography & Map Skills',    stream: 'remedial' },
    { key: 'remedial-economics',  icon: '💰',  label: 'Remedial Economics', desc: 'Foundation Economic Concepts',         stream: 'remedial' },
    { key: 'remedial-civics',     icon: '🏛️',  label: 'Remedial Civics',    desc: 'Foundation Civics & Citizenship',      stream: 'remedial' },
    { key: 'remedial-english',    icon: '📖',  label: 'Remedial English',   desc: 'Foundation Language Skills',           stream: 'remedial' },
  ];

  const streamConfig = [
    { key: 'natural',  label: '📗 Natural Science', color: '#1A237E', cardClass: 'grade12-natural' },
    { key: 'social',   label: '📘 Social Science',  color: '#2E7D32', cardClass: 'grade12-social'  },
    { key: 'remedial', label: '📙 Remedial',         color: '#FF6F00', cardClass: 'remedial-natural'},
  ];
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({ fullName: '', phoneNumber: '', course: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatUploading, setChatUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState(null); // New Preview State
  const [selectedFile, setSelectedFile] = useState(null); // New Pending File State
  const chatScrollRef = useRef();

  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
      if (!currentUser?.uid) return;
      
      try {
        const data = await UserService.fetchUserData(currentUser.uid);
        if (isMounted) {
          setUserData(data || { email: currentUser.email });
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    loadPaidSubjects();
    
    return () => { isMounted = false };
  }, [currentUser]);

  // Derived Access Logic
  const hasFullAccess = paidSubjects.some(p => p.plan === 'full' || p.subject === 'all' || p.subject === 'Full Exam Access' || p.subject === 'Full Access (All Subjects)');
  const unlockedKeys = hasFullAccess 
    ? allSubjects.map(s => s.key)
    : paidSubjects.filter(p => p.status === 'success' || p.status === 'approved').map(p => {
        const found = allSubjects.find(s => 
          s.label.toLowerCase() === (p.subject || '').toLowerCase() || 
          s.key === p.subject
        );
        return found?.key || p.subject;
      });


  useEffect(() => {
    let interval;
    if (isExamActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0 && isExamActive) {
      finishExam();
    }
    return () => clearInterval(interval);
  }, [isExamActive, timer]);

  // Chat Listener
  useEffect(() => {
    if (activeTab === 'support' && currentUser) {
      const chatId = `${currentUser.uid}_admin`;
      const unsubscribe = listenToMessages(chatId, (msgs) => {
        setChatMessages(msgs);
        setTimeout(() => chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubscribe();
    }
  }, [activeTab, currentUser]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview('file_icon'); // Placeholder for non-images
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedFile) || chatUploading || !currentUser) return;

    setChatUploading(true);
    const chatId = `${currentUser.uid}_admin`;
    const textToSend = chatInput;
    setChatInput('');
    
    try {
      let fileUrl = null;
      let type = 'text';
      let fileName = null;

      if (selectedFile) {
        type = selectedFile.type.startsWith('image/') ? 'image' : 'file';
        fileName = selectedFile.name;
        fileUrl = await uploadFile(selectedFile, `chats/${chatId}/${Date.now()}_${fileName}`, (p) => {
          setUploadProgress(Math.round(p));
        });
        setSelectedFile(null);
        setFilePreview(null);
      }

      console.log(`📡 Delivering ${type} message to ${chatId}. URL: ${fileUrl}`);
      await sendMessage(chatId, currentUser.uid, currentUser.email, textToSend, type, fileUrl, fileName);
    } catch (err) {
      console.error("❌ Send failed:", err);
      alert("⚠️ Failed to deliver message. Please check your connection.");
    }
    setChatUploading(false);
    setUploadProgress(0);
  };

  useEffect(() => {
    const fetchConfig = async () => {
      const cfg = await getPaymentConfig();
      setPaymentConfig(cfg);
    };
    fetchConfig();
  }, []);

  // Detect return from Telebirr payment
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setPaymentSuccess(true);
      history.replace('/dashboard');
      setTimeout(() => setPaymentSuccess(false), 6000);
    }
    // Auto-open payment modal from exam paywall redirect
    if (params.get('openPayment') === '1') {
      setPaymentModal(true);
      history.replace('/dashboard');
    }
  }, [location.search, history]);

  const openPaymentModal = (subjectKey, subjectLabel) => {
    setPaymentSubject({ key: subjectKey, label: subjectLabel });
    setPaymentModal(true);
  };

  const loadPaidSubjects = async () => {
    if (!currentUser?.uid) return;
    setActivityLoading(true);
    console.log('Loading paid subjects for:', currentUser.uid, currentUser.email);
    const result = await getUserPayments(currentUser.uid, currentUser.email);
    console.log('getUserPayments result:', result);
    if (result.success) setPaidSubjects(result.payments);
    else console.error('Failed to load paid subjects:', result.error);
    setActivityLoading(false);
  };

  // Load paid subjects when activity tab is opened
  useEffect(() => {
    if (activeTab === 'activity') loadPaidSubjects();
  }, [activeTab]);

  const startEditingProfile = () => {
    setEditedProfile({
      fullName:    userData?.fullName    || '',
      phoneNumber: userData?.phoneNumber || '',
      course:      userData?.course      || ''
    });
    setIsEditingProfile(true);
    setSaveMsg('');
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setSaveMsg('');
  };

  const handleProfileChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    if (!currentUser?.uid) return;
    setSavingProfile(true);
    setSaveMsg('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName:    editedProfile.fullName.trim(),
        phoneNumber: editedProfile.phoneNumber.trim(),
        course:      editedProfile.course.trim(),
        updatedAt:   new Date()
      });
      setUserData(prev => ({ ...prev, ...editedProfile }));
      setIsEditingProfile(false);
      setSaveMsg('✅ Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.error('Profile save error:', err);
      setSaveMsg('❌ Failed to save. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout(currentUser?.uid, currentUser?.email);
      history.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    const answer = await askGeneralQuestion(aiQuestion);
    setAiAnswer(answer);
    setAiLoading(false);
  };

  const navigateToPage = (page) => {
    history.push(`/${page}`);
  };

  const startExam = (examType) => {
    history.push(`/exam/${examType}`);
  };

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const toggleReviewLater = (questionId) => {
    setReviewLater(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const nextQuestion = () => {
    if (currentQuestion < examData.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      finishExam();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const finishExam = () => {
    setIsExamActive(false);
    const results = calculateResults();
    setExamResults(results);
    setActiveTab('results');
  };

  const calculateResults = () => {
    let correct = 0;
    let subjectScores = {};

    examData.questions.forEach(q => {
      if (answers[q.id] === q.correct) {
        correct++;
      }
      
      const subject = q.subject;
      if (!subjectScores[subject]) {
        subjectScores[subject] = { total: 0, correct: 0 };
      }
      subjectScores[subject].total++;
      if (answers[q.id] === q.correct) {
        subjectScores[subject].correct++;
      }
    });

    return {
      totalQuestions: examData.questions.length,
      correct,
      percentage: Math.round((correct / examData.questions.length) * 100),
      subjectScores,
      timeTaken: 1800 - timer
    };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderActivity = () => {
    // Derive unlocked subjects from paid records
    const hasFullAccess = paidSubjects.some(p => p.plan === 'full' || p.subject === 'all' || p.subject === 'Full Exam Access' || p.subject === 'Full Access (All Subjects)');

    const ALL_SUBJECTS_LIST = [
      { key: 'physics',              label: 'Physics',            icon: '⚛️',  stream: 'Grade 12 Natural' },
      { key: 'chemistry',            label: 'Chemistry',          icon: '🧪',  stream: 'Grade 12 Natural' },
      { key: 'biology',              label: 'Biology',            icon: '🧬',  stream: 'Grade 12 Natural' },
      { key: 'mathematics',          label: 'Mathematics',        icon: '🔢',  stream: 'Grade 12 Natural' },
      { key: 'history',              label: 'History',            icon: '📜',  stream: 'Grade 12 Social'  },
      { key: 'geography',            label: 'Geography',          icon: '🌍',  stream: 'Grade 12 Social'  },
      { key: 'economics',            label: 'Economics',          icon: '💰',  stream: 'Grade 12 Social'  },
      { key: 'civics',               label: 'Civics',             icon: '🏛️',  stream: 'Grade 12 Social'  },
      { key: 'english',              label: 'English',            icon: '📖',  stream: 'Grade 12 Social'  },
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

    // Build unlocked subject list
    const unlockedKeys = hasFullAccess
      ? ALL_SUBJECTS_LIST.map(s => s.key)
      : paidSubjects.map(p => {
          // match subject label to key
          const found = ALL_SUBJECTS_LIST.find(s =>
            s.label.toLowerCase() === (p.subject || '').toLowerCase() ||
            s.key === p.subject
          );
          return found?.key;
        }).filter(Boolean);

    const unlockedSubjects = ALL_SUBJECTS_LIST.filter(s => unlockedKeys.includes(s.key));
    const streams = [...new Set(unlockedSubjects.map(s => s.stream))];

    return (
      <div className="dashboard-content">
        <div className="activity-header">
          <h2 className="activity-title">📊 My Activity</h2>
          <p className="activity-subtitle">Your verified & paid subjects</p>
          <button className="activity-refresh-btn" onClick={loadPaidSubjects}>🔄 Refresh</button>
        </div>

        {activityLoading ? (
          <div className="activity-loading">
            <div className="spinner" />
            <p>Loading your subjects...</p>
          </div>
        ) : unlockedSubjects.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">🔒</div>
            <h3>No Subjects Unlocked Yet</h3>
            <p>Complete a payment to unlock subjects and see them here.</p>
            <button className="activity-pay-btn" onClick={() => setPaymentModal(true)}>
              💳 Get Access Now
            </button>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="activity-summary">
              {hasFullAccess ? (
                <div className="activity-badge full-badge">
                  ✅ Full Access — All {unlockedSubjects.length} Subjects Unlocked
                </div>
              ) : (
                <div className="activity-badge single-badge">
                  📖 {unlockedSubjects.length} Subject{unlockedSubjects.length > 1 ? 's' : ''} Unlocked
                </div>
              )}
            </div>

            {/* Payment history */}
            <div className="activity-payments">
              <h3 className="activity-section-title">Payment History</h3>
              {paidSubjects.map(p => (
                <div key={p.id} className="activity-payment-row">
                  <div className="activity-payment-icon">
                    {p.plan === 'full' ? '📚' : '📖'}
                  </div>
                  <div className="activity-payment-info">
                    <div className="activity-payment-subject">{p.subject}</div>
                    <div className="activity-payment-meta">
                      {p.createdAt instanceof Date
                        ? p.createdAt.toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                      {' · '}ETB {p.amount}
                    </div>
                  </div>
                  <div className="activity-payment-status">✅ Verified</div>
                </div>
              ))}
            </div>

            {/* Unlocked subjects grid */}
            {streams.map(stream => (
              <div key={stream} className="activity-stream-section">
                <h3 className="activity-stream-title">{stream}</h3>
                <div className="activity-subjects-grid">
                  {unlockedSubjects.filter(s => s.stream === stream).map(subject => (
                    <div
                      key={subject.key}
                      className="activity-subject-card"
                      onClick={() => startExam(subject.key)}
                    >
                      <div className="activity-subject-icon">{subject.icon}</div>
                      <div className="activity-subject-name">{subject.label}</div>
                      <div className="activity-subject-status">✅ Unlocked</div>
                      <button className="activity-start-btn">Start →</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`loading-spinner ${darkMode ? 'dark' : 'light'}`}>
        <div className="spinner"></div>
      </div>
    );
  }

  const renderHome = () => (
    <div className="dashboard-content">
      {paymentSuccess && (
        <div className="payment-success-banner">
          ✅ Payment successful! Your exam access has been activated.
        </div>
      )}
      <div className="home-welcome">
        <div>
          <h2 className="home-welcome-title">Welcome Back 👋</h2>
          <p className="home-welcome-sub">Pick a subject and start practicing</p>
        </div>
      </div>

      <section className="home-subjects-section">
        {streamConfig.map(stream => (
          <div key={stream.key} className="stream-section">
            <h3 className={`stream-title ${stream.key === 'remedial' ? 'remedial-title' : ''}`}>
              {stream.label}
            </h3>
            <div className="category-grid">
              {allSubjects.filter(s => s.stream === stream.key).map(s => (
                <div
                  key={s.key}
                  className={`category-card ${stream.cardClass}`}
                >
                  <div className="card-icon">{s.icon}</div>
                  <h3>{s.label}</h3>
                  <p>{s.desc}</p>

                  <div className="card-actions">
                    {unlockedKeys.includes(s.key) || unlockedKeys.includes('all') ? (
                      <button className="card-start-btn unlocked" onClick={() => startExam(s.key)}>
                        ✅ Paid & Unlocked
                      </button>
                    ) : (
                      <>
                        <button className="card-start-btn" onClick={() => startExam(s.key)}>
                          Start Free
                        </button>
                        <button className="card-pay-btn" onClick={() => openPaymentModal(s.key, s.label)}>
                          📱 Pay & Unlock
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderCategories = () => (
    <div className="dashboard-content">
      <section className="categories-section">
        <h2 className="section-title">Choose Your Exam Category</h2>
        
        {/* Grade 12 Natural Science Subjects */}
        <div className="stream-section">
          <h3 className="stream-title">Grade 12 Natural Science</h3>
          <div className="category-grid">
            <div 
              className="category-card grade12-natural"
              onClick={() => startExam('physics')}
            >
              <div className="card-icon">⚛️</div>
              <h3>Physics</h3>
              <p>Mechanics, Thermodynamics, Waves, Optics</p>

            </div>

            <div 
              className="category-card grade12-natural"
              onClick={() => startExam('chemistry')}
            >
              <div className="card-icon">🧪</div>
              <h3>Chemistry</h3>
              <p>Organic, Inorganic, Physical Chemistry</p>
              <div className="card-stats">
                <span>55+ Questions</span>
                <span>40 Min</span>
              </div>
            </div>

            <div 
              className="category-card grade12-natural"
              onClick={() => startExam('biology')}
            >
              <div className="card-icon">🧬</div>
              <h3>Biology</h3>
              <p>Cell Biology, Genetics, Ecology, Evolution</p>

            </div>

            <div 
              className="category-card grade12-natural"
              onClick={() => startExam('mathematics')}
            >
              <div className="card-icon">🔢</div>
              <h3>Mathematics</h3>
              <p>Algebra, Geometry, Trigonometry, Calculus</p>

            </div>
          </div>
        </div>

        {/* Grade 12 Social Science Subjects */}
        <div className="stream-section">
          <h3 className="stream-title">Grade 12 Social Science</h3>
          <div className="category-grid">
            <div 
              className="category-card grade12-social"
              onClick={() => startExam('history')}
            >
              <div className="card-icon">📜</div>
              <h3>History</h3>
              <p>Ethiopian History, World History, Revolutions</p>

            </div>

            <div 
              className="category-card grade12-social"
              onClick={() => startExam('geography')}
            >
              <div className="card-icon">🌍</div>
              <h3>Geography</h3>
              <p>Physical Geography, Human Geography, Map Skills</p>

            </div>

            <div 
              className="category-card grade12-social"
              onClick={() => startExam('economics')}
            >
              <div className="card-icon">💰</div>
              <h3>Economics</h3>
              <p>Microeconomics, Macroeconomics, Development</p>

            </div>

            <div 
              className="category-card grade12-social"
              onClick={() => startExam('civics')}
            >
              <div className="card-icon">🏛️</div>
              <h3>Civics & Ethical Education</h3>
              <p>Democracy, Human Rights, Citizenship</p>

            </div>

            <div 
              className="category-card grade12-social"
              onClick={() => startExam('english')}
            >
              <div className="card-icon">📖</div>
              <h3>English</h3>
              <p>Literature, Grammar, Writing, Comprehension</p>

            </div>
          </div>
        </div>

        {/* Remedial Natural Science */}
        <div className="stream-section">
          <h3 className="stream-title remedial-title">Remedial Natural Science</h3>
          <div className="category-grid">
            <div 
              className="category-card remedial-natural"
              onClick={() => startExam('remedial-physics')}
            >
              <div className="card-icon">🔧</div>
              <h3>Remedial Physics</h3>
              <p>Foundation Physics, Basic Concepts</p>

            </div>

            <div 
              className="category-card remedial-natural"
              onClick={() => startExam('remedial-chemistry')}
            >
              <div className="card-icon">🧪</div>
              <h3>Remedial Chemistry</h3>
              <p>Foundation Chemistry, Basic Reactions</p>

            </div>

            <div 
              className="category-card remedial-natural"
              onClick={() => startExam('remedial-biology')}
            >
              <div className="card-icon">🧬</div>
              <h3>Remedial Biology</h3>
              <p>Foundation Biology, Basic Life Sciences</p>

            </div>

            <div 
              className="category-card remedial-natural"
              onClick={() => startExam('remedial-mathematics')}
            >
              <div className="card-icon">🔢</div>
              <h3>Remedial Mathematics</h3>
              <p>Foundation Math, Basic Arithmetic</p>

            </div>
          </div>
        </div>

        {/* Remedial Social Science */}
        <div className="stream-section">
          <h3 className="stream-title remedial-title">Remedial Social Science</h3>
          <div className="category-grid">
            <div 
              className="category-card remedial-social"
              onClick={() => startExam('remedial-history')}
            >
              <div className="card-icon">📜</div>
              <h3>Remedial History</h3>
              <p>Foundation History, Basic Historical Concepts</p>

            </div>

            <div 
              className="category-card remedial-social"
              onClick={() => startExam('remedial-geography')}
            >
              <div className="card-icon">🌍</div>
              <h3>Remedial Geography</h3>
              <p>Foundation Geography, Basic Map Skills</p>

            </div>

            <div 
              className="category-card remedial-social"
              onClick={() => startExam('remedial-economics')}
            >
              <div className="card-icon"></div>
              <h3>Remedial Economics</h3>
              <p>Foundation Economics, Basic Financial Concepts</p>

            </div>

            <div 
              className="category-card remedial-social"
              onClick={() => startExam('remedial-civics')}
            >
              <div className="card-icon">🏛️</div>
              <h3>Remedial Civics</h3>
              <p>Foundation Civics, Basic Citizenship</p>

            </div>

            <div 
              className="category-card remedial-social"
              onClick={() => startExam('remedial-english')}
            >
              <div className="card-icon">📖</div>
              <h3>Remedial English</h3>
              <p>Foundation English, Basic Language Skills</p>

            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="features-section">
        <h2 className="section-title">Exam Resources</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Previous Year Exams</h3>
            <p>Practice with actual past exam questions</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Model Exams</h3>
            <p>Comprehensive practice tests</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Performance Analytics</h3>
            <p>Track your progress and improvement</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderExam = () => {
    if (!examData) return null;

    const question = examData.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / examData.questions.length) * 100;

    return (
      <div className="exam-interface">
        {/* Timer Header */}
        <div className="exam-header">
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timer)}</span>
          </div>
          <div className="exam-title">{examData.title}</div>
          <button className="finish-btn" onClick={finishExam}>Finish Exam</button>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">
            Question {currentQuestion + 1} of {examData.questions.length}
          </span>
        </div>

        {/* Question */}
        <div className="question-container">
          <div className="question-header">
            <span className="question-number">Q{currentQuestion + 1}</span>
            <span className="question-subject">{question.subject}</span>
            <button 
              className={`review-btn ${reviewLater.includes(question.id) ? 'marked' : ''}`}
              onClick={() => toggleReviewLater(question.id)}
            >
              📌 {reviewLater.includes(question.id) ? 'Marked' : 'Review Later'}
            </button>
          </div>
          
          <div className="question-text">
            {question.question}
          </div>

          {/* Options */}
          <div className="options-container">
            {question.options.map((option, index) => (
              <label 
                key={index}
                className={`option-label ${answers[question.id] === index ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={index}
                  checked={answers[question.id] === index}
                  onChange={() => handleAnswer(question.id, index)}
                />
                <span className="option-text">{option}</span>
              </label>
            ))}
          </div>

          {answers[question.id] !== undefined && question.explanation && (
            <div className="explanation-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-secondary, rgba(79, 70, 229, 0.05))', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
              <div style={{ marginBottom: '8px', color: 'var(--text-primary, #1e293b)' }}><strong>✅ Correct Answer:</strong> {question.options[question.correct]}</div>
              <div style={{ color: 'var(--text-secondary, #475569)' }}><strong>💡 Explanation:</strong> {question.explanation}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="exam-navigation">
          <button 
            className="nav-btn prev-btn"
            onClick={previousQuestion}
            disabled={currentQuestion === 0}
          >
            ← Previous
          </button>
          
          <div className="question-indicators">
            {examData.questions.map((_, index) => (
              <div
                key={index}
                className={`indicator ${index === currentQuestion ? 'current' : ''} ${answers[examData.questions[index].id] !== undefined ? 'answered' : ''} ${reviewLater.includes(examData.questions[index].id) ? 'marked' : ''}`}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          <button 
            className="nav-btn next-btn"
            onClick={nextQuestion}
          >
            {currentQuestion === examData.questions.length - 1 ? 'Finish' : 'Next'} →
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!examResults) return null;

    return (
      <div className="results-container">
        <div className="results-header">
          <h2>Exam Results</h2>
          <div className="score-display">
            <div className="score-circle">
              <span className="score-percentage">{examResults.percentage}%</span>
            </div>
            <div className="score-details">
              <p>{examResults.correct} out of {examResults.totalQuestions} correct</p>
              <p>Time: {formatTime(examResults.timeTaken)}</p>
            </div>
          </div>
        </div>

        <div className="subject-breakdown">
          <h3>Subject Performance</h3>
          {Object.entries(examResults.subjectScores).map(([subject, scores]) => (
            <div key={subject} className="subject-score">
              <div className="subject-name">{subject}</div>
              <div className="subject-progress">
                <div 
                  className="subject-progress-fill"
                  style={{ width: `${(scores.correct / scores.total) * 100}%` }}
                ></div>
              </div>
              <div className="subject-percentage">
                {Math.round((scores.correct / scores.total) * 100)}%
              </div>
            </div>
          ))}
        </div>

        <div className="results-actions">
          <button className="action-btn" onClick={() => setActiveTab('home')}>
            ← Back to Home
          </button>
          <button className="action-btn primary" onClick={() => startExam(examData.type)}>
            Try Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>

      {/* ── Fixed hamburger button — always top-right ── */}
      <button
        className={`hamburger-fab ${mobileMenuOpen ? 'menu-open' : ''}`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {/* Header */}
      <header className="portal-header">
        <div className="header-content">
          <button className="profile-avatar-btn left-profile" onClick={() => setProfileOpen(true)}>
            <div className="user-avatar">
              {userData?.fullName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase()}
            </div>
            <span className="profile-text">Profile</span>
          </button>

          {/* Desktop nav — hidden on mobile */}
          <nav className="header-nav desktop-nav">
            <button onClick={() => setActiveTab('home')}>🏠 Home</button>
            <button onClick={() => setActiveTab('categories')}>📂 Categories</button>
            <button onClick={() => setActiveTab('activity')}>📊 My Subject</button>
            <button onClick={() => setActiveTab('resources')}>📚 Resources</button>
            <button onClick={() => setAiModalOpen(true)} className="ai-nav-btn">🤖 Ask AI</button>
            <button className="payment-nav-btn" onClick={() => setPaymentModal(true)}>
              💳 Payment
            </button>
            <button onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <a href={`https://t.me/${(paymentConfig.telegram || 'Sdsedu').replace('@','')}`} target="_blank" rel="noreferrer" className="telegram-top-btn">
              <i className="fab fa-telegram"></i> Telegram / Contact
            </a>
          </nav>
        </div>
      </header>

      {/* ── Right sidebar drawer ── */}
      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar-drawer ${mobileMenuOpen ? 'drawer-open' : ''}`}>
        {/* X close button */}
        <button className="drawer-close-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
          ✕
        </button>

        <div className="drawer-header">
          <div className="drawer-avatar">
            {userData?.fullName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="drawer-name">{userData?.fullName || 'User'}</div>
            <div className="drawer-email">{currentUser?.email}</div>
          </div>
        </div>

        <nav className="drawer-nav">
          <button className="drawer-item" onClick={() => { setActiveTab('home'); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">🏠</span> Home
          </button>
          <button className="drawer-item" onClick={() => { setActiveTab('categories'); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">📂</span> Categories
          </button>
          <button className="drawer-item" onClick={() => { setActiveTab('activity'); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">📊</span> My Subject
          </button>
          <button className="drawer-item" onClick={() => { setActiveTab('resources'); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">📚</span> Resources
          </button>
          <button className="drawer-item" onClick={() => { setAiModalOpen(true); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">🤖</span> Ask AI
          </button>
          <button className="drawer-item drawer-payment" onClick={() => { setPaymentModal(true); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">💳</span> Payment
          </button>
          <button className="drawer-item" onClick={() => { toggleTheme(); }}>
            <span className="drawer-icon">{darkMode ? '☀️' : '🌙'}</span>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button className="drawer-item" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
            <span className="drawer-icon">🚪</span> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'activity' && renderActivity()}
        {activeTab === 'exam' && renderExam()}
        {activeTab === 'results' && renderResults()}
      </main>

      <PaymentModal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        userEmail={currentUser?.email}
        userName={userData?.fullName || currentUser?.email}
        userId={currentUser?.uid}
      />

      {/* Profile Panel */}
      {profileOpen && (
        <div className="profile-overlay" onClick={() => { setProfileOpen(false); setIsEditingProfile(false); setSaveMsg(''); }}>
          <div className="profile-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="profile-panel-header">
              <div className="profile-avatar-large">
                {userData?.fullName?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h3 className="profile-panel-name">{userData?.fullName || 'User'}</h3>
                <p className="profile-panel-email">{currentUser?.email}</p>
                <span className="profile-status-badge">● Active</span>
              </div>
              <button className="profile-close-btn" onClick={() => { setProfileOpen(false); setIsEditingProfile(false); setSaveMsg(''); }}>×</button>
            </div>

            {/* Fields */}
            <div className="profile-fields">

              <div className="profile-field">
                <label>Full Name</label>
                {isEditingProfile
                  ? <input className="profile-input" type="text" value={editedProfile.fullName}
                      onChange={e => handleProfileChange('fullName', e.target.value)} placeholder="Enter full name" />
                  : <span>{userData?.fullName || '—'}</span>}
              </div>

              <div className="profile-field">
                <label>Email Address</label>
                <span>{currentUser?.email || '—'}</span>
              </div>

              <div className="profile-field">
                <label>Phone Number</label>
                {isEditingProfile
                  ? <input className="profile-input" type="tel" value={editedProfile.phoneNumber}
                      onChange={e => handleProfileChange('phoneNumber', e.target.value)} placeholder="e.g. 0912345678" />
                  : <span>{userData?.phoneNumber || '—'}</span>}
              </div>

              <div className="profile-field">
                <label>Course / Program</label>
                {isEditingProfile
                  ? <input className="profile-input" type="text" value={editedProfile.course}
                      onChange={e => handleProfileChange('course', e.target.value)} placeholder="e.g. Natural Science" />
                  : <span>{userData?.course || '—'}</span>}
              </div>

              <div className="profile-field">
                <label>User ID</label>
                <span className="profile-uid">{currentUser?.uid || '—'}</span>
              </div>

              <div className="profile-field">
                <label>Account Status</label>
                <span className="profile-status-text">{userData?.status || 'Active'}</span>
              </div>

              {userData?.createdAt && (
                <div className="profile-field">
                  <label>Member Since</label>
                  <span>{userData.createdAt?.toDate
                    ? userData.createdAt.toDate().toLocaleDateString('en-ET', { year: 'numeric', month: 'long', day: 'numeric' })
                    : new Date(userData.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {saveMsg && <div className="profile-save-msg">{saveMsg}</div>}

            {/* Actions */}
            <div className="profile-actions">
              {isEditingProfile ? (
                <>
                  <button className="profile-btn profile-btn-save" onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? '⏳ Saving...' : '💾 Save Changes'}
                  </button>
                  <button className="profile-btn profile-btn-cancel" onClick={cancelEditingProfile}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="profile-btn profile-btn-edit" onClick={startEditingProfile}>
                    ✏️ Edit Profile
                  </button>
                  <button className="profile-btn profile-btn-logout" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* AI Chat Modal */}
      {aiModalOpen && (
        <div className="ai-modal-overlay" onClick={() => { setAiModalOpen(false); setAiAnswer(''); setAiQuestion(''); }}>
          <div className="ai-modal-panel" onClick={e => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>🤖 AI Tutor Assistant</h3>
              <button className="ai-modal-close" onClick={() => { setAiModalOpen(false); setAiAnswer(''); setAiQuestion(''); }}>✕</button>
            </div>
            <div className="ai-modal-body">
              <textarea 
                className="ai-chat-input" 
                placeholder="Ask any educational question here..." 
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                rows={4}
              />
              <button 
                className="ai-chat-submit" 
                onClick={handleAskAI}
                disabled={aiLoading || !aiQuestion.trim()}
              >
                {aiLoading ? 'Thinking...' : 'Get Explanation'}
              </button>
              
              {aiAnswer && (
                <div className="ai-response-box">
                  <div className="ai-response-content">{aiAnswer}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
  );
};

export default Dashboard;
