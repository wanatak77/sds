import React, { useState, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { loginWithEmailAndPassword, recordActivity } from './firebase';
import './Login.css';
import { ADMIN_EMAIL } from './constants';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const { currentUser } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email === ADMIN_EMAIL) {
        history.push('/admin');
      } else {
        getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
          if (snap.exists() && snap.data().role === 'teacher') {
            history.push('/teacher');
          } else {
            history.push('/dashboard');
          }
        }).catch(() => history.push('/dashboard'));
      }
    }
  }, [currentUser, history]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginWithEmailAndPassword(email, password);
      if (result.success) {
        // Record activity
        recordActivity(result.user.uid, result.user.email, 'Login', 'User signed in');
        
        setError('');
        setLoading(false);
        setTimeout(() => {
          if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            history.push('/admin');
          } else if (result.user?.uid) {
            getDoc(doc(db, 'users', result.user.uid)).then(snap => {
              if (snap.exists() && snap.data().role === 'teacher') {
                history.push('/teacher');
              } else {
                history.push('/dashboard');
              }
            }).catch(() => history.push('/dashboard'));
          } else {
            // Let the useEffect handle the redirect via AuthContext
          }
        }, 100);
      } else {
        setError(result.error || 'Invalid email or password');
        setLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Login</h2>
        {error && <div className="login-error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="Enter your email address"
            />
            <small className="form-hint">Enter your registered email address (e.g., user@example.com)</small>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            <small className="form-hint">Enter your password (minimum 6 characters)</small>
          </div>
          <button 
            type="submit" 
            className={`login-button ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner"></span> Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
        <div className="login-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;