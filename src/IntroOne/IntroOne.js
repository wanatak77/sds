import React, { useState, useRef } from 'react';
import { useAuth } from '../AuthContext';
import './IntroOne.css';
import Contact from './Contact';

const IntroOne = () => {
  const { currentUser } = useAuth();
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState(currentUser?.displayName || 'User Name');
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'user@example.com');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const fileInputRef = useRef(null);

  const handleProfileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="app-container">
      {/* Left Sidebar with Profile */}
      <div className="sidebar">
        <div className="profile-section">
          <div 
            className="profile-pic"
            onClick={handleProfileClick}
            style={{ cursor: 'pointer' }}
          >
            {profileImage ? (
              <img 
                src={profileImage} 
                alt="Profile" 
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--secondary-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2rem'
              }}>
                {userName.charAt(0)}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <div className="profile-edit-hint">Click to upload</div>
          </div>

          {/* ... rest of your existing profile section ... */}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Navigation */}
        <div className="top-nav">
          <button 
            className="nav-btn home-btn"
            onClick={() => {
              setShowCommentForm(false);
              setShowContact(false);
            }}
          >
            Home
          </button>
          <div className="nav-right">
            <button 
              className="nav-btn contact-btn"
              onClick={() => {
                setShowContact(!showContact);
                setShowCommentForm(false);
              }}
            >
              Contact Us
            </button>
            <button 
              className="nav-btn comment-btn"
              onClick={() => {
                setShowCommentForm(!showCommentForm);
                setShowContact(false);
              }}
            >
              Comment
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="content-area">
          {!showCommentForm && !showContact && (
            <>
              <h1>Welcome {userName.split(' ')[0]}!</h1>
              <p>This is your personalized dashboard. You can update your profile picture and information by clicking on your profile.</p>
            </>
          )}
          
          {/* ... rest of your existing content ... */}
        </div>
      </div>
    </div>
  );
};

export default IntroOne;