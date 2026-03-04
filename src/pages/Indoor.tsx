import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { getPlantRecommendation } from '../api/gemini';
import { db, auth } from '../firebase'; // Import Firebase
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore'; // Import Firestore functions
import '../App.css';

const Indoor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 🔄 LOAD INDOOR HISTORY (Corrected)
  useEffect(() => {
    // This waits for Firebase to say "Okay, user is logged in"
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "indoor_searches"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          const loadedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistory(loadedData);
        } catch (error) {
          console.error("Error loading indoor history:", error);
        }
      } else {
        setHistory([]); // Clear history if logged out
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const handleSearch = async () => {
    if (!searchTerm || !pinCode) {
      alert("Please enter both a plant name and a PIN code.");
      return;
    }

    setLoading(true);

    const data = await getPlantRecommendation(searchTerm, pinCode, "Indoor");
    
    if (data) {
        // 🛑 1. PIN CHECK
        if (data.isValidPin === false) {
            alert("❌ Invalid Pincode\n\nThe pincode you entered does not exist.");
            setLoading(false);
            return;
        }

        // 🛑 2. PLANT CHECK
        if (data.isValidPlant === false) {
            alert(`⚠️ "${searchTerm}" doesn't seem to be a plant.`);
            setLoading(false);
            return;
        }

        const newResult = {
            // No ID yet, Firebase creates it
            plantName: searchTerm,
            pin: pinCode,
            imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchTerm + ' plant indoor aesthetic')}&w=500&h=500&c=7&rs=1&p=0`,
            ...data,
            timestamp: Date.now(), // Save time for ordering
            userId: auth.currentUser ? auth.currentUser.uid : "anonymous" // Link to user
        };

        // 💾 SAVE TO FIREBASE
        try {
           if (auth.currentUser) {
             const docRef = await addDoc(collection(db, "indoor_searches"), newResult);
             // Add to local state with the new Firebase ID
             setHistory([{ ...newResult, id: docRef.id }, ...history]);
             setExpandedId(docRef.id); // Auto-expand
           } else {
             // If not logged in, just show locally
             const tempId = Date.now();
             setHistory([{ ...newResult, id: tempId }, ...history]);
             setExpandedId(tempId);
           }
        } catch (e) {
           console.error("Error adding document: ", e);
        }
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.9)), url('https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <nav className="navbar">
        <div className="logo"><h2>🌿 PlantScan</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor" className="active">Indoor</a>
          <a href="/outdoor">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      <div className="header-section">
        <h1>Indoor Sanctuary</h1>
        <p>Find the perfect companion for your living space.</p>
        
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Plant Name (e.g. Snake Plant)" 
            className="modern-input" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="PIN Code" 
            className="modern-input" 
            style={{width: '150px'}} 
            value={pinCode}
            onChange={(e) => setPinCode(e.target.value)}
          />
          <button className="modern-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
      </div>

      <h2 style={{textAlign:'center', marginTop:'40px', color:'#2e7d32'}}>Your Search History</h2>
      
      <div className="history-grid">
        {history.map((item) => (
          <div key={item.id} className="history-card-compact" onClick={() => setExpandedId(item.id)}>
            <img src={item.imageUrl} alt={item.plantName} loading="lazy" />
            <div className="compact-info">
              <h3>{item.plantName}</h3>
              <span className="status-badge" style={{
                background: item.isSuitable ? '#e8f5e9' : '#ffebee',
                color: item.isSuitable ? '#2e7d32' : '#c62828'
              }}>
                {item.isSuitable ? "✅ Suitable" : "⚠️ Caution"}
              </span>
              <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px'}}>Click for details</p>
            </div>
          </div>
        ))}
      </div>

      {expandedId !== null && (
        <div className="detail-overlay" onClick={() => setExpandedId(null)}>
          {history.map((item) => {
            if (item.id !== expandedId) return null;
            return (
              <div key={item.id} className="detail-card-expanded" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={() => setExpandedId(null)}>×</button>
                
                <div className="expanded-content">
                   <div className="expanded-image-container">
                      <img src={item.imageUrl} alt={item.plantName} />
                   </div>
                   
                   <div className="expanded-text-container">
                      <h2 style={{fontSize: '2rem', color: '#2e7d32', margin: 0}}>{item.plantName}</h2>
                      
                      <div style={{
                        marginTop: '10px', 
                        padding: '12px', 
                        borderRadius: '8px',
                        background: item.isSuitable ? '#e8f5e9' : '#ffebee',
                        borderLeft: item.isSuitable ? '4px solid #2e7d32' : '4px solid #c62828'
                      }}>
                        <h3 style={{margin: 0, fontSize:'1.1rem', color: item.isSuitable ? '#1b5e20' : '#b71c1c'}}>
                           {item.isSuitable ? "✅ Excellent Choice!" : "⚠️ Caution Recommended"}
                        </h3>
                        <p style={{marginTop: '5px', fontSize:'0.9rem', fontStyle: 'italic'}}>"{item.recommendation}"</p>
                      </div>

                      <p style={{marginTop: '15px'}}><strong>📍 Climate ({item.pin}):</strong> {item.climateSummary}</p>

                      <div className="care-guide-grid">
                          <div className="care-item">
                            <strong>💧 Water</strong>
                            {item.careGuide.water}
                          </div>
                          <div className="care-item">
                            <strong>☀️ Sun</strong>
                            {item.careGuide.sun}
                          </div>
                          <div className="care-item">
                            <strong>🌍 Soil</strong>
                            {item.careGuide.soil}
                          </div>
                      </div>

                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Indoor;