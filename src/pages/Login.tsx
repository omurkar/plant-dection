import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err: any) {
      setError("Failed to log in: " + err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/home');
    } catch (err: any) {
      setError("Google Log In Failed");
    }
  };

  return (
    // Container: Full-screen background, centers content
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
      
      {/* Card: Increased width for horizontal rectangular shape */}
      <div className="auth-card" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        width: '80%',
        maxWidth: '500px', // ✅ Changed from 500px to 800px
        margin: '20px'     // ✅ Added margin for small screens
      }}>
        
        <h2 style={{color: '#2e7d32', textAlign: 'center', marginBottom: '10px'}}>Welcome Back! 🌿</h2>
        <p style={{textAlign: 'center', color: '#666', marginBottom: '30px'}}>Login to access your plant sanctuary</p>
        
        {error && <div className="error-msg" style={{
            background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center'
        }}>{error}</div>}

        <form onSubmit={handleLogin}>
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
          <div className="input-group" style={{marginBottom: '25px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
          </div>
          
          <button type="submit" className="modern-btn full-width" style={{
              width: '100%', padding: '12px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer'
          }}>Log In</button>
        </form>

        <div className="divider" style={{margin: '25px 0', textAlign: 'center', color: '#888'}}>
            <span>OR</span>
        </div>

        <button onClick={handleGoogleSignIn} className="google-btn" style={{
            width: '100%', padding: '12px', border: '1px solid #ddd', background: 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
        }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{width: '20px'}} />
          Sign in with Google
        </button>

        <div className="auth-footer" style={{marginTop: '25px', textAlign: 'center', fontSize: '0.9rem'}}>
          <Link to="/forgot-password" style={{color: '#2e7d32', textDecoration: 'none', display: 'block', marginBottom: '10px'}}>Forgot Password?</Link>
          <p>New here? <Link to="/signup" style={{color: '#2e7d32', fontWeight: 'bold'}}>Create Account</Link></p>
        </div>
      </div>
    </div>
  );
}