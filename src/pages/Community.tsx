import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  where
} from 'firebase/firestore';
import { getEcoScore, awardBiodiversityLog, awardPlantSwap } from '../services/ecoScoreService';
import { fetchLiveWeather, getCachedWeather, type LiveWeatherInfo } from '../services/weatherService';
import '../App.css';

export interface SwapListing {
  id: string;
  user: string;
  userId?: string;
  offering: string;
  seeking: string;
  location: string;
  createdAt: number;
}

export interface SwapRequest {
  id: string;
  listingId: string;
  ownerId?: string;
  ownerName: string;
  requesterId?: string;
  requesterName: string;
  partnerName: string;
  partnerLocation: string;
  offering: string;
  seeking: string;
  requestedBy?: string;
  requestedByUid?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  requestId: string;
  senderId?: string;
  senderName?: string;
  sender: 'You' | string;
  text?: string;
  imageUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileDataUrl?: string;
  timestamp: number;
}

export interface BiodiversityPin {
  id?: string;
  species: string;
  landmark: string;
  description?: string;
  lat: number;
  lng: number;
  loggedBy: string;
  userId?: string;
  createdAt?: number;
}

const SWAP_REQUESTS_KEY = 'plantscan_swap_requests';
const CHAT_STORAGE_PREFIX = 'plantscan_swap_chat_';

