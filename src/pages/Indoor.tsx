import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { getPlantRecommendation } from '../api/gemini';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import '../App.css';

const Indoor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  useEffect(() => {
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
    const data = await getPlantRecommendation(searchTerm, pinCode, "Indoor");
    if (data) {
      if (data.isValidPin === false) {
        alert("❌ Invalid Pincode\n\nThe pincode you entered does not exist.");
        setLoading(false);
        return;
      }
      if (data.isValidPlant === false) {
        alert(`⚠️ "${searchTerm}" doesn't seem to be a plant.`);
        setLoading(false);
        return;
      }
      const newResult = {
        plantName: searchTerm,
        pin: pinCode,
        imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchTerm + ' plant indoor aesthetic')}&w=500&h=500&c=7&rs=1&p=0`,
        ...data,
        timestamp: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
      };
      try {
        if (auth.currentUser) {
          const docRef = await addDoc(collection(db, "indoor_searches"), newResult);
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

  // Render star rating
  const renderStars = (rating: number) => {
    return '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(5 - rating, 0));
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
          <input type="text" placeholder="Plant Name (e.g. Snake Plant)" className="modern-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <input type="text" placeholder="PIN Code" className="modern-input" style={{ width: '150px' }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
          <button className="modern-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
      </div>

      <h2 style={{ textAlign: 'center', marginTop: '40px', color: '#2e7d32' }}>Your Search History</h2>

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
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>Click for details</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Detail Modal */}
      {expandedId !== null && (
        <div className="detail-overlay" onClick={() => setExpandedId(null)}>
          {history.map((item) => {
            if (item.id !== expandedId) return null;
            const cg = item.careGuide || {};
            const ws = cg.wateringSchedule || {};
            const soils = cg.soilComparison || [];
            const remedies = cg.homeRemedies || [];

            return (
              <div key={item.id} className="detail-card-expanded" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
                <button className="close-btn" onClick={() => setExpandedId(null)}>×</button>

                <div className="expanded-content">
                  <div className="expanded-image-container">
                    <img src={item.imageUrl} alt={item.plantName} />
                  </div>

                  <div className="expanded-text-container">
                    <h2 style={{ fontSize: '2rem', color: '#2e7d32', margin: 0 }}>{item.plantName}</h2>

                    {/* Suitability Badge */}
                    <div style={{
                      marginTop: '10px', padding: '12px', borderRadius: '8px',
                      background: item.isSuitable ? '#e8f5e9' : '#ffebee',
                      borderLeft: item.isSuitable ? '4px solid #2e7d32' : '4px solid #c62828'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: item.isSuitable ? '#1b5e20' : '#b71c1c' }}>
                        {item.isSuitable ? "✅ Excellent Choice for Indoor!" : "⚠️ Caution Recommended"}
                      </h3>
                      <p style={{ marginTop: '5px', fontSize: '0.9rem', fontStyle: 'italic' }}>"{item.recommendation}"</p>
                    </div>

                    {/* Climate Summary */}
                    <p style={{ marginTop: '15px' }}><strong>📍 Climate ({item.pin}):</strong> {item.climateSummary}</p>

                    {/* ═══ WATER SECTION ═══ */}
                    <div className="detail-section-card">
                      <h3 className="detail-section-title">💧 Watering Guide</h3>

                      <div className="detail-info-row">
                        <span className="detail-label">💦 Water Type:</span>
                        <span className="detail-value">{cg.water || 'Use room temperature water'}</span>
                      </div>

                      <div className="detail-info-row">
                        <span className="detail-label">🌡️ Water Temperature:</span>
                        <span className="detail-value">{cg.waterTemperature || 'Room temperature (20-25°C)'}</span>
                      </div>

                      {/* Watering Schedule */}
                      <h4 style={{ margin: '15px 0 10px', color: '#1976d2', fontSize: '0.95rem' }}>📅 Watering Schedule</h4>
                      <div className="schedule-grid">
                        <div className="schedule-card summer">
                          <span className="schedule-icon">☀️</span>
                          <strong>Summer</strong>
                          <p>{ws.summer || 'Daily watering'}</p>
                        </div>
                        <div className="schedule-card winter">
                          <span className="schedule-icon">❄️</span>
                          <strong>Winter</strong>
                          <p>{ws.winter || 'Every 3-4 days'}</p>
                        </div>
                        <div className="schedule-card monsoon">
                          <span className="schedule-icon">🌧️</span>
                          <strong>Monsoon</strong>
                          <p>{ws.monsoon || 'Check soil moisture'}</p>
                        </div>
                      </div>
                      {ws.perMonth && (
                        <div className="detail-info-row" style={{ marginTop: '10px', background: '#e3f2fd', padding: '10px 14px', borderRadius: '8px' }}>
                          <span className="detail-label">📊 Monthly Average:</span>
                          <span className="detail-value">{ws.perMonth}</span>
                        </div>
                      )}
                    </div>

                    {/* ═══ SUNLIGHT SECTION ═══ */}
                    <div className="detail-section-card">
                      <h3 className="detail-section-title">☀️ Sunlight Requirements</h3>
                      <p style={{ lineHeight: '1.7', color: '#444' }}>{cg.sun || 'Bright indirect light for 4-6 hours daily'}</p>
                    </div>

                    {/* ═══ SOIL SECTION ═══ */}
                    <div className="detail-section-card">
                      <h3 className="detail-section-title">🌍 Soil Guide</h3>
                      <p style={{ marginBottom: '10px', color: '#444' }}><strong>Best Soil:</strong> {cg.soil || 'Well-draining potting mix'}</p>

                      {cg.bestSoilMix && (
                        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '10px', marginBottom: '15px', borderLeft: '4px solid #2e7d32' }}>
                          <strong>🧪 Ideal Soil Mix Recipe:</strong>
                          <p style={{ margin: '5px 0 0', color: '#333' }}>{cg.bestSoilMix}</p>
                        </div>
                      )}

                      {/* Soil Comparison Table */}
                      {soils.length > 0 && (
                        <>
                          <h4 style={{ margin: '15px 0 10px', color: '#5d4037', fontSize: '0.95rem' }}>📊 Soil Comparison</h4>
                          <div className="soil-comparison-grid">
                            {soils.map((soil: any, idx: number) => (
                              <div key={idx} className="soil-card" style={{
                                borderLeft: `4px solid ${soil.suitability === 'Good' ? '#4caf50' : soil.suitability === 'Average' ? '#ff9800' : '#f44336'}`
                              }}>
                                <div className="soil-header">
                                  <strong>{soil.soilType}</strong>
                                  <span className="soil-badge" style={{
                                    background: soil.suitability === 'Good' ? '#e8f5e9' : soil.suitability === 'Average' ? '#fff3e0' : '#ffebee',
                                    color: soil.suitability === 'Good' ? '#2e7d32' : soil.suitability === 'Average' ? '#e65100' : '#c62828'
                                  }}>
                                    {soil.suitability}
                                  </span>
                                </div>
                                <p className="soil-effect">{soil.effect}</p>
                                <div className="soil-rating">
                                  <span style={{ color: '#ff9800', letterSpacing: '2px' }}>{renderStars(soil.rating || 3)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* ═══ HOME REMEDIES SECTION ═══ */}
                    {remedies.length > 0 && (
                      <div className="detail-section-card">
                        <h3 className="detail-section-title">🏡 Home Remedies & Tips</h3>
                        <ul className="remedies-list">
                          {remedies.map((remedy: string, idx: number) => (
                            <li key={idx} className="remedy-item">
                              <span className="remedy-bullet">🌿</span>
                              <span>{remedy}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* ═══ FERTILIZER SECTION ═══ */}
                    {cg.fertilizer && (
                      <div className="detail-section-card">
                        <h3 className="detail-section-title">🧪 Fertilizer Guide</h3>
                        <p style={{ lineHeight: '1.7', color: '#444' }}>{cg.fertilizer}</p>
                      </div>
                    )}

                    {/* ═══ COMMON PROBLEMS ═══ */}
                    {cg.commonProblems && (
                      <div className="detail-section-card" style={{ background: '#fff8e1', borderLeft: '4px solid #ffa000' }}>
                        <h3 className="detail-section-title" style={{ color: '#e65100' }}>⚠️ Common Problems</h3>
                        <p style={{ lineHeight: '1.7', color: '#444' }}>{cg.commonProblems}</p>
                      </div>
                    )}

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