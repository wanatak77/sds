import React, { useState, useEffect } from 'react';
import './Graphics.css';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useHistory } from 'react-router-dom';

const Graphics = () => {
  const [registrationData, setRegistrationData] = useState({
    fullName: '',
    phoneNumber: '',
    course: 'graphics'
  });
  const [isRegistered, setIsRegistered] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const history = useHistory();

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          return;
        }

        const email = currentUser.email;
        setUserEmail(email);

        const q = query(
          collection(db, 'graphicsStudents'),
          where('email', '==', email)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setIsRegistered(true);
          const userDoc = querySnapshot.docs[0].data();
          if (userDoc.status === 'approved') {
            setIsApproved(true);
          }
        }
      } catch (err) {
        console.error("Error checking registration:", err);
        setError("Failed to check registration.");
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistration();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRegistrationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const email = currentUser?.email || '';
      setUserEmail(email);

      const registrationId = Date.now().toString();
      const courseCollection = `${registrationData.course}Students`;

      await setDoc(doc(db, courseCollection, registrationId), {
        id: registrationId,
        fullName: registrationData.fullName,
        phoneNumber: registrationData.phoneNumber,
        course: registrationData.course,
        email: email,
        status: 'pending',
        createdAt: new Date()
      });

      await setDoc(doc(db, "users", registrationId), {
        id: registrationId,
        fullName: registrationData.fullName,
        phoneNumber: registrationData.phoneNumber,
        course: registrationData.course,
        email: email,
        status: 'pending',
        createdAt: new Date()
      });

      setIsRegistered(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="graphics-page loading">Loading...</div>;
  }

  if (!isRegistered) {
    return (
      <div className="graphics-page light-mode">
        <div className="registration-container">
          <div className="registration-card light-card">
            <h2>Register for Courses</h2>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={registrationData.fullName}
                  onChange={handleChange}
                  required
                  minLength="2"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={registrationData.phoneNumber}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10,15}"
                />
              </div>
              <div className="form-group">
                <label>Select Course</label>
                <select
                  name="course"
                  value={registrationData.course}
                  onChange={handleChange}
                  required
                >
                  <option value="graphics">Graphics Design</option>
                  <option value="software">Software Development</option>
                  <option value="android">Android Development</option>
                </select>
              </div>
              <button
                type="submit"
                className="registration-btn light-action"
                disabled={isLoading}
              >
                {isLoading ? 'Registering...' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

// ... previous code stays the same

if (!isApproved) {
  return (
    <div className="graphics-page light-mode">
      <div className="registration-container">
        <div className="registration-card light-card">
          <h2>✅Registration Submitted</h2>
          <p>Thank you for registering!</p>
          <p>⏳ Your registration is <strong>pending administration approval. If you experience any delays,🕒 please contact the administration for further support.</strong></p>

          <div className="support-section">
            <p style={{ color: 'blue', borderRadius: '50%', backgroundColor: '#e6f0ff', padding: '8px 12px', display: 'inline-block' }}>
              🔵✔️ To complete your registration, contact the administration for assistance.
            </p>

            <p>Please contact our support team if needed:</p>
            <a 
              href="https://t.me/SDSsupporrt" 
              target="_blank" 
              rel="noopener noreferrer"
              className="telegram-btn"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#0088cc" style={{ marginRight: '8px' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.03-.1.05-.2-.05-.3-.1-.1-.25-.05-.36-.03-.15.05-2.55 1.64-7.2 4.8-.68.45-1.3.67-1.99.66-.66-.01-1.93-.37-2.88-.75-1.15-.46-2.06-.7-1.98-1.48.05-.45.7-.9 1.92-1.37 7.55-3.18 10.6-4.83 10.95-5.06.48-.3.92-.45 1.4-.45.3 0 .6.07.85.2.6.3.8.96.6 1.8z"/>
              </svg>
              Contact on Telegram
            </a>
          </div>

          <div className="btn-section">
            <button
              className="back-btn"
              onClick={() => history.push('/dashboard')}
            >
              ⬅ Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ ADD THIS BLOCK FOR APPROVED USERS
return (
  <div className="graphics-page light-mode">
    <div className="registration-container">
      <div className="registration-card light-card">
        <h2>🎨 Graphics Design Course Coming Soon!</h2>
<p>Your registration has been approved.</p>
<p>Please stay tuned — course materials and updates will be available shortly.</p>


        <div className="btn-section">
          <button
            className="back-btn"
            onClick={() => history.push('/dashboard')}
          >
            ⬅ Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
export default Graphics;
