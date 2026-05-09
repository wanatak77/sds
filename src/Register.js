import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { registerWithEmailAndPassword, recordActivity } from './firebase';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const history = useHistory();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return setError('Name is required');
    }

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    setLoading(true);
    setError('');

    const result = await registerWithEmailAndPassword(
      formData.email, 
      formData.password,
      formData.name
    );

    if (result.success) {
      recordActivity(result.user?.uid, formData.email, 'Register', 'New user account created');
      setSuccess(true);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Register</h2>
        
        {success ? (
          <div className="register-success">
            <p>Registration successful! Please check your email to verify your account.</p>
            <button className="register-button" onClick={() => history.push('/login')}>Go to Login</button>
          </div>
        ) : (
          <>
            {error && <div className="register-error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Enter your full name"
                />
                <small className="form-hint">Enter your complete name (e.g., John Doe)</small>
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  placeholder="Enter your email address"
                />
                <small className="form-hint">Enter a valid email address (e.g., user@example.com)</small>
              </div>
              
              <div className="form-group">
                <label>Password (min 6 characters)</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                  minLength="6"
                  placeholder="Create a password"
                />
                <small className="form-hint">Create a strong password with at least 6 characters</small>
              </div>
              
              <div className="form-group">
                <label>Confirm Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  required 
                  minLength="6"
                  placeholder="Re-enter your password"
                />
                <small className="form-hint">Re-enter your password to confirm it matches</small>
              </div>
              
              <button 
                type="submit" 
                className={`register-button ${loading ? 'loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="register-spinner"></span> Registering...
                  </>
                ) : 'Register'}
              </button>
            </form>
            
            <div className="register-footer">
              Already have an account? 
              <Link to="/login">Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;