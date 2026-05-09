import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import './ExamPortal.css';

const ExamPortal = () => {
  const { darkMode, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [examData, setExamData] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [reviewLater, setReviewLater] = useState([]);
  const [examResults, setExamResults] = useState(null);

  // Mock exam data
  const mockExams = {
    'grade12-natural': {
      title: 'Grade 12 Natural Science',
      description: 'Physics, Chemistry, Biology, Mathematics',
      color: '#1A237E',
      questions: [
        {
          id: 1,
          question: 'What is the chemical formula for water?',
          options: ['H2O', 'CO2', 'O2', 'N2'],
          correct: 0,
          subject: 'Chemistry'
        },
        {
          id: 2,
          question: 'What is Newton\'s Second Law of Motion?',
          options: ['F = ma', 'E = mc²', 'PV = nRT', 'V = IR'],
          correct: 0,
          subject: 'Physics'
        },
        {
          id: 3,
          question: 'What is the powerhouse of the cell?',
          options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'],
          correct: 1,
          subject: 'Biology'
        }
      ]
    },
    'grade12-social': {
      title: 'Grade 12 Social Science',
      description: 'History, Geography, Economics, Civics',
      color: '#2E7D32',
      questions: [
        {
          id: 1,
          question: 'What is the capital of Ethiopia?',
          options: ['Addis Ababa', 'Nairobi', 'Cairo', 'Johannesburg'],
          correct: 0,
          subject: 'Geography'
        },
        {
          id: 2,
          question: 'When did Ethiopia gain independence from Italy?',
          options: ['1941', '1935', '1950', '1945'],
          correct: 0,
          subject: 'History'
        }
      ]
    },
    'remedial-natural': {
      title: 'Remedial Natural Science',
      description: 'Focused support for Natural Science subjects',
      color: '#FF6F00',
      questions: [
        {
          id: 1,
          question: 'What are the three states of matter?',
          options: ['Solid, Liquid, Gas', 'Earth, Water, Fire', 'Hot, Cold, Warm', 'Big, Small, Medium'],
          correct: 0,
          subject: 'Chemistry'
        }
      ]
    },
    'remedial-social': {
      title: 'Remedial Social Science',
      description: 'Focused support for Social Science subjects',
      color: '#FF6F00',
      questions: [
        {
          id: 1,
          question: 'What is democracy?',
          options: ['Rule by the people', 'Rule by one person', 'Rule by military', 'Rule by rich'],
          correct: 0,
          subject: 'Civics'
        }
      ]
    }
  };

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

  const startExam = (examType) => {
    const exam = mockExams[examType];
    setExamData(exam);
    setCurrentView('exam');
    setIsExamActive(true);
    setTimer(1800); // 30 minutes in seconds
    setCurrentQuestion(0);
    setAnswers({});
    setReviewLater([]);
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
    setCurrentView('results');
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

  const renderHome = () => (
    <div className="exam-portal">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Grade 12 Exam Portal</h1>
          <p className="hero-subtitle">Master your exams with intelligent practice</p>
          <button className="cta-button" onClick={() => setCurrentView('categories')}>
            Start Practicing Now
          </button>
        </div>
        <div className="hero-visual">
          <div className="floating-icons">
            <span className="icon">📚</span>
            <span className="icon">🎯</span>
            <span className="icon">📈</span>
            <span className="icon">🏆</span>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="categories-section">
        <h2 className="section-title">Choose Your Exam Category</h2>
        <div className="category-grid">
          <div 
            className="category-card grade12-natural"
            onClick={() => startExam('grade12-natural')}
          >
            <div className="card-icon">⚛️</div>
            <h3>Grade 12 Natural Science</h3>
            <p>Physics, Chemistry, Biology, Mathematics</p>
            <div className="card-stats">
              <span>50+ Questions</span>
              <span>30 Min</span>
            </div>
          </div>

          <div 
            className="category-card grade12-social"
            onClick={() => startExam('grade12-social')}
          >
            <div className="card-icon">🌍</div>
            <h3>Grade 12 Social Science</h3>
            <p>History, Geography, Economics, Civics</p>
            <div className="card-stats">
              <span>45+ Questions</span>
              <span>30 Min</span>
            </div>
          </div>

          <div 
            className="category-card remedial-natural"
            onClick={() => startExam('remedial-natural')}
          >
            <div className="card-icon">🔧</div>
            <h3>Remedial Natural Science</h3>
            <p>Focused support for Natural Science</p>
            <div className="card-stats">
              <span>30+ Questions</span>
              <span>25 Min</span>
            </div>
          </div>

          <div 
            className="category-card remedial-social"
            onClick={() => startExam('remedial-social')}
          >
            <div className="card-icon">📖</div>
            <h3>Remedial Social Science</h3>
            <p>Focused support for Social Science</p>
            <div className="card-stats">
              <span>30+ Questions</span>
              <span>25 Min</span>
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
          <button className="action-btn" onClick={() => setCurrentView('home')}>
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
    <div className={`exam-portal ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Header */}
      <header className="portal-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <span className="logo-text">Exam Portal</span>
          </div>
          
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>

          <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button onClick={() => setCurrentView('home')}>Home</button>
            <button onClick={() => setCurrentView('categories')}>Categories</button>
            <button onClick={() => setCurrentView('resources')}>Resources</button>
            <button onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="portal-main">
        {currentView === 'home' && renderHome()}
        {currentView === 'exam' && renderExam()}
        {currentView === 'results' && renderResults()}
      </main>
    </div>
  );
};

export default ExamPortal;
