import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
      
      // Smooth transition handling
      if (!user) {
        // Any cleanup or transition logic can go here
      }
    });

    return () => {
      // Smooth cleanup
      unsubscribe();
      setCurrentUser(null);
      setLoading(true);
    };
  }, []);

  const value = {
    currentUser,
    loading,
    // You can add more auth methods here if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}