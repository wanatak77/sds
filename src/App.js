import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import HomePage from './HomePage';
import Login from './Login';
import Register from './Register';
import Chat from './Chat';
import AdminHome from './AdminHome';
import Dashboard from './Dashboard';
import AIExam from './AIExam';
import Graphics from './Graphics';
import Software from './Software';
import JoinTeam from './JoinTeam';
import AndroidDevelopment from './AndroidDevelopment';
import LoadingSpinner from './LoadingSpinner';
import IntroOne from './IntroOne/IntroOne';
import PaymentSuccess from './PaymentSuccess';
import TeacherDashboard from './TeacherDashboard';
import { ADMIN_EMAILS } from './constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  return currentUser ? children : <Redirect to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner />;
  }
  return currentUser && ADMIN_EMAILS.includes(currentUser?.email) ? children : <Redirect to="/" />;
};

const TeacherRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [isTeacher, setIsTeacher] = useState(null);

  useEffect(() => {
    if (currentUser) {
      getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
        setIsTeacher(snap.exists() && snap.data().role === 'teacher');
      }).catch(() => setIsTeacher(false));
    } else if (!loading) {
      setIsTeacher(false);
    }
  }, [currentUser, loading]);

  if (loading || (currentUser && isTeacher === null)) {
    return <LoadingSpinner />;
  }

  return isTeacher ? children : <Redirect to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Switch>
          <Route path="/" exact component={HomePage} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/chat" component={Chat} />
          <Route path="/intro" render={() => (
            <PrivateRoute>
              <IntroOne />
            </PrivateRoute>
          )} />
          <Route path="/payment/success" component={PaymentSuccess} />
          <Route path="/dashboard" render={() => (
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          )} />
          <Route path="/exam/:subject" render={() => (
            <PrivateRoute>
              <AIExam />
            </PrivateRoute>
          )} />
          <Route path="/admin" render={() => (
            <PrivateRoute>
              <AdminRoute>
                <AdminHome />
              </AdminRoute>
            </PrivateRoute>
          )} />
          <Route path="/teacher" render={() => (
            <PrivateRoute>
              <TeacherRoute>
                <TeacherDashboard />
              </TeacherRoute>
            </PrivateRoute>
          )} />
          <Route path="/graphics" render={() => (
            <PrivateRoute>
              <Graphics />
            </PrivateRoute>
          )} />
          <Route path="/software" render={() => (
            <PrivateRoute>
              <Software />
            </PrivateRoute>
          )} />
          <Route path="/join-team" render={() => (
            <PrivateRoute>
              <JoinTeam />
            </PrivateRoute>
          )} />
          <Route path="/android-development" render={() => (
            <PrivateRoute>
              <AndroidDevelopment />
            </PrivateRoute>
          )} />
          <Route render={() => (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Inter,sans-serif',gap:'1rem'}}>
              <div style={{fontSize:'4rem'}}>🔍</div>
              <h2 style={{fontSize:'1.5rem',fontWeight:'800'}}>Page not found</h2>
              <p style={{color:'#64748b'}}>The page you're looking for doesn't exist.</p>
              <a href="/dashboard" style={{background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'white',padding:'0.75rem 1.5rem',borderRadius:'12px',textDecoration:'none',fontWeight:'700'}}>
                Go to Dashboard
              </a>
            </div>
          )} />
        </Switch>
      </AuthProvider>
    </Router>
  );
}

export default App;