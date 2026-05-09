import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useHistory } from 'react-router-dom';
import { db, logout, recordActivity } from './firebase';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import './TeacherDashboard.css';

const ALL_SUBJECTS = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'History',
  'Geography', 'Economics', 'Civics', 'English'
];

const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const history = useHistory();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [subject, setSubject] = useState(ALL_SUBJECTS[0]);
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correct, setCorrect] = useState(0); // 0=A, 1=B, 2=C, 3=D
  const [explanation, setExplanation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [myQuestions, setMyQuestions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, add, list
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!currentUser?.uid) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'examQuestions'),
      where('teacherId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyQuestions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout(currentUser?.uid, currentUser?.email);
      history.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleEditClick = (q) => {
    setEditingId(q.id);
    setSubject(q.subject);
    setQuestionText(q.question);
    setOptionA(q.options[0]);
    setOptionB(q.options[1]);
    setOptionC(q.options[2]);
    setOptionD(q.options[3]);
    setCorrect(q.correct);
    setExplanation(q.explanation || '');
    setMessage('✏️ Editing question. Submit to save changes.');
    setActiveTab('add'); // Automatically switch to add tab when editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setExplanation('');
    setCorrect(0);
    setMessage('');
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      setMessage('❌ Please fill in the question and all options.');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');
    
    try {
      const data = {
        subject: subject,
        question: questionText.trim(),
        options: [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()],
        correct: Number(correct),
        explanation: explanation.trim(),
        status: 'pending', // Reset status if edited
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'examQuestions', editingId), data);
        recordActivity(currentUser.uid, currentUser.email, 'Edit Exam Question', `Subject: ${subject}, Question ID: ${editingId}`);
        setMessage('✅ Question updated successfully!');
      } else {
        data.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'examQuestions'), data);
        recordActivity(currentUser.uid, currentUser.email, 'Submit New Question', `Subject: ${subject}, Question ID: ${docRef.id}`);
        setMessage('✅ Question submitted successfully!');
      }
      
      cancelEdit();
      setTimeout(() => {
        setActiveTab('overview');
        // Clear message after showing on overview for a bit
        setTimeout(() => setMessage(''), 5000);
      }, 1500);
    } catch (err) {
      console.error('Error saving question:', err);
      setMessage('❌ Failed to save question.');
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <div className="teacher-loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="teacher-dashboard-container">
      {/* ── Sidebar ── */}
      <aside className={`teacher-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">👨‍🏫</div>
          <div className="sidebar-title-wrap">
            <h1 className="sidebar-title">Teacher Portal</h1>
            <div className="sidebar-sub">Question Hub</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section">
            <span className="menu-section-label">Navigation</span>
            <button 
              className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
            >
              <i className="fas fa-home"></i>
              <span>Overview</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'add' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('add'); setSidebarOpen(false); }}
            >
              <i className="fas fa-plus-circle"></i>
              <span>{editingId ? 'Edit Question' : 'Add Question'}</span>
            </button>
            <button 
              className={`menu-item ${activeTab === 'list' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('list'); setSidebarOpen(false); }}
            >
              <i className="fas fa-list"></i>
              <span>My Questions</span>
              {myQuestions.length > 0 && <span className="badge">{myQuestions.length}</span>}
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <main className="teacher-main-area">
        {/* Topbar */}
        <header className="teacher-topbar">
          <div className="topbar-left">
            <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`} />
              <span className="toggle-label">Menu</span>
            </button>
            <h1 className="topbar-title">
              {activeTab === 'overview' ? 'Dashboard Overview' : activeTab === 'add' ? (editingId ? 'Edit Question' : 'Submit Question') : 'My Submissions'}
            </h1>
          </div>

          <div className="user-profile">
            <div className="profile-avatar">
              {userData?.fullName?.charAt(0) || currentUser?.email?.charAt(0)}
            </div>
            <div className="user-info">
              <span className="user-name">{userData?.fullName || currentUser?.email?.split('@')[0]}</span>
              <span className="user-role">Teacher</span>
            </div>
            <button className="admin-logout-btn" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="teacher-content-padding">
        {activeTab === 'overview' && (
          <div className="teacher-overview fade-in">
            {message && <div className={`message-banner ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}
            <div className="teacher-welcome-card">
              <div className="welcome-content">
                <h1>Welcome back, {userData?.fullName?.split(' ')[0] || 'Teacher'}!</h1>
                <p>Manage your exam questions and track student progress from your personal portal.</p>
                <div className="welcome-actions">
                  <button className="primary-action-btn" onClick={() => setActiveTab('add')}>
                    Create New Question
                  </button>
                </div>
              </div>
              <div className="welcome-stats">
                <div className="stat-circle">
                  <span className="stat-num">{myQuestions.length}</span>
                  <span className="stat-label">Total Questions</span>
                </div>
              </div>
            </div>
            
            <div className="teacher-stats-grid">
              <div className="teacher-stat-card">
                <div className="stat-icon">🎓</div>
                <div className="stat-details">
                  <h3>My Students</h3>
                  <div className="stat-value">0</div>
                </div>
              </div>
              <div className="teacher-stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-details">
                  <h3>Approved</h3>
                  <div className="stat-value">{myQuestions.filter(q => q.status === 'approved').length}</div>
                </div>
              </div>
              <div className="teacher-stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-details">
                  <h3>Pending</h3>
                  <div className="stat-value">{myQuestions.filter(q => q.status === 'pending').length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'add' && (
          <div className="teacher-exam-builder fade-in">
            <h2>{editingId ? '✏️ Edit Question' : '📝 Add Exam Question'}</h2>
            <p className="builder-sub">
              {editingId ? 'Modify the question details below.' : 'Submit a new multiple-choice question for admin review.'}
            </p>
            
            {message && <div className={`message-banner ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

            <form className="exam-form" onSubmit={handleSubmitQuestion}>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Subject Category</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    {ALL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Question Content</label>
                <textarea 
                  rows="3" 
                  placeholder="Type the question here..." 
                  value={questionText} 
                  onChange={(e) => setQuestionText(e.target.value)}
                  required 
                />
              </div>

              <div className="options-container">
                <label className="section-label">Multiple Choice Options</label>
                <div className="options-grid">
                  <div className="form-group option-input">
                    <span className="option-label">A</span>
                    <input type="text" placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} required />
                  </div>
                  <div className="form-group option-input">
                    <span className="option-label">B</span>
                    <input type="text" placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} required />
                  </div>
                  <div className="form-group option-input">
                    <span className="option-label">C</span>
                    <input type="text" placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} required />
                  </div>
                  <div className="form-group option-input">
                    <span className="option-label">D</span>
                    <input type="text" placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} required />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Explanation / Rationale (Optional)</label>
                  <textarea 
                    rows="2" 
                    placeholder="Provide context on why the answer is correct..." 
                    value={explanation} 
                    onChange={(e) => setExplanation(e.target.value)} 
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Correct Answer</label>
                  <select value={correct} onChange={(e) => setCorrect(Number(e.target.value))}>
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-question-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingId ? 'Update Question' : 'Submit Question')}
                </button>
                {editingId && (
                  <button type="button" className="cancel-edit-btn" onClick={cancelEdit}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="teacher-questions-list fade-in">
            <div className="list-header">
              <h2>📊 My Submitted Questions</h2>
              <button className="add-new-btn" onClick={() => setActiveTab('add')}>+ New Question</button>
            </div>
            {myQuestions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>You haven't submitted any questions yet.</p>
                <button className="primary-action-btn" onClick={() => setActiveTab('add')}>Start Contributing</button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Question Preview</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myQuestions.map(q => (
                      <tr key={q.id}>
                        <td><span className="plan-tag plan-tag-single">{q.subject}</span></td>
                        <td className="question-preview">{q.question.length > 60 ? q.question.substring(0, 60) + '...' : q.question}</td>
                        <td>
                          <span className={`status-badge status-${q.status}`}>
                            {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                          </span>
                        </td>
                        <td className="date-cell">
                          {q.createdAt?.seconds ? new Date(q.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                        </td>
                        <td>
                          <button className="edit-btn" onClick={() => handleEditClick(q)}>✏️ Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
