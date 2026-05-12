import React, { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Redirect, useHistory } from 'react-router-dom';
import { 
  auth, 
  getAllPayments, 
  updatePaymentStatus, 
  getAllActivities, 
  listenToChatList, 
  listenToMessages, 
  sendMessage, 
  sendChunkedMessage, 
  markAsSeen, 
  uploadFile, 
  getUserPayments,
  getPaymentConfig,
  updatePaymentConfig,
  getPendingManualPayments,
  approveManualPayment,
  rejectManualPayment,
  recordActivity,
  createPaymentRecord,
  logout
} from './firebase';
import ListUsers from './ListUsers';
import './AdminDashboard.css';
import { signOut } from 'firebase/auth';
import { ADMIN_EMAILS } from './constants';
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const AdminHome = () => {
  const history = useHistory();
  const [user, loading, error] = useAuthState(auth);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [activeTab, setActiveTab]   = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Payment state
  const [payments, setPayments]             = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentFilter, setPaymentFilter]   = useState('all');
  const [paymentSearch, setPaymentSearch]   = useState('');
  const [paymentStats, setPaymentStats]     = useState({ total: 0, success: 0, pending: 0, failed: 0, revenue: 0 });

  // Activity state
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Manual Payment System state
  const [manualPayments, setManualPayments] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ phone: '', telegram: '', accountName: '' });
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [grantingFor, setGrantingFor] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isGranting, setIsGranting] = useState(false);
  // New state for filtering questions by subject/teacher in All Questions view
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  // Exam Approvals State
  const [pendingExams, setPendingExams] = useState([]);
  const [previewExam, setPreviewExam] = useState(null);

  // Admin Add Exam State
  const [newExam, setNewExam] = useState({
    subject: 'Physics',
    question: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  });
  // All Questions State
  const [allQuestions, setAllQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  const ALL_SUBJECTS = [
    { id: 'all',                   label: 'All Subjects'            },
    { id: 'Physics',               label: 'Physics'                 },
    { id: 'Chemistry',             label: 'Chemistry'               },
    { id: 'Biology',               label: 'Biology'                 },
    { id: 'Mathematics',           label: 'Mathematics'             },
    { id: 'History',               label: 'History'                 },
    { id: 'Geography',             label: 'Geography'               },
    { id: 'Economics',             label: 'Economics'               },
    { id: 'Civics',                label: 'Civics'                  },
    { id: 'English',               label: 'English'                 },
    { id: 'Remedial Physics',      label: 'Remedial Physics'        },
    { id: 'Remedial Chemistry',    label: 'Remedial Chemistry'      },
    { id: 'Remedial Biology',      label: 'Remedial Biology'        },
    { id: 'Remedial Mathematics',  label: 'Remedial Mathematics'    },
    { id: 'Remedial History',      label: 'Remedial History'        },
    { id: 'Remedial Geography',    label: 'Remedial Geography'      },
    { id: 'Remedial Economics',    label: 'Remedial Economics'      },
    { id: 'Remedial Civics',       label: 'Remedial Civics'         },
    { id: 'Remedial English',      label: 'Remedial English'        },
  ];

  useEffect(() => {
    if (!loading) {
      if (user) {
        const adminStatus = ADMIN_EMAILS.includes(user.email);
        setIsAdmin(adminStatus);
        if (adminStatus) fetchPayments();
      }
      setInitialized(true);
    }
  }, [user, loading]);

  // Initial Config Fetch for Topbar
  useEffect(() => {
    const fetchConfig = async () => {
      const cfg = await getPaymentConfig();
      setPaymentConfig(cfg);
    };
    if (user && isAdmin) fetchConfig();
  }, [user, isAdmin]);

  useEffect(() => {
    if (activeTab === 'manual-approvals') {
      const unsub = getPendingManualPayments((data) => {
        setManualPayments(data);
      });
      return () => unsub();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'exam-approvals') {
      const q = query(collection(db, 'examQuestions'), where('status', '==', 'pending'));
      const unsub = onSnapshot(q, (snap) => {
        setPendingExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [activeTab]);

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    const result = await getAllPayments();
    if (result.success) {
      setPayments(result.payments);
      const stats = result.payments.reduce((acc, p) => {
        acc.total++;
        if (p.status === 'success') { acc.success++; acc.revenue += (p.amount || 0); }
        if (p.status === 'pending') acc.pending++;
        if (p.status === 'failed')  acc.failed++;
        return acc;
      }, { total: 0, success: 0, pending: 0, failed: 0, revenue: 0 });
      setPaymentStats(stats);
    }
    setPaymentsLoading(false);
  };

  const fetchAllQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const q = query(collection(db, 'examQuestions'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllQuestions(data);
    } catch (err) {
      console.error('Failed to fetch questions', err);
    }
    setQuestionsLoading(false);
  };

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    const result = await getAllActivities();
    if (result.success) {
      setActivities(result.activities);
    }
    setActivitiesLoading(false);
  };

  useEffect(() => {
  if (activeTab === 'all-questions') {
    fetchAllQuestions();
  }
}, [activeTab]);

  useEffect(() => {
    if ((activeTab === 'manual-approvals' || activeTab === 'manual-grant') && user) {
      const unsub = getPendingManualPayments((data) => {
        setManualPayments(data);
      });
      return () => unsub();
    }
  }, [activeTab, user]);

  const handleUpdatePaymentStatus = async (tx_ref, newStatus) => {
    const result = await updatePaymentStatus(tx_ref, newStatus);
    if (result.success) {
      fetchPayments();
      recordActivity(user.uid, user.email, `Payment ${newStatus.toUpperCase()}`, `Tx Ref: ${tx_ref}`);
    } else alert('Failed to update: ' + result.error);
  };

  const filteredPayments = payments.filter(p => {
    const matchStatus = paymentFilter === 'all' || p.status === paymentFilter;
    const q = paymentSearch.toLowerCase();
    const matchSearch = !q ||
      p.tx_ref?.toLowerCase().includes(q) ||
      p.userName?.toLowerCase().includes(q) ||
      p.userEmail?.toLowerCase().includes(q) ||
      p.subject?.toLowerCase().includes(q) ||
      p.phone?.includes(q);
    return matchStatus && matchSearch;
  });

  const handleUpdateConfig = async () => {
    setIsUpdatingConfig(true);
    try {
      await updatePaymentConfig(paymentConfig);
      recordActivity(user.uid, user.email, 'Update Platform Config', 'Payment settings changed');
      alert('Payment settings updated successfully!');
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
    setIsUpdatingConfig(false);
  };

  const handleApproveExam = async (id) => {
    try {
      await updateDoc(doc(db, 'examQuestions', id), { status: 'approved' });
      recordActivity(user.uid, user.email, 'Approve Exam Question', `Question ID: ${id}`);
      alert("Question approved!");
    } catch (err) {
      alert("Failed to approve: " + err.message);
    }
  };

  const handleRejectExam = async (id) => {
    if(!window.confirm("Are you sure you want to delete this question?")) return;
    try {
      await deleteDoc(doc(db, 'examQuestions', id));
      recordActivity(user.uid, user.email, 'Delete/Reject Exam Question', `Question ID: ${id}`);
      alert("Question deleted!");
    } catch (err) {
      alert("Failed to reject: " + err.message);
    }
  };

  const handleApprove = async (p) => {
    // p can be a payment doc or a user object
    setGrantingFor(p); 
    // We reuse the grantingFor state and modal for both receipt approval and manual search
  };

  const handleManualGrantFinal = async () => {
    if (!grantingFor) return;
    setIsGranting(true);
    try {
      // If it's a receipt approval (has an id from manual_payments)
      if (grantingFor.id && !grantingFor.uid) {
         await approveManualPayment(grantingFor.id, grantingFor.userId, selectedSubject);
      } else {
        // 1. Unlock the subject
        const permissionRef = doc(db, 'users', grantingFor.id, 'permissions', selectedSubject);
        await setDoc(permissionRef, {
          unlocked: true,
          subjectId: selectedSubject,
          subjectLabel: ALL_SUBJECTS.find(s => s.id === selectedSubject)?.label,
          approvedAt: serverTimestamp(),
          type: 'manual_admin_grant'
        });

        // 2. Create a "Success" payment record for both user and global history
        await createPaymentRecord(
          grantingFor.id, 
          grantingFor.email, 
          grantingFor.fullName, 
          {
            subject: ALL_SUBJECTS.find(s => s.id === selectedSubject)?.label || selectedSubject,
            amount: 0, 
            status: 'success',
            tx_ref: `manual_${Date.now()}`,
            method: 'Admin Manual Verify',
          }
        );
      }

      recordActivity(user.uid, user.email, 'Grant Manual Access', `User: ${grantingFor.email}, Subject: ${selectedSubject}`);
      alert(`Success! Access granted.`);
      setGrantingFor(null);
    } catch (err) {
      alert("Failed: " + err.message);
    }
    setIsGranting(false);
  };

  const handleDeleteQuestion = async (id) => {
  if (!window.confirm('Delete this question permanently?')) return;
  try {
    await deleteDoc(doc(db, 'examQuestions', id));
    recordActivity(user.uid, user.email, 'Admin Delete Question', `ID: ${id}`);
    alert('Question deleted');
    fetchAllQuestions();
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
};

  const handleRejectManual = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    await rejectManualPayment(id, reason);
  };

  const handleAdminAddExam = async (e) => {
    e.preventDefault();
    if (!newExam.question.trim() || newExam.options.some(opt => !opt.trim())) {
      alert("Please fill all fields");
      return;
    }
    setIsSubmittingExam(true);
    try {
      const data = {
        ...newExam,
        teacherId: user.uid,
        teacherEmail: user.email,
        status: 'approved', // Admins questions are auto-approved
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'examQuestions'), data);
      await recordActivity(user.uid, user.email, 'Admin Add Question', `Subject: ${newExam.subject}, ID: ${docRef.id}`);
      alert("Question added successfully!");
      setNewExam({
        subject: 'Physics',
        question: '',
        options: ['', '', '', ''],
        correct: 0,
        explanation: ''
      });
    } catch (err) {
      alert("Error: " + err.message);
    }
    setIsSubmittingExam(false);
  };

  const handleLogout = async () => {
    try {
      await logout(user.uid, user.email);
      history.push('/login');
    } catch (e) {
      alert('Logout failed: ' + e.message);
    }
  };

  if (loading || !initialized) return (
    <div className="admin-loading">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  );

  if (error) return <div className="admin-error"><p>{error.message}</p></div>;
  if (!user)    return <Redirect to="/login" />;
  if (!isAdmin) return (
    <div className="access-denied">
      <h1>Access Denied</h1>
      <p>You don't have permission to access this page.</p>
    </div>
  );

  const navItems = [
    { id: 'dashboard',       icon: 'fa-tachometer-alt', label: 'Dashboard',              section: 'Main' },
    { id: 'users',           icon: 'fa-users',          label: 'Users',                  section: 'Management' },
    { id: 'payments',        icon: 'fa-credit-card',    label: 'Payments',               section: 'Management' },
    { id: 'manual-approvals',icon: 'fa-file-invoice-dollar', label: 'Verify Subject',      section: 'Management' },
    { id: 'manual-grant',    icon: 'fa-user-check',     label: 'Grant Manual Access',    section: 'Management' },
    { id: 'settings',        icon: 'fa-cog',            label: 'Platform Settings',      section: 'Management' },
    { id: 'all-questions', icon: 'fa-list',        label: 'All Questions',    section: 'Management' },
    { id: 'add-exam',      icon: 'fa-plus-circle',  label: 'Add Question',     section: 'Management' },
    { id: 'exam-approvals',  icon: 'fa-check-square',   label: 'Exam Approvals',         section: 'Management' },
    { id: 'activity',        icon: 'fa-chart-line',     label: 'Activity Track',         section: 'Management' },
  ];

  const sections = [...new Set(navItems.map(n => n.section))];



  return (
    <div className="admin-container">

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="fas fa-graduation-cap" />
          </div>
          <div>
            <div className="sidebar-title">SDS Tech</div>
            <div className="sidebar-sub">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {sections.map(section => (
            <div key={section} className="menu-section">
              <span className="menu-section-label">{section}</span>
              {navItems.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false); // Close sidebar on mobile after click
                    if (item.id === 'payments') fetchPayments();
                    if (item.id === 'activity') fetchActivities();
                  }}
                >
                  <i className={`fas ${item.icon}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>


        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      {/* ── Main ── */}
      <main className="admin-main">

        {/* Topbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} />
              <span className="toggle-label">Menu</span>
            </button>
            <h1 className="topbar-title">
              {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="user-profile">
            <div className="notification-icon">
              <i className="fas fa-bell" />
              <span className="badge">3</span>
            </div>
            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="User" className="user-avatar" />
            <div className="user-info">
              <span className="user-name">{user.email.split('@')[0]}</span>
              <span className="user-role">Administrator</span>
            </div>
            <a href={`https://t.me/${(paymentConfig.telegram || 'Sdsedu').replace('@','')}`} target="_blank" rel="noreferrer" className="admin-telegram-btn">
              <i className="fab fa-telegram"></i> Support
            </a>
            <button className="admin-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" /> Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="admin-content-area">

          {/* Dashboard overview */}
          {activeTab === 'dashboard' && (
            <div className="admin-content">
              <div className="dashboard-overview">
                <div className="overview-card ov-blue">
                  <i className="fas fa-users" />
                  <div className="ov-info"><span className="ov-num">—</span><span className="ov-label">Total Users</span></div>
                </div>
                <div className="overview-card ov-green">
                  <i className="fas fa-check-circle" />
                  <div className="ov-info"><span className="ov-num">{paymentStats.success}</span><span className="ov-label">Paid Students</span></div>
                </div>
                <div className="overview-card ov-purple">
                  <i className="fas fa-coins" />
                  <div className="ov-info"><span className="ov-num">ETB {paymentStats.revenue.toLocaleString()}</span><span className="ov-label">Revenue</span></div>
                </div>
                <div className="overview-card ov-orange">
                  <i className="fas fa-clock" />
                  <div className="ov-info"><span className="ov-num">{paymentStats.pending}</span><span className="ov-label">Pending Payments</span></div>
                </div>
              </div>
              <div className="content-card" style={{ marginTop: '1.5rem' }}>
                <p style={{ color: 'var(--text-2)' }}>Welcome back, <strong>{user.email.split('@')[0]}</strong>. Use the sidebar to manage your platform.</p>
              </div>
            </div>
          )}



          {/* Verify Subject Hub (Receipts Only) */}
          {activeTab === 'manual-approvals' && (
            <div className="admin-content">
              <div className="content-card priority-card">
                <div className="card-header">
                  <h3>Pending Receipt Verifications</h3>
                  <p>Check student screenshots and unlock requested subjects.</p>
                </div>
                <div className="manual-payments-grid">
                  {manualPayments.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-check-double"></i>
                      <p>All caught up! No pending receipts.</p>
                    </div>
                  ) : (
                    manualPayments.map(p => (
                      <div key={p.id} className="manual-payment-card glass">
                        <div className="mp-status-badge">PENDING</div>
                        <div className="mp-user-info">
                          <strong>{p.userName}</strong>
                          <span>{p.userEmail}</span>
                        </div>
                        <div className="mp-subject-info">
                          <label>Requested Access:</label>
                          <strong>{p.subjectLabel || 'Full Access'}</strong>
                        </div>
                        <div className="mp-receipt-preview" onClick={() => setPreviewReceipt(p.receiptUrl)}>
                          <img src={p.receiptUrl} alt="receipt" />
                          <div className="mp-overlay"><i className="fas fa-search-plus"></i> View Receipt</div>
                        </div>
                        <div className="mp-actions">
                          <button className="mp-btn-approve" onClick={() => handleApprove(p)}>
                            <i className="fas fa-key"></i> Select & Verify
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grant Manual Access Hub (Search & Grant) */}
          {activeTab === 'manual-grant' && (
            <div className="admin-content">
              <div className="content-card">
                <div className="card-header">
                  <h3>Search & Verify Student Access</h3>
                  <p>Manually grant Full Access or Specific Subjects to any student.</p>
                </div>
                <ListUsers isAdmin={true} onGrantClick={(u) => setGrantingFor(u)} />
              </div>
            </div>
          )}

          {activeTab === 'all-questions' && (() => {
            // build unique teacher list from loaded questions
            const teacherMap = {};
            allQuestions.forEach(q => {
              if (q.teacherId) teacherMap[q.teacherId] = q.teacherEmail || q.teacherId;
            });
            const teachers = Object.entries(teacherMap); // [[id, email], ...]

            // apply both filters
            const filtered = allQuestions
              .filter(q => filterSubject === 'all' || q.subject === filterSubject)
              .filter(q => filterTeacher === 'all' || q.teacherId === filterTeacher);

            // group by subject
            const grouped = filtered.reduce((acc, q) => {
              const subj = q.subject || 'Uncategorized';
              if (!acc[subj]) acc[subj] = [];
              acc[subj].push(q);
              return acc;
            }, {});

            return (
              <div className="admin-content">
                {/* Header bar */}
                <div className="content-card" style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>All Exam Questions</h3>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Total: <strong>{allQuestions.length}</strong> &nbsp;·&nbsp; Showing: <strong>{filtered.length}</strong>
                        {filterTeacher !== 'all' && <> &nbsp;·&nbsp; Teacher: <strong>{teacherMap[filterTeacher]}</strong></>}
                        {filterSubject !== 'all' && <> &nbsp;·&nbsp; Subject: <strong>{filterSubject}</strong></>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {/* Teacher filter */}
                      <select
                        value={filterTeacher}
                        onChange={(e) => setFilterTeacher(e.target.value)}
                        className="grant-select"
                      >
                        <option value="all">👨‍🏫 All Teachers ({allQuestions.length})</option>
                        {teachers.map(([id, email]) => {
                          const cnt = allQuestions.filter(q => q.teacherId === id).length;
                          return (
                            <option key={id} value={id}>{email} ({cnt})</option>
                          );
                        })}
                      </select>
                      {/* Subject filter */}
                      <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="grant-select"
                      >
                        {ALL_SUBJECTS.map(s => {
                          const cnt = s.id === 'all'
                            ? allQuestions.length
                            : allQuestions.filter(q => q.subject === s.id).length;
                          return <option key={s.id} value={s.id}>{s.label} ({cnt})</option>;
                        })}
                      </select>
                      <button className="confirm-grant-btn" onClick={() => setActiveTab('add-exam')}>+ Add Question</button>
                    </div>
                  </div>
                </div>

                {/* Teacher summary cards — shown when viewing all teachers */}
                {filterTeacher === 'all' && teachers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {teachers.map(([id, email]) => {
                      const cnt = allQuestions.filter(q => q.teacherId === id).length;
                      const approved = allQuestions.filter(q => q.teacherId === id && q.status === 'approved').length;
                      const pending  = allQuestions.filter(q => q.teacherId === id && q.status === 'pending').length;
                      return (
                        <div
                          key={id}
                          onClick={() => setFilterTeacher(id)}
                          style={{
                            background: 'var(--card-bg, #f8fafc)', border: '1px solid #e2e8f0',
                            borderRadius: '12px', padding: '0.75rem 1rem', cursor: 'pointer',
                            minWidth: '200px', transition: 'box-shadow 0.2s'
                          }}
                          title="Click to filter by this teacher"
                        >
                          <div style={{ fontWeight: '700', fontSize: '0.85rem', marginBottom: '4px' }}>👨‍🏫 {email}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            <span style={{ marginRight: '8px' }}>📝 {cnt} total</span>
                            <span style={{ marginRight: '8px', color: '#10b981' }}>✅ {approved}</span>
                            <span style={{ color: '#f59e0b' }}>⏳ {pending}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {questionsLoading ? (
                  <div className="payment-loading"><div className="spinner" /><p>Loading questions...</p></div>
                ) : filtered.length === 0 ? (
                  <div className="payment-empty"><p>No questions match the selected filters.</p></div>
                ) : (
                  <div className="payment-table-wrap">
                    {Object.entries(grouped).map(([subject, qs]) => (
                      <div key={subject} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0 }}>{subject}</h4>
                          <span style={{
                            background: '#6366f1', color: 'white',
                            borderRadius: '999px', padding: '2px 10px',
                            fontSize: '0.78rem', fontWeight: '700'
                          }}>
                            {qs.length} question{qs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <table className="payment-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Question</th>
                              <th>Teacher</th>
                              <th>Status</th>
                              <th>Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {qs.map((q, idx) => (
                              <tr key={q.id}>
                                <td>{idx + 1}</td>
                                <td style={{ maxWidth: '280px' }}>{q.question}</td>
                                <td style={{ fontSize: '0.82rem', color: '#4f46e5' }}>
                                  {q.teacherEmail || '—'}
                                </td>
                                <td>
                                  <span className={`status-badge status-${q.status}`}>
                                    {q.status === 'approved' ? '✅ Approved' : '⏳ Pending'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {q.createdAt?.seconds
                                    ? new Date(q.createdAt.seconds * 1000).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td>
                                  <button className="delete-button" onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'add-exam' && (
            <div className="admin-content">
              <div className="content-card">
                <div className="card-header">
                  <h3>Add New Exam Question</h3>
                  <p>Admins can add questions directly. These will be auto-approved and tracked.</p>
                </div>
                <form onSubmit={handleAdminAddExam} className="grant-form">
                  <div style={{display: 'flex', gap: '15px', marginBottom: '15px'}}>
                    <div style={{flex: 1}}>
                      <label className="grant-label">Subject</label>
                      <select 
                        value={newExam.subject} 
                        onChange={(e) => setNewExam({...newExam, subject: e.target.value})}
                        className="grant-select"
                      >
                        {ALL_SUBJECTS.filter(s => s.id !== 'all').map(s => (
                          <option key={s.id} value={s.label}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex: 1}}>
                      <label className="grant-label">Correct Option</label>
                      <select 
                        value={newExam.correct} 
                        onChange={(e) => setNewExam({...newExam, correct: parseInt(e.target.value)})}
                        className="grant-select"
                      >
                        <option value={0}>Option A</option>
                        <option value={1}>Option B</option>
                        <option value={2}>Option C</option>
                        <option value={3}>Option D</option>
                      </select>
                    </div>
                  </div>

                  <label className="grant-label">Question Text</label>
                  <textarea 
                    value={newExam.question}
                    onChange={(e) => setNewExam({...newExam, question: e.target.value})}
                    className="grant-select"
                    style={{minHeight: '100px', padding: '12px', resize: 'vertical', marginBottom: '15px'}}
                    placeholder="Type the exam question here..."
                  />

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                    {['A', 'B', 'C', 'D'].map((lbl, idx) => (
                      <div key={lbl}>
                        <label className="grant-label">Option {lbl}</label>
                        <input 
                          type="text"
                          value={newExam.options[idx]}
                          onChange={(e) => {
                            const newOpts = [...newExam.options];
                            newOpts[idx] = e.target.value;
                            setNewExam({...newExam, options: newOpts});
                          }}
                          className="grant-select"
                          placeholder={`Enter option ${lbl}`}
                        />
                      </div>
                    ))}
                  </div>

                  <label className="grant-label">Explanation (Optional)</label>
                  <textarea 
                    value={newExam.explanation}
                    onChange={(e) => setNewExam({...newExam, explanation: e.target.value})}
                    className="grant-select"
                    style={{minHeight: '80px', padding: '12px', resize: 'vertical', marginBottom: '20px'}}
                    placeholder="Explain why the correct answer is right..."
                  />

                  <button 
                    type="submit" 
                    className="confirm-grant-btn" 
                    disabled={isSubmittingExam}
                    style={{width: '100%', background: '#6366f1'}}
                  >
                    {isSubmittingExam ? 'Saving Question...' : '✅ Add Question to Database'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'exam-approvals' && (
            <div className="admin-content">
              <div className="admin-header">
                <h2>Pending Exam Questions</h2>
              </div>
              <p style={{marginBottom: '1.5rem', color: '#64748b'}}>Review questions submitted by teachers before they appear to students.</p>
              
              {pendingExams.length === 0 ? (
                <div className="payment-empty"><p>No pending questions to approve at the moment.</p></div>
              ) : (
                <div className="payment-table-wrap">
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Question</th>
                        <th>Teacher Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingExams.map(q => (
                        <tr key={q.id}>
                          <td><span className="plan-tag plan-tag-single">{q.subject}</span></td>
                          <td style={{maxWidth: '300px', whiteSpace: 'normal', fontSize: '0.9rem'}}>{q.question}</td>
                          <td>{q.teacherEmail}</td>
                          <td className="actions-cell" style={{minWidth: '280px'}}>
                            <button onClick={() => setPreviewExam(q)} className="grant-btn" style={{background: '#3b82f6', marginRight: '8px'}}>🔍 View</button>
                            <button onClick={() => handleApproveExam(q.id)} className="grant-btn" style={{background: '#10b981'}}>✅ Approve</button>
                            <button onClick={() => handleRejectExam(q.id)} className="delete-button" style={{marginLeft: '8px'}}>❌ Reject</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Management */}
          {activeTab === 'payments' && (
            <div className="admin-content">

              <div className="payment-stats-grid">
                {[
                  { cls: 'pstat-total',   icon: '📊', num: paymentStats.total,                          label: 'Total' },
                  { cls: 'pstat-success', icon: '✅', num: paymentStats.success,                        label: 'Successful' },
                  { cls: 'pstat-pending', icon: '⏳', num: paymentStats.pending,                        label: 'Pending' },
                  { cls: 'pstat-failed',  icon: '❌', num: paymentStats.failed,                         label: 'Failed' },
                  { cls: 'pstat-revenue', icon: '💰', num: `ETB ${paymentStats.revenue.toLocaleString()}`, label: 'Revenue' },
                ].map(s => (
                  <div key={s.label} className={`pstat-card ${s.cls}`}>
                    <div className="pstat-icon">{s.icon}</div>
                    <div className="pstat-num">{s.num}</div>
                    <div className="pstat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="payment-filters">
                <input
                  className="payment-search"
                  type="text"
                  placeholder="🔍 Search name, email, phone, subject..."
                  value={paymentSearch}
                  onChange={e => setPaymentSearch(e.target.value)}
                />
                <div className="filter-btns">
                  {['all', 'success', 'pending', 'failed'].map(f => (
                    <button
                      key={f}
                      className={`filter-btn ${paymentFilter === f ? 'filter-active' : ''}`}
                      onClick={() => setPaymentFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <button className="filter-btn refresh-btn" onClick={fetchPayments}>🔄 Refresh</button>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="payment-loading"><div className="spinner" /><p>Loading payments...</p></div>
              ) : filteredPayments.length === 0 ? (
                <div className="payment-empty"><p>No payments found{paymentFilter !== 'all' ? ` with status "${paymentFilter}"` : ''}.</p></div>
              ) : (
                <div className="payment-table-wrap">
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date</th><th>Name</th><th>Email</th>
                        <th>Phone</th><th>Subject</th><th>Plan</th>
                        <th>Amount</th><th>Tx Ref</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((p, i) => (
                        <tr key={p.id} className={`pt-row pt-${p.status}`}>
                          <td>{i + 1}</td>
                          <td className="pt-date">
                            {p.createdAt instanceof Date
                              ? p.createdAt.toLocaleDateString('en-ET', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="pt-name">{p.userName || '—'}</td>
                          <td className="pt-email">{p.userEmail || '—'}</td>
                          <td>{p.phone ? `+251${p.phone}` : '—'}</td>
                          <td>{p.subject || '—'}</td>
                          <td>
                            <span className={`plan-tag ${p.plan === 'all' ? 'plan-tag-all' : 'plan-tag-single'}`}>
                              {p.plan === 'all' ? '📚 All' : '📖 Single'}
                            </span>
                          </td>
                          <td className="pt-amount">ETB {p.amount}</td>
                          <td className="pt-txref" title={p.tx_ref}>{p.tx_ref?.slice(0, 16)}…</td>
                          <td>
                            <span className={`status-badge status-${p.status}`}>
                              {p.status === 'success' ? '✅ Success' : p.status === 'pending' ? '⏳ Pending' : '❌ Failed'}
                            </span>
                          </td>
                          <td className="pt-actions">
                            {p.status !== 'success' && (
                              <button className="pt-btn pt-btn-success" title="Mark Success"
                                onClick={() => handleUpdatePaymentStatus(p.tx_ref, 'success')}>✔</button>
                            )}
                            {p.status !== 'failed' && (
                              <button className="pt-btn pt-btn-fail" title="Mark Failed"
                                onClick={() => handleUpdatePaymentStatus(p.tx_ref, 'failed')}>✘</button>
                            )}
                            {p.status !== 'pending' && (
                              <button className="pt-btn pt-btn-pending" title="Mark Pending"
                                onClick={() => handleUpdatePaymentStatus(p.tx_ref, 'pending')}>⏳</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="payment-table-footer">
                    Showing {filteredPayments.length} of {payments.length} transactions
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activities */}
          {activeTab === 'activity' && (
            <div className="admin-content">
              <div className="payment-filters">
                <h2 style={{ margin: 0, color: 'var(--text-1)' }}>User Activity Log</h2>
                <div className="filter-btns">
                  <button className="filter-btn refresh-btn" onClick={fetchActivities}>🔄 Refresh</button>
                </div>
              </div>

              {activitiesLoading ? (
                <div className="payment-loading"><div className="spinner" /><p>Loading activities...</p></div>
              ) : activities.length === 0 ? (
                <div className="payment-empty"><p>No activity records found.</p></div>
              ) : (
                <div className="payment-table-wrap">
                  <table className="payment-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Date & Time</th><th>User Email</th><th>Action</th><th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td>
                            {a.timestamp?.seconds 
                              ? new Date(a.timestamp.seconds * 1000).toLocaleString() 
                              : 'Recent'}
                          </td>
                          <td>{a.userEmail}</td>
                          <td><strong>{a.action}</strong></td>
                          <td style={{fontSize: '0.85rem'}}>{a.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="admin-content">
              <div className="content-card" style={{ maxWidth: '600px' }}>
                <div className="card-header">
                  <h3>Payment Configuration</h3>
                  <p>Update payment details shown to students.</p>
                </div>
                <div className="grant-form">
                  <label className="grant-label">Telebirr / Phone Number</label>
                  <input
                    type="text"
                    className="grant-select"
                    value={paymentConfig.phone}
                    onChange={e => setPaymentConfig({ ...paymentConfig, phone: e.target.value })}
                  />
                  <label className="grant-label" style={{ marginTop: '1rem' }}>Telegram Username (Support)</label>
                  <input
                    type="text"
                    className="grant-select"
                    value={paymentConfig.telegram}
                    onChange={e => setPaymentConfig({ ...paymentConfig, telegram: e.target.value })}
                  />
                   <label className="grant-label" style={{ marginTop: '1rem' }}>Bank Account Name</label>
                  <input
                    type="text"
                    className="grant-select"
                    value={paymentConfig.accountName}
                    onChange={e => setPaymentConfig({ ...paymentConfig, accountName: e.target.value })}
                  />
                  <button
                    className="confirm-grant-btn"
                    style={{ marginTop: '1.5rem', width: '100%' }}
                    onClick={handleUpdateConfig}
                    disabled={isUpdatingConfig}
                  >
                    {isUpdatingConfig ? 'Updating...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          {activeTab === 'users' && (
            <div className="admin-content">
              <ListUsers isAdmin={true} onGrantClick={handleApprove} />
            </div>
          )}

        </div>
      </main>

      {/* ── Global Modals (outside content area so they overlay everything) ── */}

      {grantingFor && (
        <div className="grant-modal-overlay" onClick={() => setGrantingFor(null)}>
          <div className="grant-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">🗝️</div>
            <h3>Verify Subject Access</h3>
            <p>Granting access to: <strong>{grantingFor.userEmail || grantingFor.email}</strong></p>
            <div className="grant-form">
              <label className="grant-label">Choose Access Level:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="grant-select"
              >
                <option value="all">🚀 Full Access (All Subjects)</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
                <option value="biology">Biology</option>
                <option value="mathematics">Mathematics</option>
                <option value="history">History</option>
                <option value="geography">Geography</option>
                <option value="economics">Economics</option>
                <option value="civics">Civics</option>
                <option value="english">English</option>
              </select>
              <div className="modal-actions">
                <button className="confirm-grant-btn" onClick={handleManualGrantFinal} disabled={isGranting}>
                  {isGranting ? 'Updating Permissions...' : 'Verify Access Now'}
                </button>
                <button className="cancel-grant-btn" onClick={() => setGrantingFor(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewReceipt && (
        <div className="receipt-modal-overlay" onClick={() => setPreviewReceipt(null)}>
          <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-receipt" onClick={() => setPreviewReceipt(null)}>×</button>
            <img src={previewReceipt} alt="Proof of Payment" />
          </div>
        </div>
      )}

      {previewExam && (
        <div className="grant-modal-overlay" onClick={() => setPreviewExam(null)}>
          <div className="grant-modal-card" style={{maxWidth: '600px', textAlign: 'left'}} onClick={e => e.stopPropagation()}>
            <div className="modal-icon">📝</div>
            <h3 style={{textAlign: 'center'}}>Review Question</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#64748b'}}>
              <span><strong>Subject:</strong> {previewExam.subject}</span>
              <span><strong>Teacher:</strong> {previewExam.teacherEmail}</span>
            </div>
            <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px', margin: '15px 0', border: '1px solid #e2e8f0'}}>
              <p style={{fontWeight: '700', fontSize: '1.1rem', marginBottom: '15px', color: '#1e293b'}}>{previewExam.question}</p>
              <ul style={{listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {previewExam.options.map((opt, i) => (
                  <li key={i} style={{
                    padding: '12px', borderRadius: '8px',
                    background: previewExam.correct === i ? '#dcfce7' : 'white',
                    border: previewExam.correct === i ? '2px solid #22c55e' : '1px solid #cbd5e1',
                    color: previewExam.correct === i ? '#166534' : '#334155',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span><strong>{String.fromCharCode(65 + i)}.</strong> {opt}</span>
                    {previewExam.correct === i && (
                      <span style={{fontSize: '0.8rem', fontWeight: 'bold', background: '#22c55e', color: 'white', padding: '2px 6px', borderRadius: '4px'}}>Correct Answer</span>
                    )}
                  </li>
                ))}
              </ul>
              {previewExam.explanation && (
                <div style={{marginTop: '15px', padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe'}}>
                  <strong style={{color: '#1d4ed8', display: 'block', marginBottom: '4px'}}>💡 Explanation:</strong>
                  <span style={{color: '#1e3a8a'}}>{previewExam.explanation}</span>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{justifyContent: 'center', gap: '15px', marginTop: '20px'}}>
              <button className="confirm-grant-btn" style={{background: '#10b981', flex: 1}}
                onClick={() => { handleApproveExam(previewExam.id); setPreviewExam(null); }}>
                ✅ Approve Question
              </button>
              <button className="delete-button" style={{flex: 1}}
                onClick={() => { handleRejectExam(previewExam.id); setPreviewExam(null); }}>
                ❌ Reject
              </button>
              <button className="cancel-grant-btn" style={{flex: 1}} onClick={() => setPreviewExam(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminHome;
