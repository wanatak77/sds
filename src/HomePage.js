import React, { useState, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import './HomePage.css';
import logo from './logo1.jpg';
import { db } from './firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const applyBodyClasses = (darkMode) => {
  if (darkMode) {
    document.body.classList.add('dark-mode-body');
    document.body.classList.remove('light-mode-body');
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.add('light-mode-body');
    document.body.classList.remove('dark-mode-body');
    localStorage.setItem('theme', 'light');
  }
};

const HomePage = () => {
  const history = useHistory();
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true;
  });

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    if (history && typeof history.push === 'function') {
      try {
        history.push(path);
      } catch (error) {
        console.error('History navigation failed:', error);
        // Fallback to window.location
        window.location.href = path;
      }
    } else {
      console.error('History object not available, using window.location');
      window.location.href = path;
    }
  };
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyBodyClasses(darkMode);
  }, [darkMode]);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const q = query(
          collection(db, 'promotions'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const promoData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          promoData.push({ 
            id: doc.id, 
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          });
        });
        setPromotions(promoData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching promotions:", error);
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const features = [
    {
      id: 1,
      title: "Custom Software Development",
      description: "Tailored solutions designed specifically for your business needs and requirements.",
      icon: "💻"
    },
    {
      id: 2,
      title: "Cloud Solutions",
      description: "Scalable and secure cloud infrastructure for your applications and data.",
      icon: "☁️"
    },
    {
      id: 3,
      title: "UI/UX Design",
      description: "Beautiful, intuitive interfaces that enhance user experience and engagement.",
      icon: "🎨"
    },
    {
      id: 4,
      title: "24/7 Support",
      description: "Round-the-clock technical support to keep your systems running smoothly.",
      icon: "🛠️"
    }
  ];

  
  return (
    <div className={`home-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Navigation Bar */}
      <nav className={`main-nav ${darkMode ? 'dark-nav' : 'light-nav'}`}>
        <div className="nav-container">
          <div className="nav-brand">
            <img src={logo} alt="SDS Software Logo" className="logo" />
            <span> </span>
            <button className="nav-link">Home</button>
          </div>
          
          <div className="nav-links">
            {/* Empty to maintain layout */}
          </div>
          
          <div className="nav-actions">
            <Link to="/login" className={`nav-btn ${darkMode ? 'dark-btn' : 'light-btn'}`} style={{textDecoration: 'none', display: 'inline-block'}}>
              Login
            </Link>
            <Link to="/register" className={`cta-btn ${darkMode ? 'dark-cta' : 'light-cta'}`} style={{textDecoration: 'none', display: 'inline-block'}}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`hero-section ${darkMode ? 'dark-hero' : 'light-hero'}`}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">🏆 Student Achievement Portal</div>
          <h1 className="hero-title">
            Unlock Your <span className="hero-highlight">Full Potential</span>
          </h1>
          <p className="hero-subtitle">
            Track your progress, master every subject, and achieve your university dream — all in one smart platform built for Ethiopian Grade 12 students.
          </p>

          {/* Achievement Stats */}
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-num">10K+</span>
              <span className="stat-label">Students</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-num">95%</span>
              <span className="stat-label">Pass Rate</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-num">10K+</span>
              <span className="stat-label">Exam Questions</span>
            </div>
          </div>

          <div className="hero-buttons">
            <Link to="/register" className={`primary-btn ${darkMode ? 'dark-primary' : 'light-primary'}`} style={{textDecoration: 'none', display: 'inline-flex'}}>
              🚀 Start Your Journey
            </Link>
            <Link to="/dashboard" className={`secondary-btn ${darkMode ? 'dark-secondary' : 'light-secondary'}`} style={{textDecoration: 'none', display: 'inline-flex'}}>
              📖 Explore Subjects
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Updates & Exam News Section */}
      <section className={`updates-section ${darkMode ? 'dark-updates' : 'light-updates'}`}>
        <div className="section-header">
          <h2 className="section-title">📢 Latest Updates & Exam News</h2>
          <p className="section-subtitle">Stay updated with the Ministry of Education announcements and exam schedules</p>
        </div>
        
        <div className="updates-grid">
          <div className={`update-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="update-icon">🔔</div>
            <h3>National Exam Countdown</h3>
            <p>Stay focused! Keep tracking your progress for the upcoming entrance exams.</p>
          </div>
          <div className={`update-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="update-icon">🔔</div>
            <h3>University Placement Tips</h3>
            <p>New guides available on how to choose your campus and field of study.</p>
          </div>
        </div>
      </section>

      {/* Academic Support Section */}
      <section className={`support-section ${darkMode ? 'dark-support' : 'light-support'}`}>
        <div className="section-header">
          <h2 className="section-title">Our Academic Support</h2>
          <p className="section-subtitle">Comprehensive learning solutions for Grade 12 & Remedial students</p>
        </div>
        
        <div className="support-grid">
          <div className={`support-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="support-icon">📚</div>
            <h3>Complete Subject Coverage</h3>
            <p>In-depth lessons for both Natural and Social Science streams tailored to the Ethiopian curriculum.</p>
          </div>
          <div className={`support-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="support-icon">📝</div>
            <h3>Exam Mastery Tools</h3>
            <p>Access a massive library of past entrance exams and model questions with detailed explanations.</p>
          </div>
          <div className={`support-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="support-icon">💡</div>
            <h3>Smart Study Notes</h3>
            <p>Beautifully organized, easy-to-read summaries that help you memorize key concepts faster.</p>
          </div>
          <div className={`support-card ${darkMode ? 'dark-card' : 'light-card'}`}>
            <div className="support-icon">🎓</div>
            <h3>24/7 Academic Guidance</h3>
            <p>Round-the-clock resources and motivational tips to keep your study sessions running smoothly.</p>
          </div>
        </div>
      </section>

      <footer className={`main-footer ${darkMode ? 'dark-footer' : 'light-footer'}`}>
        <div className="footer-content">
          <p>© 2026 Ethio-Grade 12 Prep. All rights reserved.</p>
          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;