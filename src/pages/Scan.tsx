import { onAuthStateChanged } from 'firebase/auth';
import React, { useState, useRef, useEffect } from 'react';
import { identifyPlantDisease } from '../api/gemini';
import { db, auth } from '../firebase'; // Import Firebase
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore'; // Firestore functions
import '../App.css';

const Scan = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔄 LOAD SCAN HISTORY FROM FIREBASE
  // 🔄 REPLACED useEffect: Waits for Login, then Loads History
  // 🔄 LOAD SCAN HISTORY (Corrected)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "scan_history"), // 🟢 Correct Collection Name
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc")
          );
          const querySnapshot = await getDocs(q);
          const loadedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistory(loadedData);
        } catch (error) {
          console.error("Error loading scan history:", error);
        }
      } else {
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setScanResult(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedImage) return alert("Upload an image first!");
    setLoading(true);
    
    const data = await identifyPlantDisease(selectedImage);
    if (data) {
      setScanResult(data);

      const newScan = {
        // We save the image data URL so it can be shown in history
        // NOTE: Large images might hit Firestore limits. For production, use Firebase Storage.
        // For this demo, we'll try to save it directly.
        image: selectedImage, 
        ...data,
        timestamp: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
      };

      // 💾 SAVE TO FIREBASE
      try {
         if (auth.currentUser) {
           const docRef = await addDoc(collection(db, "scan_history"), newScan);
           setHistory([{ ...newScan, id: docRef.id }, ...history]);
         } else {
           const tempId = Date.now();
           setHistory([{ ...newScan, id: tempId }, ...history]);
         }
      } catch (e) {
         console.error("Error saving scan:", e);
         alert("Scan complete, but could not save to history (Image might be too large).");
         // Still show the result even if save fails
         setHistory([{ ...newScan, id: Date.now() }, ...history]);
      }
    }
    setLoading(false);
  };

  const triggerUpload = () => fileInputRef.current?.click();

  return (
    <div className="page-container"style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.71), rgba(255, 255, 255, 0.92)), url('https://as2.ftcdn.net/v2/jpg/08/50/50/71/1000_F_850507126_jlQSKJRewkho6POA6hhchJipT9EsPQSj.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      {/* ... NAVBAR ... */}
      <nav className="navbar">
        <div className="logo"><h2>🌿 PlantScan</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor">Outdoor</a>
          <a href="/scan" className="active">Scan</a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      <div className="header-section">
        <h1>Scan Disease</h1>
        <p>Upload a photo to detect diseases instantly.</p>
      </div>

      {/* --- SIDE-BY-SIDE CONTAINER --- */}
      <div className="scan-layout-container">
        
        {/* LEFT: Upload Box */}
        <div className="scan-left-panel">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{display:'none'}} />
          
          <div 
            onClick={triggerUpload}
            style={{
              width: '100%', height: '350px', 
              border: '3px dashed #ccc', borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', background: '#f9f9f9',
              position: 'relative'
            }}
          >
            {selectedImage ? (
              <img src={selectedImage} alt="Preview" style={{width:'100%', height:'100%', objectFit:'contain'}} />
            ) : (
              <div style={{textAlign:'center', color:'#888'}}>
                <span style={{fontSize:'3rem'}}>📸</span>
                <p>Click to Upload</p>
              </div>
            )}
          </div>

          <button className="modern-btn" onClick={handleScan} disabled={loading || !selectedImage} style={{width:'100%', marginTop:'20px'}}>
            {loading ? "Analyzing..." : "Analyze Plant"}
          </button>
        </div>

        {/* RIGHT: Result Card (Only shows when result exists) */}
        {scanResult && (
          <div className="scan-right-panel">
            <div className="detail-card-expanded" style={{width:'100%', margin:0, maxHeight:'none'}}>
               
               <h2 style={{
                  color: scanResult.isHealthy ? '#2e7d32' : '#c62828', 
                  fontSize: '2rem', marginTop: 0
               }}>
                  {scanResult.diseaseName}
               </h2>
               
               <div style={{
                  marginTop: '15px', padding: '15px', borderRadius: '10px',
                  background: scanResult.isHealthy ? '#e8f5e9' : '#ffebee',
                  borderLeft: scanResult.isHealthy ? '5px solid #2e7d32' : '5px solid #c62828'
               }}>
                  <strong>🔍 Cause:</strong>
                  <p style={{margin:'5px 0'}}>{scanResult.cause}</p>
               </div>

               <div style={{background: '#f0f4c3', padding: '20px', borderRadius: '15px', marginTop: '20px'}}>
                  <h4 style={{marginTop:0, color:'#333'}}>💊 Cure & Treatment</h4>
                  {/* Handle Bullet Points */}
                  <ul style={{paddingLeft:'20px', margin:0}}>
                    {Array.isArray(scanResult.cure) ? (
                      scanResult.cure.map((step: string, index: number) => (
                        <li key={index} style={{marginBottom:'8px'}}>{step}</li>
                      ))
                    ) : (
                      <li>{scanResult.cure}</li>
                    )}
                  </ul>
               </div>

            </div>
          </div>
        )}
      </div>

      {/* --- HISTORY GRID (4 Per Row) --- */}
      {history.length > 0 && (
        <>
          <h2 style={{textAlign:'center', marginTop:'50px', color:'#2e7d32'}}>Scan History</h2>
          <div className="history-grid">
            {history.map((item) => (
              <div key={item.id} className="history-card-compact">
                {/* Image check to prevent crash if image missing */}
                <img src={item.image || "https://via.placeholder.com/150"} alt="scan" />
                <div className="compact-info">
                  <h4 style={{margin:'0 0 5px'}}>{item.diseaseName}</h4>
                  <span className="status-badge" style={{
                    background: item.isHealthy ? '#e8f5e9' : '#ffebee',
                    color: item.isHealthy ? '#2e7d32' : '#c62828',
                    padding: '2px 8px', borderRadius:'10px', fontSize:'0.8rem'
                  }}>
                    {item.isHealthy ? "Healthy" : "Infected"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Scan;