const Community: React.FC = () => {
  // Weather state (real-time location based)
  const [weather, setWeather] = useState<LiveWeatherInfo>(getCachedWeather());
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Eco score
  const [ecoRecord, setEcoRecord] = useState(getEcoScore());

  // Selected Pin Modal state (When a user opens any location to view landmark & coordinates)
  const [selectedPin, setSelectedPin] = useState<BiodiversityPin | null>(null);

  // Biodiversity pins state (synced with Firebase Firestore so all users see each other's pins - NO DUMMY DATA)
  const [biodiversityPins, setBiodiversityPins] = useState<BiodiversityPin[]>(() => {
    try {
      const saved = localStorage.getItem('plantscan_biodiversity_pins');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [newPin, setNewPin] = useState({ species: '', landmark: '', description: '', lat: '', lng: '' });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Swap listings state (synced with Firebase Firestore - NO DUMMY DATA)
  const [swapListings, setSwapListings] = useState<SwapListing[]>(() => {
    try {
      const saved = localStorage.getItem('plantscan_community_swaps');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [newSwap, setNewSwap] = useState({ offering: '', seeking: '', location: '' });

  // Swap Requests state (persistent)
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>(() => {
    try {
      const saved = localStorage.getItem(SWAP_REQUESTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Active Chat State
  const [activeChat, setActiveChat] = useState<SwapRequest | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState('');

  // File & Image Refs for Chat
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollEndRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Consistent User Identity
  const getStoredGuestId = () => {
    let gid = localStorage.getItem('plantscan_guest_uid');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('plantscan_guest_uid', gid);
    }
    return gid;
  };

  const getStoredGuestName = () => {
    let gname = localStorage.getItem('plantscan_guest_name');
    if (!gname) {
      gname = 'EcoGardener_' + Math.floor(100 + Math.random() * 900);
      localStorage.setItem('plantscan_guest_name', gname);
    }
    return gname;
  };

  const currentUserId = auth.currentUser?.uid || getStoredGuestId();
  const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || getStoredGuestName();

  // Load real-time weather on mount
  const loadWeather = async (force: boolean = false) => {
    setWeatherLoading(true);
    try {
      const data = await fetchLiveWeather(undefined, undefined, force);
      setWeather(data);
    } catch (err) {
      console.error('Weather load error:', err);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // 1. FIREBASE FIRESTORE REAL-TIME SYNC FOR SWAP NETWORK (ALL USERS)
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const q = query(collection(db, 'community_swaps'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const map = new Map<string, SwapListing>();
          snapshot.docs.forEach(doc => {
            map.set(doc.id, {
              id: doc.id,
              ...(doc.data() as Omit<SwapListing, 'id'>)
            });
          });
          const list = Array.from(map.values());
          setSwapListings(list);
          localStorage.setItem('plantscan_community_swaps', JSON.stringify(list));
        },
        error => {
          console.warn('Firestore swaps listener fallback to local:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore swap initialization error:', e);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // 2. FIREBASE FIRESTORE REAL-TIME SYNC FOR BIODIVERSITY MAP (ALL USERS)
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const q = query(collection(db, 'biodiversity_pins'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const map = new Map<string, BiodiversityPin>();
          snapshot.docs.forEach(doc => {
            map.set(doc.id, {
              id: doc.id,
              ...(doc.data() as Omit<BiodiversityPin, 'id'>)
            });
          });
          const list = Array.from(map.values());
          setBiodiversityPins(list);
          localStorage.setItem('plantscan_biodiversity_pins', JSON.stringify(list));
        },
        error => {
          console.warn('Firestore biodiversity listener fallback to local:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore biodiversity initialization error:', e);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // 3. FIREBASE FIRESTORE REAL-TIME SYNC FOR SWAP REQUESTS (ALL USERS)
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    try {
      const q = query(collection(db, 'swap_requests'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const map = new Map<string, SwapRequest>();
          snapshot.docs.forEach(doc => {
            map.set(doc.id, {
              id: doc.id,
              ...(doc.data() as Omit<SwapRequest, 'id'>)
            });
          });
          const list = Array.from(map.values());
          setSwapRequests(list);
          localStorage.setItem(SWAP_REQUESTS_KEY, JSON.stringify(list));
        },
        error => {
          console.warn('Firestore swap_requests listener error:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore swap_requests initialization error:', e);
    }
  }, []);

  // ═════════════════════════════════════════════════════════════════
  // 4. REAL-TIME FIRESTORE CHAT MESSAGING (NO AUTO MSGS - USER TO USER)
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!activeChat) {
      setChatMessages([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'swap_messages'),
        where('requestId', '==', activeChat.id)
      );
      const unsubscribe = onSnapshot(
        q,
        snapshot => {
          const map = new Map<string, ChatMessage>();
          snapshot.docs.forEach(doc => {
            map.set(doc.id, {
              id: doc.id,
              ...(doc.data() as Omit<ChatMessage, 'id'>)
            });
          });
          const msgs = Array.from(map.values());
          msgs.sort((a, b) => a.timestamp - b.timestamp);
          setChatMessages(msgs);
        },
        error => {
          console.warn('Firestore chat listener error, fallback to local:', error);
          try {
            const raw = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${activeChat.id}`);
            if (raw) setChatMessages(JSON.parse(raw));
          } catch {
            // ignore
          }
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Chat listener init error:', e);
    }
  }, [activeChat]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatScrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ═════════════════════════════════════════════════════════════════
  // SWAP NETWORK ACTIONS
  // ═════════════════════════════════════════════════════════════════

  // Publish new Swap Listing to Firebase so ALL users see it (no duplicate)
  const handlePostSwapListing = async () => {
    if (!newSwap.offering.trim() || !newSwap.seeking.trim()) {
      showToast('⚠️ Please enter both what plant you are offering and seeking.');
      return;
    }

    const listingData = {
      user: currentUserName,
      userId: currentUserId,
      offering: newSwap.offering.trim(),
      seeking: newSwap.seeking.trim(),
      location: newSwap.location.trim() || weather.locationName || 'Local Neighborhood',
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'community_swaps'), listingData);
      // onSnapshot automatically updates state with NO duplicate!
    } catch (e) {
      console.warn('Saving to Firestore failed, saving locally:', e);
      const localListing: SwapListing = { id: `local_${Date.now()}`, ...listingData };
      setSwapListings(prev => [localListing, ...prev]);
      localStorage.setItem('plantscan_community_swaps', JSON.stringify([localListing, ...swapListings]));
    }

    const updated = awardPlantSwap();
    setEcoRecord(updated);
    setNewSwap({ offering: '', seeking: '', location: '' });
    showToast(`📢 Plant swap posted! Visible to all community users.`);
  };

  // User A sends request to User B: saved to Firestore as pending
  const handleSendSwapRequest = async (listing: SwapListing) => {
    const existing = swapRequests.find(
      r => r.listingId === listing.id && (r.requesterId === currentUserId || r.requesterName === currentUserName)
    );
    if (existing) {
      if (existing.status === 'accepted') {
        setActiveChat(existing);
      } else {
        showToast(`⏳ Swap request already sent to ${listing.user}. Waiting for them to accept!`);
      }
      return;
    }

    const newReqData = {
      listingId: listing.id,
      ownerId: listing.userId || '',
      ownerName: listing.user,
      requesterId: currentUserId,
      requesterName: currentUserName,
      partnerName: listing.user,
      partnerLocation: listing.location,
      offering: listing.offering,
      seeking: listing.seeking,
      status: 'pending' as const,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'swap_requests'), newReqData);
      showToast(`🤝 Swap request sent to ${listing.user}! When they accept, chat will open.`);
    } catch (e) {
      console.warn('Saving swap request failed, saving locally:', e);
      const localReq: SwapRequest = { id: `req_${Date.now()}`, ...newReqData };
      setSwapRequests(prev => [localReq, ...prev]);
      showToast(`🤝 Swap request sent to ${listing.user}!`);
    }

    const updated = awardPlantSwap();
    setEcoRecord(updated);
  };

  // User B accepts request from User A: status becomes accepted, unlocking chat for both!
  const handleAcceptSwapRequest = async (request: SwapRequest) => {
    try {
      await updateDoc(doc(db, 'swap_requests', request.id), {
        status: 'accepted'
      });
      showToast(`🎉 You accepted ${request.requesterName}'s swap request! Chat is now open.`);
      setActiveChat({ ...request, status: 'accepted' });
    } catch (e) {
      console.warn('Accept request error:', e);
      setSwapRequests(prev =>
        prev.map(r => (r.id === request.id ? { ...r, status: 'accepted' } : r))
      );
      setActiveChat({ ...request, status: 'accepted' });
      showToast(`Swap request accepted! Chat is now open.`);
    }
  };

  const handleDeclineSwapRequest = async (request: SwapRequest) => {
    try {
      await updateDoc(doc(db, 'swap_requests', request.id), {
        status: 'declined'
      });
      showToast(`Request declined.`);
    } catch (e) {
      setSwapRequests(prev => prev.filter(r => r.id !== request.id));
    }
  };

  const handleOpenChat = (request: SwapRequest) => {
    setActiveChat(request);
  };

  // ═════════════════════════════════════════════════════════════════
  // DIRECT USER-TO-USER CHAT (REALTIME DELIVERY VIA FIRESTORE)
  // ═════════════════════════════════════════════════════════════════
  const handleSendTextMessage = async () => {
    if (!chatInputText.trim() || !activeChat) return;

    const text = chatInputText.trim();
    setChatInputText('');

    const msgData = {
      requestId: activeChat.id,
      senderId: currentUserId,
      senderName: currentUserName,
      sender: currentUserName,
      text,
      timestamp: Date.now()
    };

    try {
      await addDoc(collection(db, 'swap_messages'), msgData);
    } catch (e) {
      console.warn('Failed to send msg to Firestore, saving locally:', e);
      const localMsg: ChatMessage = { id: `msg_${Date.now()}`, ...msgData };
      setChatMessages(prev => [...prev, localMsg]);
    }
  };

  // Helper to compress image size so it uploads instantly and never exceeds Firestore 1MB doc limit
  const compressImageForChat = (file: File, maxDim = 800, quality = 0.72): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(ev.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(ev.target?.result as string);
        img.src = ev.target?.result as string;
      };
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      showToast('⏳ Resizing & preparing photo...');
      const compressedDataUrl = await compressImageForChat(file, 800, 0.72);

      const msgData = {
        requestId: activeChat.id,
        senderId: currentUserId,
        senderName: currentUserName,
        sender: currentUserName,
        text: file.name ? `📷 Photo: ${file.name}` : '📷 Plant Photo',
        imageUrl: compressedDataUrl,
        timestamp: Date.now()
      };

      try {
        await addDoc(collection(db, 'swap_messages'), msgData);
        showToast('📷 Photo sent!');
      } catch (e) {
        console.warn('Send image failed, saving locally:', e);
        const localMsg: ChatMessage = { id: `msg_${Date.now()}`, ...msgData };
        setChatMessages(prev => [...prev, localMsg]);
      }
    } catch (err) {
      console.error('Image compression error:', err);
      showToast('⚠️ Could not process image. Please try another image.');
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    const sizeInKB = Math.round(file.size / 1024);
    if (file.size > 800 * 1024) {
      showToast(`⚠️ File too large (${sizeInKB} KB). Max file size is 800 KB for direct chat.`);
      e.target.value = '';
      return;
    }

    const sizeStr =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${sizeInKB} KB`;

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      const msgData = {
        requestId: activeChat.id,
        senderId: currentUserId,
        senderName: currentUserName,
        sender: currentUserName,
        text: `📎 Document: ${file.name}`,
        fileName: file.name,
        fileSize: sizeStr,
        fileDataUrl: result,
        timestamp: Date.now()
      };

      try {
        await addDoc(collection(db, 'swap_messages'), msgData);
        showToast('📎 File sent!');
      } catch (e) {
        console.warn('Send file failed, saving locally:', e);
        const localMsg: ChatMessage = { id: `msg_${Date.now()}`, ...msgData };
        setChatMessages(prev => [...prev, localMsg]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ═════════════════════════════════════════════════════════════════
  // BIODIVERSITY MAP ACTIONS (WITH NEAREST LANDMARK & GOOGLE MAPS)
  // ═════════════════════════════════════════════════════════════════
  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      showToast('❌ Geolocation not supported by your browser');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setNewPin(prev => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4)
        }));
        setGpsLoading(false);
        showToast('📍 Exact GPS coordinates captured!');
      },
      err => {
        console.warn('GPS error:', err);
        setNewPin(prev => ({
          ...prev,
          lat: weather.latitude.toFixed(4),
          lng: weather.longitude.toFixed(4)
        }));
        setGpsLoading(false);
        showToast(`📍 Set to present area (${weather.locationName})`);
      },
      { timeout: 7000 }
    );
  };

  // Log biodiversity sighting to Firebase Firestore so ALL users see it
  const handleLogBiodiversity = async () => {
    if (!newPin.species.trim()) {
      showToast('⚠️ Please enter the plant or tree species name.');
      return;
    }
    if (!newPin.landmark.trim()) {
      showToast('⚠️ Please enter the nearest landmark so others can find it easily.');
      return;
    }

    const lat = parseFloat(newPin.lat) || weather.latitude || 19.076;
    const lng = parseFloat(newPin.lng) || weather.longitude || 72.877;

    const pinData = {
      species: newPin.species.trim(),
      landmark: newPin.landmark.trim(),
      description: newPin.description.trim(),
      lat,
      lng,
      loggedBy: currentUserName,
      userId: currentUserId,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'biodiversity_pins'), pinData);
      // onSnapshot automatically updates state in real time without duplication!
    } catch (e) {
      console.warn('Saving pin to Firestore failed, saving locally:', e);
      const localPin: BiodiversityPin = { id: `local_pin_${Date.now()}`, ...pinData };
      setBiodiversityPins(prev => [localPin, ...prev]);
      localStorage.setItem('plantscan_biodiversity_pins', JSON.stringify([localPin, ...biodiversityPins]));
    }

    const updated = awardBiodiversityLog();
    setEcoRecord(updated);
    setNewPin({ species: '', landmark: '', description: '', lat: '', lng: '' });
    showToast(`🗺️ Sighting logged with nearest landmark! (+20 pts)`);
  };

  // Relocate directly to Google Maps with Landmark + Coordinates for easy finding
  const handleOpenGoogleMaps = (pin: BiodiversityPin) => {
    const queryTerm = pin.landmark
      ? `${pin.landmark}, ${pin.lat},${pin.lng}`
      : `${pin.lat},${pin.lng}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryTerm)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Weather Banner Theme
  const getWeatherBannerStyle = () => {
    if (weather.isRain) {
      return {
        background: 'linear-gradient(135deg, #0d47a1, #1976d2)',
        borderColor: '#64b5f6',
        icon: '🌧️'
      };
    }
    if (weather.isExtremelyHot) {
      return {
        background: 'linear-gradient(135deg, #d84315, #f57c00)',
        borderColor: '#ffb74d',
        icon: '☀️🔥'
      };
    }
    return {
      background: 'linear-gradient(135deg, #1b5e20, #388e3c)',
      borderColor: '#81c784',
      icon: '☀️'
    };
  };

  const bannerTheme = getWeatherBannerStyle();

  return (
    <div
      className="page-container"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.96)), url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=2000&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        position: 'relative'
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: '12px',
            zIndex: 99999,
            fontWeight: 600,
            boxShadow: '0 8px 25px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {toast}
        </div>
      )}

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <h2>🌿 PlantScan</h2>
        </div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/community" className="active">
            Community
          </a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      {/* Page Header */}
      <div className="header-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>🌍 Eco Community Hub</h1>
          <span
            style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.88rem',
              fontWeight: 700,
              border: '1px solid #a5d6a7',
              boxShadow: '0 2px 6px rgba(46,125,50,0.15)'
            }}
          >
            🏆 Eco Score: {ecoRecord.score} pts (Level {Math.floor(ecoRecord.score / 50) + 1})
          </span>
        </div>
        <p>Live Location Weather • Community Plant Swap with Direct Chat • Biodiversity Mapping with Landmarks</p>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* REAL-TIME WEATHER FORECAST BANNER          */}
      {/* ═══════════════════════════════════════════ */}
      <div style={{ maxWidth: '1420px', width: '96%', margin: '0 auto 24px', padding: '0 10px', boxSizing: 'border-box' }}>
        <div
          style={{
            background: bannerTheme.background,
            color: '#fff',
            borderRadius: '18px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            border: `2px solid ${bannerTheme.borderColor}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: 1, minWidth: '300px' }}>
            <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
              {bannerTheme.icon}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.22)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  📍 Present Location
                </span>
                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  Updated: {weather.lastUpdated}
                </span>
              </div>
              <h2 style={{ margin: '4px 0 2px', fontSize: '1.4rem', color: '#fff', fontWeight: 800 }}>
                {weather.condition}
              </h2>
              <div style={{ fontSize: '0.95rem', opacity: 0.95, fontWeight: 500 }}>
                📍 {weather.locationName}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  marginTop: '8px',
                  fontSize: '0.84rem',
                  opacity: 0.92,
                  flexWrap: 'wrap'
                }}
              >
                <span>🌡️ <strong>{weather.temperature}°C</strong> (Feels like {weather.apparentTemperature}°C)</span>
                <span>💧 Humidity: <strong>{weather.humidity}%</strong></span>
                <span>🌧️ Precipitation: <strong>{weather.precipitation} mm</strong></span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '10px',
              minWidth: '240px'
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '0.82rem',
                lineHeight: 1.4,
                maxWidth: '380px',
                textAlign: 'left'
              }}
            >
              🌱 <strong>Horticulture Advice:</strong> {weather.recommendation}
            </div>

            <button
              onClick={() => loadWeather(true)}
              disabled={weatherLoading}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.6)',
                color: '#fff',
                padding: '7px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {weatherLoading ? '🔄 Detecting...' : '🔄 Re-detect Live Weather'}
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* EQUAL-SIZED & BROADER TWO-COLUMN CONTAINER                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          maxWidth: '1420px',
          width: '96%',
          margin: '0 auto',
          padding: '0 10px 60px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
          gap: '24px',
          alignItems: 'stretch',
          boxSizing: 'border-box'
        }}
      >
        {/* ═══════════════════════════════════════════ */}
        {/* BOX 1: PLANT SWAP NETWORK (BROAD & EQUAL)   */}
        {/* ═══════════════════════════════════════════ */}
        <div
          className="detail-section-card"
          style={{
            background: '#fffde7',
            border: '2px solid #fbc02d',
            display: 'flex',
            flexDirection: 'column',
            height: '680px',
            minHeight: '680px',
            boxSizing: 'border-box',
            margin: 0
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 className="detail-section-title" style={{ color: '#f57f17', margin: 0, fontSize: '1.25rem' }}>
              🤝 Plant Swap Network
            </h3>
            <span
              style={{
                background: '#fff9c4',
                color: '#f57f17',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid #fbc02d'
              }}
            >
              Live Community Synced 🌐
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: '#666', margin: '0 0 12px' }}>
            Post what you have and what you want. <strong>Listings are visible to all users who log into PlantScan!</strong>
          </p>

          {/* Broad, Horizontal Post Form (2 rows) */}
          <div
            style={{
              background: '#fff',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #fff59d',
              marginBottom: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#f57f17', marginBottom: '8px' }}>
              📢 Post Your Plant Swap
            </div>

            {/* Row 1: Offering & Seeking side by side */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Offering (e.g. Healthy Tulsi cuttings)"
                className="modern-input"
                style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}
                value={newSwap.offering}
                onChange={e => setNewSwap({ ...newSwap, offering: e.target.value })}
              />
              <input
                type="text"
                placeholder="Seeking (e.g. Aloe Vera or Mint)"
                className="modern-input"
                style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}
                value={newSwap.seeking}
                onChange={e => setNewSwap({ ...newSwap, seeking: e.target.value })}
              />
            </div>

            {/* Row 2: Location & Submit button side by side */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={`Area/Location (default: ${weather.locationName || 'Local Area'})`}
                className="modern-input"
                style={{ flex: 2, padding: '8px 10px', fontSize: '0.85rem' }}
                value={newSwap.location}
                onChange={e => setNewSwap({ ...newSwap, location: e.target.value })}
              />
              <button
                className="modern-btn"
                onClick={handlePostSwapListing}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #f57f17, #ffa000)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '9px 12px',
                  fontSize: '0.86rem',
                  whiteSpace: 'nowrap'
                }}
              >
                📢 Post Listing
              </button>
            </div>
          </div>

          {/* 1. Incoming Swap Requests for Listing Owner (Needs User B Action) */}
          {swapRequests.some(r => (r.ownerId === currentUserId || r.ownerName === currentUserName) && r.status === 'pending') && (
            <div style={{ background: '#fff8e1', border: '1.5px solid #ffb300', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, color: '#e65100', fontSize: '0.86rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📬 Incoming Swap Requests ({swapRequests.filter(r => (r.ownerId === currentUserId || r.ownerName === currentUserName) && r.status === 'pending').length})</span>
                <span style={{ fontSize: '0.72rem', background: '#e65100', color: '#fff', padding: '1px 6px', borderRadius: '8px' }}>Action Needed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                {swapRequests.filter(r => (r.ownerId === currentUserId || r.ownerName === currentUserName) && r.status === 'pending').map(req => (
                  <div key={req.id} style={{ background: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ffe082', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#333' }}>
                        👤 {req.requesterName} wants to swap
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#666' }}>
                        Offering: <strong>{req.seeking}</strong> for your <strong>{req.offering}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleAcceptSwapRequest(req)}
                        style={{ background: 'linear-gradient(135deg, #2e7d32, #43a047)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={() => handleDeclineSwapRequest(req)}
                        style={{ background: '#f5f5f5', color: '#777', border: '1px solid #ccc', padding: '6px 8px', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Active Accepted Conversations (Chat Open for Both Users) */}
          {swapRequests.some(r => (r.ownerId === currentUserId || r.ownerName === currentUserName || r.requesterId === currentUserId || r.requesterName === currentUserName) && r.status === 'accepted') && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#2e7d32', marginBottom: '6px' }}>
                💬 Your Active Swap Conversations ({swapRequests.filter(r => (r.ownerId === currentUserId || r.ownerName === currentUserName || r.requesterId === currentUserId || r.requesterName === currentUserName) && r.status === 'accepted').length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                {swapRequests.filter(r => (r.ownerId === currentUserId || r.ownerName === currentUserName || r.requesterId === currentUserId || r.requesterName === currentUserName) && r.status === 'accepted').map(req => {
                  const partnerName = (req.ownerId === currentUserId || req.ownerName === currentUserName) ? req.requesterName : req.ownerName;
                  return (
                    <div
                      key={req.id}
                      style={{
                        background: '#e8f5e9',
                        borderLeft: '4px solid #2e7d32',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1b5e20' }}>
                          👤 {partnerName} • <span style={{ fontSize: '0.76rem', color: '#555' }}>{req.partnerLocation}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#555' }}>
                          🔄 {req.offering} ⇄ {req.seeking}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenChat(req)}
                        style={{
                          background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        💬 Open Chat
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Real Community Listings (Synced with all users) */}
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#333', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌱 Available Community Swaps ({swapListings.length})</span>
            <span style={{ fontSize: '0.76rem', color: '#777' }}>First-time option: Send Request</span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {swapListings.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  border: '1px dashed #fbc02d',
                  color: '#777'
                }}
              >
                <span style={{ fontSize: '2rem' }}>🌿</span>
                <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#333' }}>
                  No swap listings posted yet!
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem' }}>
                  Use the form above to post your first plant swap. It will be instantly visible to all users who log in.
                </p>
              </div>
            ) : (
              swapListings.map(listing => {
                const isOwnListing = listing.userId === currentUserId || listing.user === currentUserName;
                const myReq = swapRequests.find(
                  r => r.listingId === listing.id && (r.requesterId === currentUserId || r.requesterName === currentUserName)
                );

                return (
                  <div
                    key={listing.id}
                    style={{
                      background: '#fff',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      borderLeft: '4px solid #ffa000',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#333', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          👤 {listing.user}
                          {isOwnListing && (
                            <span
                              style={{
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '8px',
                                border: '1px solid #c8e6c9'
                              }}
                            >
                              Your Listing
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '4px' }}>
                          📍 {listing.location}
                        </div>
                      </div>

                      {/* FIRST TIME OPTION: "Send Request", and Open Chat ONLY after B accepts */}
                      {isOwnListing ? (
                        <span
                          style={{
                            background: '#f5f5f5',
                            color: '#666',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          Posted by you
                        </span>
                      ) : myReq?.status === 'accepted' ? (
                        <button
                          onClick={() => handleOpenChat(myReq)}
                          style={{
                            background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          💬 Open Chat
                        </button>
                      ) : myReq?.status === 'pending' ? (
                        <span
                          style={{
                            background: '#fff3e0',
                            color: '#e65100',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: '1px solid #ffe0b2',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>⏳</span>
                          <span>Request Sent</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendSwapRequest(listing)}
                          style={{
                            background: 'linear-gradient(135deg, #f57f17, #ffa000)',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(245,127,23,0.3)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Send Request
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#444', marginTop: '6px' }}>
                      🌱 <strong>Offering:</strong> {listing.offering}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#444' }}>
                      🔍 <strong>Seeking:</strong> {listing.seeking}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* BOX 2: BIODIVERSITY MAP (BROAD & EQUAL)     */}
        {/* ═══════════════════════════════════════════ */}
        <div
          className="detail-section-card"
          style={{
            background: '#e8f5e9',
            border: '2px solid #66bb6a',
            display: 'flex',
            flexDirection: 'column',
            height: '680px',
            minHeight: '680px',
            boxSizing: 'border-box',
            margin: 0
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 className="detail-section-title" style={{ color: '#2e7d32', margin: 0, fontSize: '1.25rem' }}>
              🗺️ Biodiversity Map
            </h3>
            <span
              style={{
                background: '#c8e6c9',
                color: '#1b5e20',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 700
              }}
            >
              Landmarks + Google Maps 📍
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: '#555', margin: '0 0 12px' }}>
            Sightings include nearest landmarks and GPS. <strong>Visible to all users of the website and opens directly in Google Maps!</strong>
          </p>

          {/* Broad, Horizontal Sighting Form (2 rows) */}
          <div
            style={{
              background: '#fff',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #c8e6c9',
              marginBottom: '14px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#2e7d32', marginBottom: '8px' }}>
              📍 Log a Sighting with Nearest Landmark
            </div>

            {/* Row 1: Species name & Nearest Landmark side by side */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Species (e.g. Banyan Tree, Peepal)"
                className="modern-input"
                style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}
                value={newPin.species}
                onChange={e => setNewPin({ ...newPin, species: e.target.value })}
              />
              <input
                type="text"
                placeholder="Nearest Landmark (e.g. Near SGNP Gate 3, Opp Oberoi Mall)"
                className="modern-input"
                style={{ flex: 1.2, padding: '8px 10px', fontSize: '0.85rem' }}
                value={newPin.landmark}
                onChange={e => setNewPin({ ...newPin, landmark: e.target.value })}
              />
            </div>

            {/* Row 2: Description & Site Details */}
            <div style={{ marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Site Description & Notes (e.g. Large mature canopy, medicinal leaves, shaded bench nearby)"
                className="modern-input"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '0.85rem' }}
                value={newPin.description}
                onChange={e => setNewPin({ ...newPin, description: e.target.value })}
              />
            </div>

            {/* Row 3: Lat, Lng, GPS button, and Log button side by side */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Latitude (e.g. 19.1692)"
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: '1px solid #a5d6a7',
                  outline: 'none',
                  background: '#f9fbe7'
                }}
                value={newPin.lat}
                onChange={e => setNewPin({ ...newPin, lat: e.target.value })}
              />

              <input
                type="text"
                placeholder="Longitude (e.g. 72.8461)"
                style={{
                  flex: 1,
                  padding: '7px 8px',
                  fontSize: '0.82rem',
                  borderRadius: '8px',
                  border: '1px solid #a5d6a7',
                  outline: 'none',
                  background: '#f9fbe7'
                }}
                value={newPin.lng}
                onChange={e => setNewPin({ ...newPin, lng: e.target.value })}
              />

              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={gpsLoading}
                title="Auto-fill with current GPS"
                style={{
                  background: '#388e3c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {gpsLoading ? '⏳' : '📍 GPS'}
              </button>

              <button
                className="modern-btn"
                onClick={handleLogBiodiversity}
                style={{
                  flex: 1.3,
                  background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '8px 12px',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap'
                }}
              >
                📍 Log Sighting (+20 pts)
              </button>
            </div>
          </div>

          {/* Sighting Pins List (Synced across all website users) */}
          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1b5e20', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌲 Sightings with Landmarks ({biodiversityPins.length})</span>
            <span style={{ fontSize: '0.76rem', color: '#555' }}>Click any card to open location details</span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {biodiversityPins.length === 0 ? (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  border: '1px dashed #66bb6a',
                  color: '#666'
                }}
              >
                <span style={{ fontSize: '2rem' }}>🌳</span>
                <p style={{ margin: '8px 0 4px', fontWeight: 600, color: '#2e7d32' }}>
                  No biodiversity sightings logged yet!
                </p>
                <p style={{ margin: 0, fontSize: '0.82rem' }}>
                  Use the form above to log a plant or tree with its nearest landmark and GPS coordinates.
                </p>
              </div>
            ) : (
              biodiversityPins.map((pin, i) => (
                <div
                  key={pin.id || i}
                  onClick={() => setSelectedPin(pin)}
                  title={`Click to view nearest landmark & coordinates for ${pin.species}`}
                  style={{
                    background: '#fff',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    borderLeft: '4px solid #43a047',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 12px rgba(46,125,50,0.18)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '1.6rem' }}>🌳</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1b5e20', fontSize: '0.92rem' }}>
                        {pin.species}
                      </div>

                      {/* Prominent Nearest Landmark */}
                      <div style={{ fontSize: '0.82rem', color: '#2e7d32', fontWeight: 600, marginTop: '1px' }}>
                        📍 <strong>Landmark:</strong> {pin.landmark || 'Nearby Area'}
                      </div>

                      {/* Description visible in short overview of the site */}
                      {pin.description && (
                        <div
                          style={{
                            fontSize: '0.79rem',
                            color: '#334155',
                            marginTop: '3px',
                            background: '#f1f8e9',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            borderLeft: '3px solid #43a047',
                            lineHeight: 1.3
                          }}
                        >
                          📝 <strong>Description:</strong> {pin.description}
                        </div>
                      )}

                      <div style={{ fontSize: '0.76rem', color: '#666', marginTop: '2px' }}>
                        🌐 {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)} • Logged by {pin.loggedBy}
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={e => {
                      e.stopPropagation();
                      handleOpenGoogleMaps(pin);
                    }}
                    title="Open directly in Google Maps"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#e3f2fd',
                      color: '#1565c0',
                      border: '1px solid #90caf9',
                      padding: '5px 10px',
                      borderRadius: '14px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>Google Maps</span>
                    <span>↗</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* ACTIVE ECO CHALLENGES                       */}
        {/* ═══════════════════════════════════════════ */}
        <div
          className="detail-section-card"
          style={{
            gridColumn: '1 / -1',
            background: 'linear-gradient(135deg, #fce4ec, #f3e5f5)',
            border: '2px solid #ce93d8',
            margin: 0
          }}
        >
          <h3 className="detail-section-title" style={{ color: '#7b1fa2', fontSize: '1.25rem' }}>
            🎯 Active Eco Challenges
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {[
              {
                icon: '🤝',
                title: 'Send a Swap Request',
                pts: 25,
                desc: 'Connect with a gardener in the swap network',
                done: swapRequests.length > 0
              },
              {
                icon: '💬',
                title: 'Chat with a Plant Partner',
                pts: 20,
                desc: 'Exchange messages, photos or files in direct chat',
                done: chatMessages.length > 1
              },
              {
                icon: '🗺️',
                title: 'Log Biodiversity GPS with Landmark',
                pts: 20,
                desc: 'Mark a tree or plant sighting with nearest landmark',
                done: biodiversityPins.some(p => p.loggedBy === currentUserName || p.userId === currentUserId)
              },
              {
                icon: '☀️',
                title: 'Check Live Weather Advice',
                pts: 10,
                desc: 'Adapt your watering schedule to realtime climate',
                done: true
              }
            ].map((ch, i) => (
              <div
                key={i}
                style={{
                  background: ch.done ? '#e8f5e9' : '#fff',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  borderLeft: `4px solid ${ch.done ? '#43a047' : '#ce93d8'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                  {ch.done ? '✅' : ch.icon}
                </div>
                <div style={{ fontWeight: 700, color: ch.done ? '#2e7d32' : '#333', fontSize: '0.88rem' }}>
                  {ch.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#666', margin: '4px 0' }}>
                  {ch.desc}
                </div>
                <div style={{ fontWeight: 700, color: '#7b1fa2', fontSize: '0.8rem' }}>
                  +{ch.pts} pts {ch.done ? '• Completed!' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* BIODIVERSITY LOCATION DETAIL MODAL          */}
      {/* ═══════════════════════════════════════════ */}
      {selectedPin && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99998,
            padding: '16px'
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedPin(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2.2rem' }}>🌳</span>
                <div>
                  <h3 style={{ margin: 0, color: '#1b5e20', fontSize: '1.25rem', fontWeight: 800 }}>
                    {selectedPin.species}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#666' }}>
                    Logged by <strong>{selectedPin.loggedBy}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                style={{
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Prominent Nearest Landmark */}
            <div
              style={{
                background: '#f1f8e9',
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '14px',
                border: '1.5px solid #a5d6a7'
              }}
            >
              <div style={{ fontSize: '0.84rem', color: '#2e7d32', fontWeight: 700, marginBottom: '4px' }}>
                📍 Nearest Landmark Location:
              </div>
              <div style={{ fontSize: '1.1rem', color: '#1b5e20', fontWeight: 800 }}>
                {selectedPin.landmark || 'Nearby Area'}
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#558b2f' }}>
                Follow this landmark to find the plant easily in real life or on Google Maps.
              </p>
            </div>

            {/* Site Description & Notes */}
            {selectedPin.description && (
              <div
                style={{
                  background: '#f1f8e9',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  marginBottom: '14px',
                  border: '1.5px solid #a5d6a7'
                }}
              >
                <div style={{ fontSize: '0.84rem', color: '#2e7d32', fontWeight: 700, marginBottom: '4px' }}>
                  📝 Site Description & Notes:
                </div>
                <div style={{ fontSize: '0.94rem', color: '#1b5e20', lineHeight: 1.4 }}>
                  {selectedPin.description}
                </div>
              </div>
            )}

            {/* Latitude and Longitude Coordinates */}
            <div
              style={{
                background: '#f9fbe7',
                padding: '14px 16px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid #dce775'
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#555', fontWeight: 700, marginBottom: '6px' }}>
                🌐 Precise GPS Coordinates:
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #c5e1a5', fontSize: '0.88rem' }}>
                  Latitude: <strong style={{ color: '#1b5e20' }}>{selectedPin.lat}</strong>
                </div>
                <div style={{ background: '#fff', padding: '6px 12px', borderRadius: '8px', border: '1px solid #c5e1a5', fontSize: '0.88rem' }}>
                  Longitude: <strong style={{ color: '#1b5e20' }}>{selectedPin.lng}</strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  handleOpenGoogleMaps(selectedPin);
                  setSelectedPin(null);
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #1976d2, #2196f3)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(25,118,210,0.3)'
                }}
              >
                <span>🗺️ Open in Google Maps</span>
                <span>↗</span>
              </button>
              <button
                onClick={() => setSelectedPin(null)}
                style={{
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* DIRECT PLANT SWAP CHAT WINDOW (MODAL)       */}
      {/* ═══════════════════════════════════════════ */}
      {activeChat && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={e => {
            if (e.target === e.currentTarget) setActiveChat(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '560px',
              height: '620px',
              maxHeight: '90vh',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'fadeIn 0.25s ease'
            }}
          >
            {/* Chat Header */}
            {(() => {
              const chatPartner = (activeChat.ownerId === currentUserId || activeChat.ownerName === currentUserName)
                ? activeChat.requesterName
                : activeChat.ownerName;

              return (
                <>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #1b5e20, #2e7d32)',
                      color: '#fff',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#81c784',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: '#1b5e20'
                        }}
                      >
                        {chatPartner.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {chatPartner}
                          <span
                            style={{
                              background: '#a5d6a7',
                              color: '#1b5e20',
                              fontSize: '0.68rem',
                              padding: '1px 7px',
                              borderRadius: '10px'
                            }}
                          >
                            🟢 Direct Chat
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                          🌱 Swap: <strong>{activeChat.offering}</strong> ⇄ <strong>{activeChat.seeking}</strong> ({activeChat.partnerLocation})
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveChat(null)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#fff',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Chat Messages Feed */}
                  <div
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '16px',
                      background: '#f4f6f4',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {chatMessages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#777' }}>
                        <span style={{ fontSize: '2.5rem' }}>💬</span>
                        <p style={{ margin: '8px 0 4px', fontWeight: 700, color: '#333', fontSize: '1rem' }}>
                          Direct Chat with {chatPartner}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#666' }}>
                          Send a message to coordinate your plant swap: "{activeChat.offering}" ⇄ "{activeChat.seeking}".
                        </p>
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const isMe = msg.senderId === currentUserId || msg.senderName === currentUserName || msg.sender === 'You';
                        const senderLabel = isMe ? 'You' : (msg.senderName || chatPartner);
                        const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf: isMe ? 'flex-end' : 'flex-start',
                              maxWidth: '82%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isMe ? 'flex-end' : 'flex-start'
                            }}
                          >
                            <div style={{ fontSize: '0.72rem', color: '#777', marginBottom: '2px', padding: '0 4px' }}>
                              {senderLabel} • {timeStr}
                            </div>

                            <div
                              style={{
                                background: isMe ? 'linear-gradient(135deg, #2e7d32, #388e3c)' : '#fff',
                                color: isMe ? '#fff' : '#222',
                                padding: '10px 14px',
                                borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                fontSize: '0.9rem',
                                lineHeight: 1.4,
                                border: isMe ? 'none' : '1px solid #e0e0e0'
                              }}
                            >
                              {/* Image Message */}
                              {msg.imageUrl && (
                                <div style={{ marginBottom: msg.text ? '8px' : '0' }}>
                                  <div
                                    style={{
                                      width: '240px',
                                      maxWidth: '100%',
                                      height: '160px',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      position: 'relative',
                                      cursor: 'pointer',
                                      border: isMe ? '1px solid rgba(255,255,255,0.3)' : '1px solid #e0e0e0',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                      background: '#000'
                                    }}
                                    onClick={() => setPreviewImage(msg.imageUrl || null)}
                                    title="Click to view full image"
                                  >
                                    <img
                                      src={msg.imageUrl}
                                      alt="Plant Upload"
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block'
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '6px',
                                        right: '6px',
                                        background: 'rgba(0,0,0,0.65)',
                                        color: '#fff',
                                        fontSize: '0.7rem',
                                        padding: '2px 7px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        backdropFilter: 'blur(2px)'
                                      }}
                                    >
                                      🔍 View
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* File Document Message */}
                              {msg.fileDataUrl && (
                                <div
                                  style={{
                                    background: isMe ? 'rgba(255,255,255,0.18)' : '#f8f9fa',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    marginBottom: msg.text ? '6px' : '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '240px',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    border: isMe ? '1px solid rgba(255,255,255,0.25)' : '1px solid #e2e8f0'
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '8px',
                                      background: isMe ? 'rgba(255,255,255,0.2)' : '#e8f5e9',
                                      color: isMe ? '#fff' : '#2e7d32',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '1.2rem',
                                      flexShrink: 0
                                    }}
                                  >
                                    📄
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}
                                      title={msg.fileName}
                                    >
                                      {msg.fileName}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '1px' }}>
                                      {msg.fileSize}
                                    </div>
                                  </div>
                                  <a
                                    href={msg.fileDataUrl}
                                    download={msg.fileName || 'plant-attachment'}
                                    style={{
                                      background: isMe ? '#fff' : '#2e7d32',
                                      color: isMe ? '#2e7d32' : '#fff',
                                      padding: '5px 10px',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    ⬇ Get
                                  </a>
                                </div>
                              )}

                              {/* Text Message */}
                              {msg.text && (
                                <div style={{ wordBreak: 'break-word' }}>
                                  {msg.text}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div ref={chatScrollEndRef} />
                  </div>

                  {/* Chat Input Controls */}
                  <div
                    style={{
                      background: '#fff',
                      padding: '12px 16px',
                      borderTop: '1px solid #e0e0e0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Action Buttons: Send Image & Upload File */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        ref={chatImageInputRef}
                        style={{ display: 'none' }}
                        onChange={handleSendImage}
                      />
                      <button
                        type="button"
                        onClick={() => chatImageInputRef.current?.click()}
                        style={{
                          background: '#e8f5e9',
                          color: '#2e7d32',
                          border: '1px solid #c8e6c9',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        📷 Send Image
                      </button>

                      <input
                        type="file"
                        accept="*/*"
                        ref={chatFileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleUploadFile}
                      />
                      <button
                        type="button"
                        onClick={() => chatFileInputRef.current?.click()}
                        style={{
                          background: '#e3f2fd',
                          color: '#1565c0',
                          border: '1px solid #bbdefb',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        📎 Upload File
                      </button>
                    </div>

                    {/* Text Input Row */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder={`Message ${chatPartner}... (Press Enter)`}
                        className="modern-input"
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          fontSize: '0.9rem',
                          borderRadius: '10px',
                          border: '1px solid #c8e6c9'
                        }}
                        value={chatInputText}
                        onChange={e => setChatInputText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSendTextMessage();
                        }}
                      />

                      <button
                        onClick={handleSendTextMessage}
                        disabled={!chatInputText.trim()}
                        style={{
                          background: chatInputText.trim() ? 'linear-gradient(135deg, #2e7d32, #43a047)' : '#ccc',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: chatInputText.trim() ? 'pointer' : 'default',
                          transition: 'background 0.2s'
                        }}
                      >
                        Send 🚀
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* FULL-SCREEN IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            padding: '20px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              ✕
            </button>
            <img
              src={previewImage}
              alt="Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
