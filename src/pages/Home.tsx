import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunPlantFact } from '../api/gemini'; // Import the API function
import '../App.css';

const Home = () => {
  const navigate = useNavigate();

  // 1. Create state for the fact
  const [funFact, setFunFact] = useState("Loading amazing plant fact...");

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