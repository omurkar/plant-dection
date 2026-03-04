// import React, { useState } from 'react';
// import { getPlantRecommendation } from '../api/gemini'; 
// import '../App.css';

// const Outdoor = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [pinCode, setPinCode] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [history, setHistory] = useState<any[]>([]);
//   const [expandedId, setExpandedId] = useState<number | null>(null);

//   const handleSearch = async () => {
//     if (!searchTerm || !pinCode) {
//       alert("Please enter both a plant name and a PIN code.");
//       return;
//     }

//     setLoading(true);

//     const data = await getPlantRecommendation(searchTerm, pinCode, "Outdoor");
    
//     if (data) {
//         const newResult = {
//             id: Date.now(),
//             plantName: searchTerm,
//             pin: pinCode,
//             imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchTerm + ' plant outdoor garden real')}&w=500&h=500&c=7&rs=1&p=0`,
//             ...data
//         };
//         setHistory([newResult, ...history]);
//         setExpandedId(newResult.id);
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="page-container">
//       <nav className="navbar">
//         <div className="logo"><h2>🌿 PlantScan</h2></div>
//         <div className="nav-links">
//           <a href="/home">Home</a>
//           <a href="/indoor">Indoor</a>
//           <a href="/outdoor" className="active">Outdoor</a>
//           <a href="/scan">Scan</a>
//           <a href="/settings">Settings</a>
//         </div>
//       </nav>

//       <div className="header-section">
//         <h1>Outdoor Garden</h1>
//         <p>Expert tips for your backyard paradise.</p>
        
//         <div className="search-container">
//           <input 
//             type="text" 
//             placeholder="Plant Name (e.g. Tomato)" 
//             className="modern-input" 
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//           <input 
//             type="text" 
//             placeholder="PIN Code" 
//             className="modern-input" 
//             style={{width: '150px'}} 
//             value={pinCode}
//             onChange={(e) => setPinCode(e.target.value)}
//           />
//           <button className="modern-btn" onClick={handleSearch} disabled={loading}>
//             {loading ? "Analyzing..." : "Get Recommendations"}
//           </button>
//         </div>
//       </div>

//       <h2 style={{textAlign:'center', marginTop:'40px', color:'#2e7d32'}}>Your Garden Plans</h2>
      
//       <div className="history-grid">
//         {history.map((item) => (
//           <div key={item.id} className="history-card-compact" onClick={() => setExpandedId(item.id)}>
//             <img src={item.imageUrl} alt={item.plantName} loading="lazy" />
//             <div className="compact-info">
//               <h3>{item.plantName}</h3>
//               <span className="status-badge" style={{
//                 background: item.isSuitable ? '#e8f5e9' : '#ffebee',
//                 color: item.isSuitable ? '#2e7d32' : '#c62828'
//               }}>
//                 {item.isSuitable ? "✅ Suitable" : "⚠️ Caution"}
//               </span>
//               <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px'}}>Click for details</p>
//             </div>
//           </div>
//         ))}
//       </div>

//       {expandedId !== null && (
//         <div className="detail-overlay" onClick={() => setExpandedId(null)}>
//           {history.map((item) => {
//             if (item.id !== expandedId) return null;
//             return (
//               <div key={item.id} className="detail-card-expanded" onClick={(e) => e.stopPropagation()}>
//                 <button className="close-btn" onClick={() => setExpandedId(null)}>×</button>
                
//                 <div className="expanded-content">
//                    <div className="expanded-image-container">
//                       <img src={item.imageUrl} alt={item.plantName} />
//                    </div>
                   
//                    <div className="expanded-text-container">
//                       <h2 style={{fontSize: '2rem', color: '#2e7d32', margin: 0}}>{item.plantName}</h2>
                      
//                       <div style={{
//                         marginTop: '10px', 
//                         padding: '12px', 
//                         borderRadius: '8px',
//                         background: item.isSuitable ? '#e8f5e9' : '#ffebee',
//                         borderLeft: item.isSuitable ? '4px solid #2e7d32' : '4px solid #c62828'
//                       }}>
//                         <h3 style={{margin: 0, fontSize:'1.1rem', color: item.isSuitable ? '#1b5e20' : '#b71c1c'}}>
//                            {item.isSuitable ? "✅ Excellent Choice!" : "⚠️ Not Recommended for Outdoor"}
//                         </h3>
//                         <p style={{marginTop: '5px', fontSize:'0.9rem', fontStyle: 'italic'}}>"{item.recommendation}"</p>
//                       </div>

//                       <p style={{marginTop: '15px'}}><strong>📍 Climate ({item.pin}):</strong> {item.climateSummary}</p>

//                       <div className="care-guide-grid">
//                           <div className="care-item">
//                             <strong>💧 Water</strong>
//                             {item.careGuide.water}
//                           </div>
//                           <div className="care-item">
//                             <strong>☀️ Sun</strong>
//                             {item.careGuide.sun}
//                           </div>
//                           <div className="care-item">
//                             <strong>🌍 Soil</strong>
//                             {item.careGuide.soil}
//                           </div>
//                       </div>

//                    </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// };

// export default Outdoor;

import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect } from 'react';
import { getPlantRecommendation } from '../api/gemini';
import { db, auth } from '../firebase'; // Import Firebase
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore'; // Firestore
import '../App.css';

const Outdoor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // 🔄 LOAD OUTDOOR HISTORY
  // 🔄 REPLACED useEffect: Waits for Login, then Loads History
  // 🔄 LOAD OUTDOOR HISTORY (Corrected)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "outdoor_searches"), // 🟢 Correct Collection Name
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          const loadedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistory(loadedData);
        } catch (error) {
          console.error("Error loading outdoor history:", error);
        }
      } else {
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm || !pinCode) {
      alert("Please enter both a plant name and a PIN code.");
      return;
    }

    setLoading(true);

    const data = await getPlantRecommendation(searchTerm, pinCode, "Outdoor");
    
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
            plantName: searchTerm,
            pin: pinCode,
            imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchTerm + ' plant outdoor garden real')}&w=500&h=500&c=7&rs=1&p=0`,
            ...data,
            timestamp: Date.now(),
            userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
        };

        // 💾 SAVE TO FIREBASE
        try {
           if (auth.currentUser) {
             const docRef = await addDoc(collection(db, "outdoor_searches"), newResult);
             setHistory([{ ...newResult, id: docRef.id }, ...history]);
             setExpandedId(docRef.id);
           } else {
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
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.9)), url('https://cdn.pixabay.com/photo/2024/06/06/15/36/plant-8812978_1280.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      <nav className="navbar">
        <div className="logo"><h2>🌿 PlantScan</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor" className="active">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      <div className="header-section">
        <h1>Outdoor Garden</h1>
        <p>Expert tips for your backyard paradise.</p>
        
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Plant Name (e.g. Tomato)" 
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

      <h2 style={{textAlign:'center', marginTop:'40px', color:'#2e7d32'}}>Your Garden Plans</h2>
      
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
                           {item.isSuitable ? "✅ Excellent Choice!" : "⚠️ Not Recommended for Outdoor"}
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

export default Outdoor;