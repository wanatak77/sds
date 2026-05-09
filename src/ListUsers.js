import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, createPaymentRecord, recordActivity } from './firebase';
import './ListUsers.css';

const ALL_SUBJECTS = [
  { id: 'all', label: 'Full Access (All Subjects)' },
  { id: 'physics', label: 'Physics' },
  { id: 'chemistry', label: 'Chemistry' },
  { id: 'biology', label: 'Biology' },
  { id: 'mathematics', label: 'Mathematics' },
  { id: 'history', label: 'History' },
  { id: 'geography', label: 'Geography' },
  { id: 'economics', label: 'Economics' },
  { id: 'civics', label: 'Civics' },
  { id: 'english', label: 'English' },
];

const ListUsers = ({ isAdmin = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserThreshold] = useState(7);
  const [grantingFor, setGrantingFor] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [isGranting, setIsGranting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const userData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setUsers(userData);
    } catch (error) {
      console.error("Firebase error:", error);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      recordActivity(null, 'Admin', 'Delete User', `User ID: ${userId}`);
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      setError("Failed to delete user.");
    }
  };

  const handleMakeTeacher = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to promote ${userEmail} to a Teacher?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'teacher'
      });
      recordActivity(null, 'Admin', 'Promote to Teacher', `User Email: ${userEmail}`);
      alert(`Successfully assigned ${userEmail} as a Teacher!`);
      setUsers(users.map(u => u.id === userId ? { ...u, role: 'teacher' } : u));
    } catch (error) {
      console.error("Error making teacher:", error);
      alert("Failed to assign teacher.");
    }
  };

  const handleGrantAccess = async () => {
    if (!grantingFor) return;
    setIsGranting(true);
    try {
      const permissionRef = doc(db, 'users', grantingFor.id, 'permissions', selectedSubject);
      await setDoc(permissionRef, {
        granted: true,
        subjectId: selectedSubject,
        subjectLabel: ALL_SUBJECTS.find(s => s.id === selectedSubject)?.label,
        grantedAt: serverTimestamp(),
        type: 'manual_admin_grant'
      });
      
      // Create a "Success" payment record for dashboard unlocking
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

      // Record activity for tracking
      await recordActivity(grantingFor.id, grantingFor.email, 'Manual Access Grant', `Target: ${grantingFor.email}, Subject: ${selectedSubject}`);
      alert("Access granted successfully!");
      setGrantingFor(null);
    } catch (err) {
      alert("Failed to grant access: " + err.message);
    }
    setIsGranting(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const isNewUser = (userDate) => {
    if (!userDate) return false;
    const now = new Date();
    const diffTime = Math.abs(now - userDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= newUserThreshold;
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading-container"><div className="loading-spinner"></div><p>Loading users...</p></div>;
  }

  return (
    <div className="user-management">
      <div className="header-container">
        <div className="header-title-group">
          <h2>User Management</h2>
          <span className="total-count-pill">Total: {users.length}</span>
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="user-category-stats">
        <div className="stat-item student">
          <span className="stat-label">Students</span>
          <span className="stat-number">{users.filter(u => u.role !== 'admin' && u.role !== 'teacher').length}</span>
        </div>
        <div className="stat-item teacher">
          <span className="stat-label">Teachers</span>
          <span className="stat-number">{users.filter(u => u.role === 'teacher').length}</span>
        </div>
        <div className="stat-item admin">
          <span className="stat-label">Admins</span>
          <span className="stat-number">{users.filter(u => u.role === 'admin').length}</span>
        </div>
      </div>
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Role</th>
              <th>Email</th>
              <th>Name</th>
              <th>Joined Date</th>
              {isAdmin && <th>Management</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={`user-row ${isNewUser(user.createdAt) ? 'new-user' : ''}`}>
                <td className="status-cell">
                  {isNewUser(user.createdAt) && <span className="new-badge">NEW</span>}
                </td>
                <td className="role-cell">
                  {user.role === 'teacher' ? (
                    <span className="role-badge teacher">TEACHER</span>
                  ) : user.role === 'admin' ? (
                    <span className="role-badge admin">ADMIN</span>
                  ) : (
                    <span className="role-badge student">STUDENT</span>
                  )}
                </td>
                <td className="email-cell">{user.email}</td>
                <td className="name-cell">{user.fullName || 'N/A'}</td>
                <td className="date-cell">{user.createdAt?.toLocaleDateString()}</td>
                {isAdmin && (
                  <td className="actions-cell">
                    <button onClick={() => setGrantingFor(user)} className="grant-btn">
                      🔑 Grant Access
                    </button>
                    {user.role !== 'teacher' && (
                      <button onClick={() => handleMakeTeacher(user.id, user.email)} className="grant-btn" style={{background: '#f59e0b', marginLeft: '8px'}}>
                        👨‍🏫 Make Teacher
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(user.id)} className="delete-button" style={{marginLeft: '8px'}}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grant Access Modal Overlay */}
      {grantingFor && (
        <div className="grant-modal-overlay" onClick={() => setGrantingFor(null)}>
          <div className="grant-modal-card" onClick={e => e.stopPropagation()}>
            <h3>Manual Access Grant</h3>
            <p>Unlocking content for: <strong>{grantingFor.email}</strong></p>
            
            <div className="grant-form">
              <label>Select Access Type:</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="grant-select"
              >
                {ALL_SUBJECTS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              
              <div className="modal-actions">
                <button 
                  className="confirm-grant-btn" 
                  onClick={handleGrantAccess}
                  disabled={isGranting}
                >
                  {isGranting ? 'Processing...' : 'Confirm Unlock'}
                </button>
                <button className="cancel-grant-btn" onClick={() => setGrantingFor(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListUsers;