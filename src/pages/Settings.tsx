import React, { useState } from 'react';
import { auth } from '../firebase';
import { updateEmail, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import '../App.css';

const Settings = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();

  // State Management
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [statusMsg, setStatusMsg] = useState('');

  // 1. EDIT PROFILE FUNCTION
  const handleSaveProfile = async () => {
    if (!user || !newEmail) return;
    try {
      await updateEmail(user, newEmail);
      setStatusMsg("✅ Email updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      setStatusMsg("❌ Error: " + error.message);
    }
  };

  // 2. LOGOUT FUNCTION
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="page-container settings-page">
      <nav className="navbar">
        <div className="logo"><h2>⚙️ Settings</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/settings" className="active">Settings</a>
        </div>
      </nav>

      <div className="settings-content">
        
        {/* --- PROFILE SECTION --- */}
        <div className="settings-section animated-card delay-1">
          <h3>👤 Profile Settings</h3>
          <div className="profile-edit-box">
            <div className="input-group">
              <label>Email ID</label>
              <input 
                type="email" 
                value={newEmail} 
                disabled={!isEditing}
                onChange={(e) => setNewEmail(e.target.value)}
                className={isEditing ? 'editable' : ''}
              />
            </div>
            {isEditing ? (
              <div className="btn-group">
                <button onClick={handleSaveProfile} className="save-btn">Save</button>
                <button onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="edit-btn">Edit Profile</button>
            )}
            {statusMsg && <p className="status-msg">{statusMsg}</p>}
          </div>
        </div>

        {/* --- APP PREFERENCES --- */}
        <div className="settings-section animated-card delay-2">
          <h3>🎨 App Preferences</h3>
          
          {/* Dark Mode Toggle */}
          <div className="pref-row">
            <span>Dark Mode</span>
            <label className="switch">
              <input type="checkbox" checked={darkMode} onChange={toggleTheme} />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Language (Static English) */}
          <div className="pref-row">
            <span>Language</span>
            <span className="static-value">English (Default)</span>
          </div>
        </div>

        {/* ❌ HISTORY SECTION REMOVED HERE ❌ */}

        {/* --- ABOUT SECTION --- */}
        <div className="settings-section animated-card delay-3">
  <h3>ℹ️ About PlantScan</h3>
  
  
  <div style={{ marginBottom: "20px" }}>
    <strong>Purpose:</strong>
    <p style={{ marginTop: "8px", lineHeight: "1.6", color: "#555" }}>
      PlantScan operates as a comprehensive, AI-driven digital botanist designed to empower plant lovers of all skill levels. 
      By leveraging advanced image recognition technology, it not only identifies plant species in seconds but also accurately 
      diagnoses diseases and offers tailored treatment plans.
    </p>
  </div>

  <div style={{ marginBottom: "20px" }}>
    <strong>Why it's made:</strong>
    <p style={{ marginTop: "8px", lineHeight: "1.6", color: "#555" }}>
      We created PlantScan to democratize access to botanical expertise, effectively bridging the gap between complex agricultural 
      science and everyday gardening. Our mission is to foster a deeper connection between people and nature through the convenience of modern technology.
    </p>
  </div>

  
  {/* ATTRACTIVE CREATORS SECTION END */}
</div>

        {/* --- LOGOUT --- */}
        <button onClick={handleLogout} className="logout-btn animated-card delay-4">
          Log Out 🚪
        </button>

      </div>
    </div>
  );
};

export default Settings;