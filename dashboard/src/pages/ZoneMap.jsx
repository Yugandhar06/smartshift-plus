import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ZoneMap() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    // Poll every 15 seconds
    const fetchZones = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/zones/scores');
        setZones(response.data);
      } catch (error) {
        console.error("Error fetching zones:", error);
      }
    };

    const interval = setInterval(fetchZones, 15000);
    fetchZones();
    return () => clearInterval(interval);
  }, []);

  const getColor = (score) => {
    if (score <= 30) return '#4CAF50';  // Green
    if (score <= 60) return '#FFC107';  // Yellow
    if (score <= 80) return '#F44336';  // Red
    return '#000000';                    // Black
  };

  return (
    <div className="zone-map" style={{ padding: '20px' }}>
      <h1>Live Zone SafarScore</h1>
      <div className="zones-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {zones.map(zone => (
          <div 
            key={zone.id}
            className="zone-card"
            style={{ 
              padding: '15px', 
              border: '1px solid #ddd', 
              borderRadius: '8px',
              cursor: 'pointer',
              borderLeft: `5px solid ${getColor(zone.score)}` 
            }}
            onClick={() => setSelectedZone(zone)}
          >
            <h3>{zone.name}</h3>
            <div className="score" style={{ fontSize: '24px', fontWeight: 'bold' }}>{zone.score}</div>
            <div className="timestamp" style={{ fontSize: '12px', color: '#666' }}>
              {new Date(zone.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {selectedZone && (
        <div className="signal-breakdown" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h2>{selectedZone.name} - Signal Breakdown</h2>
          <ul>
            <li>Rainfall: {selectedZone.signals?.rainfall || 0}mm/hr (20% weight)</li>
            <li>AQI: {selectedZone.signals?.aqi || 0} (15% weight)</li>
            <li>Order Volume Drop: {selectedZone.signals?.order_drop || 0}% (15% weight)</li>
            {/* Additional signals can be added here */}
          </ul>
        </div>
      )}
    </div>
  );
}
