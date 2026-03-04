import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Import Pages
import Home from './pages/Home';
import Indoor from './pages/Indoor';
import Outdoor from './pages/Outdoor';
import Scan from './pages/Scan';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Protected Route Component
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<div>Forgot Password Page (Todo)</div>} />

            {/* Protected Routes */}
            <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/indoor" element={<PrivateRoute><Indoor /></PrivateRoute>} />
            <Route path="/outdoor" element={<PrivateRoute><Outdoor /></PrivateRoute>} />
            <Route path="/scan" element={<PrivateRoute><Scan /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;