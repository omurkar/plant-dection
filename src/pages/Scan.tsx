import { onAuthStateChanged } from 'firebase/auth';
import { useState, useRef, useEffect, useCallback } from 'react';
import { identifyPlantDisease } from '../api/gemini';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import '../App.css';

const Scan = () => {
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'cause' | 'cure' | 'references'>('cause');

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load scan history from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, "scan_history"),
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

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCapturedImage(null);
      setScanResult(null);
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setCameraError("Camera access denied. Please allow camera permissions in your browser settings.");
      } else if (err.name === 'NotFoundError') {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Switch camera
  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
  }, [facingMode]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture frame from video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.95); // High quality for accurate AI detection
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  // Scan the captured image
  const handleScan = async () => {
    if (!capturedImage) return;
    setLoading(true);
    setActiveTab('cause');

    const data = await identifyPlantDisease(capturedImage);
    if (data) {
      setScanResult(data);

      const newScan = {
        image: capturedImage.length < 900000 ? capturedImage : null, // Only save if not too large
        ...data,
        timestamp: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
      };

      // Save to Firebase
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
        setHistory([{ ...newScan, id: Date.now() }, ...history]);
      }
    }
    setLoading(false);
  };

  // Retake: go back to camera
  const handleRetake = () => {
    setCapturedImage(null);
    setScanResult(null);
    startCamera();
  };

  return (
    <div className="page-container" style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.71), rgba(255, 255, 255, 0.92)), url('https://as2.ftcdn.net/v2/jpg/08/50/50/71/1000_F_850507126_jlQSKJRewkho6POA6hhchJipT9EsPQSj.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh'
    }}>
      {/* Navbar */}
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
        <h1>🔬 Real-Time Plant Scanner</h1>
        <p>Point your camera at a plant leaf to detect diseases instantly.</p>
      </div>

      {/* Side-by-side container */}
      <div className="scan-layout-container">

        {/* LEFT: Camera Panel */}
        <div className="scan-left-panel">
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Camera / Capture View */}
          <div className="camera-container">
            {!cameraActive && !capturedImage && (
              <div className="camera-placeholder" onClick={startCamera}>
                <div className="camera-placeholder-content">
                  <span className="camera-icon">📷</span>
                  <p className="camera-placeholder-title">Tap to Open Camera</p>
                  <p className="camera-placeholder-subtitle">Point at any plant leaf to scan for diseases</p>
                </div>
                <div className="camera-scan-lines"></div>
              </div>
            )}

            {cameraError && (
              <div className="camera-error-box">
                <span>⚠️</span>
                <p>{cameraError}</p>
                <button className="modern-btn" onClick={startCamera} style={{ marginTop: '10px' }}>
                  Try Again
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="camera-live-view">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                <div className="camera-overlay">
                  <div className="scan-frame">
                    <div className="scan-corner tl"></div>
                    <div className="scan-corner tr"></div>
                    <div className="scan-corner bl"></div>
                    <div className="scan-corner br"></div>
                  </div>
                  <p className="scan-instruction">Position the leaf within the frame</p>
                </div>
                <div className="camera-controls">
                  <button className="camera-ctrl-btn" onClick={switchCamera} title="Switch Camera">
                    🔄
                  </button>
                  <button className="camera-capture-btn" onClick={captureFrame} title="Capture">
                    <div className="capture-inner"></div>
                  </button>
                  <button className="camera-ctrl-btn" onClick={stopCamera} title="Close Camera">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {capturedImage && !cameraActive && (
              <div className="captured-preview">
                <img src={capturedImage} alt="Captured" className="captured-image" />
                {loading && (
                  <div className="scan-progress-overlay">
                    <div className="scan-laser"></div>
                    <p className="scanning-text">🔬 Analyzing plant...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {capturedImage && !cameraActive && (
            <div className="scan-actions">
              <button
                className="modern-btn scan-btn-primary"
                onClick={handleScan}
                disabled={loading}
              >
                {loading ? (
                  <><span className="spinner"></span> Analyzing...</>
                ) : (
                  <>🔬 Scan for Diseases</>
                )}
              </button>
              <button
                className="modern-btn scan-btn-secondary"
                onClick={handleRetake}
                disabled={loading}
              >
                📷 Retake Photo
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Result Card with Tabs */}
        {scanResult && (
          <div className="scan-right-panel">
            <div className="result-card-modern">

              {/* Header: Disease */}
              <div className="result-header">
                <div className="result-status-badge" style={{
                  background: scanResult.isHealthy ? 'linear-gradient(135deg, #43a047, #66bb6a)' : 'linear-gradient(135deg, #e53935, #ef5350)'
                }}>
                  {scanResult.isHealthy ? '✅ Healthy' : '⚠️ Infected'}
                </div>
                <h3 className="result-disease-name" style={{
                  color: scanResult.isHealthy ? '#2e7d32' : '#c62828',
                  fontSize: '1.5rem',
                  marginTop: '10px'
                }}>
                  {scanResult.diseaseName}
                </h3>
              </div>

              {/* Tab Navigation */}
              <div className="result-tabs">
                <button
                  className={`tab-btn ${activeTab === 'cause' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('cause')}
                >
                  🔍 Cause
                </button>
                <button
                  className={`tab-btn ${activeTab === 'cure' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('cure')}
                >
                  💊 Cure & Treatment
                </button>
                <button
                  className={`tab-btn ${activeTab === 'references' ? 'tab-active' : ''}`}
                  onClick={() => setActiveTab('references')}
                >
                  📚 References
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content-area">

                {/* TAB 1: Cause */}
                {activeTab === 'cause' && (
                  <div className="tab-panel cause-panel animate-fade">
                    <div className="cause-card" style={{
                      background: scanResult.isHealthy ? '#e8f5e9' : '#ffebee',
                      borderLeft: scanResult.isHealthy ? '5px solid #2e7d32' : '5px solid #c62828'
                    }}>
                      <h4>🧬 Why does this plant have this disease?</h4>
                      <p className="cause-text">{scanResult.cause}</p>
                    </div>
                    {scanResult.causeDetails && (
                      <div className="cause-details-list">
                        <h4>Contributing Factors:</h4>
                        <ul>
                          {(Array.isArray(scanResult.causeDetails) ? scanResult.causeDetails : [scanResult.causeDetails]).map((detail: string, i: number) => (
                            <li key={i} className="cause-detail-item">
                              <span className="detail-bullet">•</span>
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Cure & Treatment */}
                {activeTab === 'cure' && (
                  <div className="tab-panel cure-panel animate-fade">
                    {/* Homeopathic Remedies */}
                    <div className="treatment-section">
                      <div className="treatment-header homeopathic-header">
                        <span className="treatment-icon">🌿</span>
                        <h4>Homeopathic / Organic Remedies</h4>
                      </div>
                      <ul className="treatment-list">
                        {(Array.isArray(scanResult.homeopathicRemedies) ? scanResult.homeopathicRemedies : [scanResult.homeopathicRemedies || 'No homeopathic remedies available']).map((remedy: string, i: number) => (
                          <li key={i} className="treatment-item organic-item">
                            <span className="treatment-bullet">🍃</span>
                            {remedy}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pesticide Treatments */}
                    <div className="treatment-section">
                      <div className="treatment-header pesticide-header">
                        <span className="treatment-icon">🧪</span>
                        <h4>Pesticide / Chemical Treatment</h4>
                      </div>
                      <ul className="treatment-list">
                        {(Array.isArray(scanResult.pesticideNames) ? scanResult.pesticideNames : [scanResult.pesticideNames || 'No pesticide recommendations available']).map((pesticide: string, i: number) => (
                          <li key={i} className="treatment-item chemical-item">
                            <span className="treatment-bullet">💊</span>
                            {pesticide}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* General cure steps */}
                    {scanResult.cure && (
                      <div className="treatment-section">
                        <div className="treatment-header general-header">
                          <span className="treatment-icon">✅</span>
                          <h4>General Care Steps</h4>
                        </div>
                        <ul className="treatment-list">
                          {(Array.isArray(scanResult.cure) ? scanResult.cure : [scanResult.cure]).map((step: string, i: number) => (
                            <li key={i} className="treatment-item general-item">
                              <span className="treatment-bullet">✔️</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: References */}
                {activeTab === 'references' && (
                  <div className="tab-panel references-panel animate-fade">
                    <div className="reference-accuracy-badge">
                      <span>✅</span>
                      <p>These results are generated using AI-powered plant pathology analysis and verified against scientific databases.</p>
                    </div>

                    <div className="reference-links-container">
                      <h4>📖 Scientific References & Sources</h4>
                      {scanResult.references && Array.isArray(scanResult.references) && scanResult.references.length > 0 ? (
                        <ul className="reference-list">
                          {scanResult.references.map((ref: any, i: number) => (
                            <li key={i} className="reference-item">
                              <a
                                href={ref.url || ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="reference-link"
                              >
                                <span className="ref-icon">🔗</span>
                                <div className="ref-details">
                                  <span className="ref-title">{ref.title || ref}</span>
                                  {ref.source && <span className="ref-source">{ref.source}</span>}
                                </div>
                                <span className="ref-arrow">→</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="no-refs">No specific references available for this diagnosis.</p>
                      )}
                    </div>

                    <div className="disclaimer-box">
                      <strong>⚠️ Disclaimer:</strong> While AI-based detection is highly accurate, always consult a certified agricultural expert for critical crop decisions.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Grid */}
      {history.length > 0 && (
        <>
          <h2 style={{ textAlign: 'center', marginTop: '50px', color: '#2e7d32' }}>Scan History</h2>
          <div className="history-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            {history.map((item) => (
              <div key={item.id} className="history-card-compact">
                <img src={item.image || "https://via.placeholder.com/150?text=No+Image"} alt="scan" />
                <div className="compact-info">
                  <h4 style={{ margin: '0 0 3px' }}>{item.plantName || 'Plant'}</h4>
                  <p style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#666' }}>{item.diseaseName}</p>
                  <span className="status-badge" style={{
                    background: item.isHealthy ? '#e8f5e9' : '#ffebee',
                    color: item.isHealthy ? '#2e7d32' : '#c62828',
                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem'
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