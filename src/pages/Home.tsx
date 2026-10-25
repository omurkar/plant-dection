import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunPlantFact } from '../api/gemini';
import { getEcoScore } from '../services/ecoScoreService';
import { fetchLiveWeather, getCachedWeather, type LiveWeatherInfo } from '../services/weatherService';
import '../App.css';

const Home = () => {
  const navigate = useNavigate();
  const [funFact, setFunFact] = useState("Loading amazing plant fact...");
  const [weather, setWeather] = useState<LiveWeatherInfo>(getCachedWeather());
  const ecoRecord = getEcoScore();

  useEffect(() => {
    fetchLiveWeather().then(setWeather).catch(() => {});
  }, []);

  // 2. Add this useEffect to run the timer
  useEffect(() => {
    // Function to fetch the fact
    const fetchNewFact = async () => {
      const fact = await getFunPlantFact();
      if (fact) setFunFact(fact);
    };

    // Run immediately on load
    fetchNewFact();

    // Run every 15 seconds (15000 milliseconds)
    const intervalId = setInterval(fetchNewFact, 15000);

    // Cleanup when leaving the page (stops the timer)
    return () => clearInterval(intervalId);
  }, []);

  return (
    // 🟢 UPDATED MAIN CONTAINER WITH BACKGROUND IMAGE
    <div className="home-page" style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.8)), url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=2000&q=80')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed', // Keeps background in place while scrolling
      minHeight: '100vh'
    }}>
      {/* Navbar Section */}
      <nav className="navbar">
        <div className="logo"><h2>🌿 PlantScan</h2></div>
        <div className="nav-links">
          <a href="/home">Home</a>
          <a href="/indoor">Indoor</a>
          <a href="/outdoor">Outdoor</a>
          <a href="/scan">Scan</a>
          <a href="/community">Community</a>
          <a href="/settings">Settings</a>
        </div>
      </nav>

      {/* Header Section */}
      <header className="header-section">
        <h1>Plant Disease Identification</h1>
        <p>Identify sick plants by leaf pictures instantly.</p>
      </header>

      {/* Main Cards Section with Click Handlers */}
      <section className="category-container">

        {/* Card 1: Indoor */}
        <div className="plant-card" onClick={() => navigate('/indoor')}>
          <img
            src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80"
            alt="Indoor Plants"
          />
          <div className="card-content">
            <h3>Indoor Sanctuary</h3>
            <p>Discover the best indoor plants for your home aesthetics.</p>
          </div>
        </div>

        {/* Card 2: Outdoor */}
        <div className="plant-card" onClick={() => navigate('/outdoor')}>
          <img
            src="https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=600&q=80"
            alt="Outdoor Plants"
          />
          <div className="card-content">
            <h3>Outdoor Garden</h3>
            <p>Explore outdoor gardening tips and landscaping ideas.</p>
          </div>
        </div>

        {/* Card 3: Scan */}
        <div className="plant-card" onClick={() => navigate('/scan')}>
          <img
            src="https://cdn.mos.cms.futurecdn.net/p7mVFaT7RAN4eknmo9bZgh.jpg"
            alt="Scan Plant"
          />
          <div className="card-content">
            <h3>Scan Disease</h3>
            <p>Use your camera to scan and detect plant diseases in real-time.</p>
          </div>
        </div>

        {/* Add a 4th card for Community */}
        <div className="plant-card" onClick={() => navigate('/community')}>
          <img
            src="https://images.unsplash.com/photo-1504714146340-959ca07e1f38?auto=format&fit=crop&w=600&q=80"
            alt="Community"
          />
          <div className="card-content">
            <h3>🌍 Eco Community</h3>
            <p>Join plant swaps, map biodiversity, and track your eco-score.</p>
          </div>
        </div>

      </section>

      {/* --- ECO SCORE + WEATHER BANNER --- */}
      <section style={{ maxWidth: '800px', margin: '0 auto 20px', padding: '0 20px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: 1,
            minWidth: '220px',
            background: weather.isRain
              ? 'linear-gradient(135deg,#1565c0,#1976d2)'
              : weather.isExtremelyHot
              ? 'linear-gradient(135deg,#d84315,#f57c00)'
              : 'linear-gradient(135deg,#2e7d32,#43a047)',
            color: '#fff',
            borderRadius: '14px',
            padding: '14px 20px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.12)'
          }}
          onClick={() => navigate('/community')}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{weather.icon}</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {weather.isRain ? 'Skip Watering Today' : weather.isExtremelyHot ? 'Intense Heat • Water Early' : 'Good Day to Water'}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '3px' }}>
            {weather.condition} • {weather.locationName}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '220px', background: 'linear-gradient(135deg,#f57f17,#ffa000)', color: '#fff', borderRadius: '14px', padding: '14px 20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(245,127,23,0.25)' }} onClick={() => navigate('/community')}>
          <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🏆</div>
          <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{ecoRecord.score} pts</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            {ecoRecord.badges.length > 0 ? ecoRecord.badges[ecoRecord.badges.length - 1] : 'Start earning eco points!'}
          </div>
        </div>
      </section>

      {/* --- FUN FACT SECTION (Updated to Automatic) --- */}
      <section className="fun-facts-section">
        <div className="fun-fact-container" style={{
          margin: '20px auto',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#2e7d32' }}>Did you know?</h3>

          <div style={{
            background: '#e8f5e9', // Kept the card background solid for readability
            padding: '20px',
            borderRadius: '15px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.5s ease',
            marginTop: '15px'
          }}>
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🌱</span>
            <span style={{ fontSize: '1.1rem', color: '#1b5e20', fontWeight: '500' }}>
              {funFact}
            </span>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;