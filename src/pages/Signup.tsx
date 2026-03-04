import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPass) return setError("Passwords do not match");

    try {
      // 1. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Display Name
      await updateProfile(user, { displayName: username });

      // 3. Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email,
        createdAt: new Date()
      });

      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    // 🟢 Container: Same background and alignment as Login
    <div className="auth-container" style={{
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      minWidth: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      
      {/* 🟢 Card: Same width and glass effect as Login */}
      <div className="auth-card" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        width: '80%',
        maxWidth: '500px', // Matches your Login card size
        margin: '20px'
      }}>
        
        <h2 style={{color: '#2e7d32', textAlign: 'center', marginBottom: '10px'}}>Join PlantScan 🌱</h2>
        <p style={{textAlign: 'center', color: '#666', marginBottom: '30px'}}>Start your green journey today</p>
        
        {error && <div className="error-msg" style={{
            background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center'
        }}>{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="input-group" style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
          </div>
          <div className="input-group" style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Email ID</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
          </div>
          <div className="input-group" style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
          </div>
          <div className="input-group" style={{marginBottom: '25px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Re-enter Password</label>
            <input 
              type="password" 
              value={confirmPass} 
              onChange={e => setConfirmPass(e.target.value)} 
              required 
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
          </div>
          
          <button type="submit" className="modern-btn full-width" style={{
              width: '100%', padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer'
          }}>Sign Up</button>
        </form>

        <div className="auth-footer" style={{marginTop: '25px', textAlign: 'center', fontSize: '0.9rem'}}>
          <p>Already have an account? <Link to="/login" style={{color: '#2e7d32', fontWeight: 'bold'}}>Log In</Link></p>
        </div>
      </div>
    </div>
  );
}