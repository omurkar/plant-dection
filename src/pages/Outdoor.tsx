import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { getPlantRecommendation } from '../api/gemini';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { calculateCompostRatio, getUserEcoProfile, calculateTotalCO2Offset, getCompanionPlantsFor, MOCK_PLANT_DATABASE } from '../services/mockEcoService';
import { getEcoScore, awardCompostCheck, awardRainSkip } from '../services/ecoScoreService';
import { fetchLiveWeather, getCachedWeather, type LiveWeatherInfo } from '../services/weatherService';
import '../App.css';

const Outdoor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [ecoScore, setEcoScore] = useState(getEcoScore());
  const [toast, setToast] = useState<string | null>(null);
  const [weather, setWeather] = useState<LiveWeatherInfo>(getCachedWeather());

  useEffect(() => {
    fetchLiveWeather().then(setWeather).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Compute global eco stats & personalized compost ratios from all plants in user's saved collection
  const allPlants = history.map((h) => {
    const known = MOCK_PLANT_DATABASE[(h.plantName || '').toLowerCase()];
    return {
      id: h.id || String(h.timestamp || Date.now()),
      name: h.plantName || 'Outdoor Plant',
      isNative: h.plantMeta?.isNative ?? known?.isNative ?? true,
      isInvasive: h.plantMeta?.isInvasive ?? known?.isInvasive ?? false,
      carbonOffsetKgPerYear: h.estimatedCarbonKg ?? known?.carbonOffsetKgPerYear ?? 2.5,
      estimatedCarbonKg: h.estimatedCarbonKg ?? known?.estimatedCarbonKg ?? 2.5,
      companionPlants: h.companionPlants ?? known?.companionPlants ?? getCompanionPlantsFor(h.plantName || ''),
      pollinatorFriendly: known?.pollinatorFriendly ?? ['Bees', 'Butterflies'],
      compostCategory: (known?.compostCategory || (h.plantMeta?.isInvasive ? 'Brown' : 'Brown')) as 'Green' | 'Brown'
    };
  });

  const totalCollectionCO2 = calculateTotalCO2Offset(allPlants);
  const globalCompost = allPlants.length > 0 ? calculateCompostRatio(allPlants) : null;
  const globalEcoProfile = allPlants.length > 0 ? getUserEcoProfile(allPlants) : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "outdoor_searches"),
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
      const matched = MOCK_PLANT_DATABASE[searchTerm.toLowerCase()];
      const estimatedCarbonKg = data.estimatedCarbonKg ?? matched?.estimatedCarbonKg ?? matched?.carbonOffsetKgPerYear ?? 3.5;
      const companionPlants = data.companionPlants ?? matched?.companionPlants ?? getCompanionPlantsFor(searchTerm);

      const newResult = {
        plantName: searchTerm,
        pin: pinCode,
        imageUrl: `https://tse2.mm.bing.net/th?q=${encodeURIComponent(searchTerm + ' plant outdoor garden real')}&w=500&h=500&c=7&rs=1&p=0`,
        ...data,
        estimatedCarbonKg,
        companionPlants,
        timestamp: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
      };
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

  const handleSkipWatering = () => {
    const updated = awardRainSkip();
    setEcoScore(updated);
    showToast('🌧️ Watering skipped! +10 Eco Points earned.');
  };

  const handleCompostCheck = () => {
    const updated = awardCompostCheck();
    setEcoScore(updated);
    showToast('♻️ Compost checked! +5 Eco Points earned.');
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return '★'.repeat(Math.min(rating, 5)) + '☆'.repeat(Math.max(5 - rating, 0));
  };

  return (
    <div className="page-container" style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.9)), url('https://cdn.pixabay.com/photo/2024/06/06/15/36/plant-8812978_1280.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'linear-gradient(135deg,#2e7d32,#43a047)', color: '#fff', padding: '14px 22px', borderRadius: '12px', zIndex: 9999, fontWeight: 600, boxShadow: '0 4px 20px rgba(46,125,50,0.4)' }}>
          {toast}
        </div>
      )}

      <nav className="navbar">
        <div className="logo"><h2>🌿 PlantScan</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor" className="active">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/community">Community</a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      <div className="header-section">
        <h1>Outdoor Garden</h1>
        <p>Expert tips for your backyard paradise.</p>
        <div className="search-container">
          <input type="text" placeholder="Plant Name (e.g. Tomato)" className="modern-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <input type="text" placeholder="PIN Code" className="modern-input" style={{ width: '150px' }} value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
          <button className="modern-btn" onClick={handleSearch} disabled={loading}>
            {loading ? "Analyzing..." : "Get Recommendations"}
          </button>
        </div>
      </div>

      {/* Weather + Eco-Score Banner */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 16px', padding: '0 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 2,
            minWidth: '260px',
            background: weather.isRain
              ? 'linear-gradient(135deg,#1565c0,#1976d2)'
              : weather.isExtremelyHot
              ? 'linear-gradient(135deg,#d84315,#f57c00)'
              : 'linear-gradient(135deg,#2e7d32,#43a047)',
            color: '#fff',
            borderRadius: '14px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
          }}
        >
          <span style={{ fontSize: '1.8rem' }}>{weather.icon}</span>
          <div style={{ flex: 1 }}>
            <strong>{weather.condition} • {weather.locationName}</strong>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
              {weather.recommendation}
            </p>
          </div>
          {weather.isRain && (
            <button onClick={handleSkipWatering} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              Skip (+10 pts)
            </button>
          )}
        </div>
        <div style={{ minWidth: '200px', background: 'linear-gradient(135deg,#f57f17,#ffa000)', color: '#fff', borderRadius: '14px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(245,127,23,0.3)' }}>
          <span style={{ fontSize: '1.8rem' }}>🏆</span>
          <div>
            <strong style={{ fontSize: '1.4rem' }}>{ecoScore.score}</strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.9 }}>Eco Points</p>
          </div>
        </div>
      </div>

      {/* Global Eco Stats */}
      {allPlants.length > 0 && (
        <div style={{ maxWidth: '1200px', margin: '0 auto 20px', padding: '0 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', background: '#e8f5e9', borderRadius: '14px', padding: '16px 20px', borderLeft: '5px solid #2e7d32' }}>
            <h4 style={{ margin: '0 0 8px', color: '#1b5e20' }}>🌍 Garden CO₂ Offset</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2e7d32' }}>{totalCollectionCO2} kg</div>
            <div style={{ fontSize: '0.82rem', color: '#555' }}>Total CO₂ offset per year from your {allPlants.length} outdoor plant{allPlants.length > 1 ? 's' : ''}</div>
            {globalEcoProfile && globalEcoProfile.badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {globalEcoProfile.badges.map((b, i) => <span key={i} style={{ background: '#2e7d32', color: '#fff', borderRadius: '20px', padding: '3px 10px', fontSize: '0.75rem' }}>{b}</span>)}
              </div>
            )}
          </div>
          {globalCompost && (
            <div style={{ flex: 1, minWidth: '240px', background: '#f1f8e9', borderRadius: '14px', padding: '16px 20px', borderLeft: '5px solid #8bc34a', cursor: 'pointer' }} onClick={handleCompostCheck}>
              <h4 style={{ margin: '0 0 8px', color: '#558b2f' }}>♻️ Personalized Garden Compost Ratio</h4>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#558b2f' }}>{globalCompost.currentRatio}</div>
              <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '4px' }}>{globalCompost.advice}</div>
              <div style={{ fontSize: '0.75rem', color: '#8bc34a', marginTop: '6px', fontWeight: 600 }}>Tap to earn +5 Eco Points ♻️</div>
            </div>
          )}
        </div>
      )}

      <h2 style={{ textAlign: 'center', marginTop: '40px', color: '#2e7d32' }}>Your Garden Plans</h2>

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
                        {item.isSuitable ? "✅ Excellent Choice for Outdoor!" : "⚠️ Not Ideal for Outdoor in This Area"}
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
                      <p style={{ lineHeight: '1.7', color: '#444' }}>{cg.sun || '6-8 hours of direct sunlight daily'}</p>
                    </div>

                    {/* ═══ SOIL SECTION ═══ */}
                    <div className="detail-section-card">
                      <h3 className="detail-section-title">🌍 Soil Guide</h3>
                      <p style={{ marginBottom: '10px', color: '#444' }}><strong>Best Soil:</strong> {cg.soil || 'Well-draining garden soil'}</p>

                      {cg.bestSoilMix && (
                        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '10px', marginBottom: '15px', borderLeft: '4px solid #2e7d32' }}>
                          <strong>🧪 Ideal Soil Mix Recipe:</strong>
                          <p style={{ margin: '5px 0 0', color: '#333' }}>{cg.bestSoilMix}</p>
                        </div>
                      )}

                      {/* Soil Comparison */}
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

                    {/* ═══ ECO METADATA ═══ */}
                    {item.plantMeta && (
                      <div className="detail-section-card" style={{ background: 'linear-gradient(135deg,#e8f5e9,#f1f8e9)', borderLeft: '4px solid #43a047' }}>
                        <h3 className="detail-section-title" style={{ color: '#2e7d32' }}>🌍 Eco Intelligence</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {item.plantMeta.isNative && <span style={{ background: '#2e7d32', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600 }}>🌿 Native Species</span>}
                          {item.plantMeta.isInvasive && <span style={{ background: '#c62828', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Invasive Species</span>}
                          {!item.plantMeta.isNative && !item.plantMeta.isInvasive && <span style={{ background: '#1565c0', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600 }}>🌱 Introduced Species</span>}
                        </div>
                        <p style={{ margin: '0 0 10px', fontWeight: 600, color: '#2e7d32', fontSize: '0.95rem' }}>
                          ☁️ Estimated Carbon Offset: <strong>{(item.estimatedCarbonKg ?? item.carbonOffsetKgPerYear ?? item.ecoProfile?.totalCarbonOffset ?? 3.5).toFixed(1)} kg CO₂/year</strong>
                        </p>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.88rem', color: '#1b5e20' }}>🌸 Companion Plants: </strong>
                          {(item.companionPlants || getCompanionPlantsFor(item.plantName || '')).map((c: string, i: number) => (
                            <span key={i} style={{ background: '#e8f5e9', border: '1px solid #81c784', borderRadius: '12px', padding: '2px 8px', fontSize: '0.78rem', color: '#2e7d32', marginLeft: '5px' }}>{c}</span>
                          ))}
                        </div>
                        {item.plantMeta.commonPests?.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.88rem', color: '#e65100' }}>🐛 Pests: </strong>
                            {item.plantMeta.commonPests.map((p: string, i: number) => (
                              <span key={i} style={{ background: '#fff3e0', border: '1px solid #ffa000', borderRadius: '12px', padding: '2px 8px', fontSize: '0.78rem', color: '#e65100', marginLeft: '5px' }}>{p}</span>
                            ))}
                          </div>
                        )}
                        {item.plantMeta.organicRemedies?.length > 0 && (
                          <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                            {item.plantMeta.organicRemedies.map((r: string, i: number) => (
                              <li key={i} style={{ fontSize: '0.84rem', color: '#444', marginBottom: '2px' }}>🍃 {r}</li>
                            ))}
                          </ul>
                        )}
                        {/* Watering Override */}
                        {weather.isRain ? (
                          <div style={{ marginTop: '12px', background: '#e3f2fd', borderRadius: '10px', padding: '10px 14px', borderLeft: '4px solid #1976d2' }}>
                            <strong style={{ color: '#1565c0', fontSize: '0.88rem' }}>🌧️ Rain Alert: </strong>
                            <span style={{ fontSize: '0.84rem', color: '#555' }}>Rain detected — skip watering today to save water and earn eco points!</span>
                          </div>
                        ) : weather.isExtremelyHot ? (
                          <div style={{ marginTop: '12px', background: '#fff3e0', borderRadius: '10px', padding: '10px 14px', borderLeft: '4px solid #f57c00' }}>
                            <strong style={{ color: '#e65100', fontSize: '0.88rem' }}>☀️ Heat Alert ({weather.temperature}°C): </strong>
                            <span style={{ fontSize: '0.84rem', color: '#555' }}>Intense heatwave! Water thoroughly early morning or evening to prevent heat shock.</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* ═══ COMPOST RATIO ═══ */}
                    {item.compostRatio && (
                      <div className="detail-section-card" style={{ background: '#f1f8e9', borderLeft: '4px solid #8bc34a' }}>
                        <h3 className="detail-section-title" style={{ color: '#558b2f' }}>♻️ Compost Guide</h3>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#558b2f' }}>{item.compostRatio.currentRatio}</p>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#555' }}>{item.compostRatio.advice}</p>
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

export default Outdoor;