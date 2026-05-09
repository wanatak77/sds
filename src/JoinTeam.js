import React from 'react';
import { useTheme } from './ThemeContext';
import './JoinTeam.css';

const JoinTeam = () => {
  const { darkMode } = useTheme();

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className={`jointeam-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className={`jointeam-header ${darkMode ? 'dark-header' : 'light-header'}`}>
        <h1>🤝 Join Our Team</h1>
        <p>Become part of our creative community</p>
      </div>

      <div className="jointeam-content">
        <div className={`jointeam-card ${darkMode ? 'dark-card' : 'light-card'}`}>
          <h2 className="jointeam-title">Open Positions</h2>
          <ul className="jointeam-features">
            <li>Graphic Designer</li>
            <li>Software Developer</li>
            <li>UI/UX Designer</li>
            <li>Project Manager</li>
          </ul>

          <div className="jointeam-message info">
            <p>🚀 We’re excited that you're interested in joining our vibrant team.</p>
            <p>💬 To get started, please reach out to the administration through our official support channel.</p>
            <p className="highlight">📞 Let’s connect and build something amazing together!</p>
          </div>

          <a
  href="https://t.me/SDSsupporrt"
  target="_blank"
  rel="noopener noreferrer"
  className="telegram-btn"
>
  <svg viewBox="0 0 24 24" width="24" height="24" fill="#0088cc" style={{ marginRight: '8px' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.03-.1.05-.2-.05-.3-.1-.1-.25-.05-.36-.03-.15.05-2.55 1.64-7.2 4.8-.68.45-1.3.67-1.99.66-.66-.01-1.93-.37-2.88-.75-1.15-.46-2.06-.7-1.98-1.48.05-.45.7-.9 1.92-1.37 7.55-3.18 10.6-4.83 10.95-5.06.48-.3.92-.45 1.4-.45.3 0 .6.07.85.2.6.3.8.96.6 1.8z"/>
  </svg>
  Contact Administration
</a>


          <button
            onClick={handleBack}
            className={`jointeam-btn back-btn ${darkMode ? 'dark-action' : 'light-action'}`}
          >
            ⬅ Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinTeam;
