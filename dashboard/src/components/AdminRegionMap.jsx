import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CITY_AREAS } from '../constants/locations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function AdminRegionMap() {
  const [city, setCity] = useState('Bangalore');
  const [area, setArea] = useState('Indiranagar');
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([12.9784, 77.6408]); // Default Indiranagar
  const [editingRider, setEditingRider] = useState(null);
  const [newRider, setNewRider] = useState({ name: '', phone: '', platform: 'swiggy' });
  const [showAddRider, setShowAddRider] = useState(false);

  // Storm Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTime, setSimTime] = useState("");
  const [simPayouts, setSimPayouts] = useState(0);
  const [simScore, setSimScore] = useState(30);
  const [simActive, setSimActive] = useState(false);

  const startStormSimulation = () => {
    if (isSimulating || simActive) return;
    setIsSimulating(true);
    setSimActive(true);
    setSimTime("18:00 (Start)");
    setSimPayouts(0);
    setSimScore(30);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress === 10) { setSimTime("18:30"); setSimScore(48); } // Yellow
      if (progress === 30) { setSimTime("19:00"); setSimScore(65); setSimPayouts(12); } // Red
      if (progress === 50) { setSimTime("19:30"); setSimScore(85); setSimPayouts(84); } // Extreme Black
      if (progress === 70) { setSimTime("20:00"); setSimScore(72); setSimPayouts(145); } // Red
      if (progress === 90) { setSimTime("21:00"); setSimScore(45); setSimPayouts(158); } // Yellow
      if (progress >= 100) { 
        setSimTime("22:00 (End)"); 
        setSimScore(30); 
        setSimPayouts(162);
        setIsSimulating(false); 
        clearInterval(interval); 
        setTimeout(() => { setSimActive(false); }, 5000);
      }
    }, 1000); 
  };

  const fetchAreaRiders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/admin/raiders-by-area?city=${encodeURIComponent(city)}&area=${encodeURIComponent(area)}`);  
      const fetchedRiders = response.data.workers || [];

      // Geocode area center via OpenStreetMap
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(area + ', ' + city + ', India')}&limit=1`);
      
      let centerLat = 12.9784;
      let centerLng = 77.6408;
      
      if (geoRes.data && geoRes.data.length > 0) {
        centerLat = parseFloat(geoRes.data[0].lat);
        centerLng = parseFloat(geoRes.data[0].lon);
        setMapCenter([centerLat, centerLng]);
      }

      // Add random scatter to riders around the center so they don't overlap on the map
      const scatteredRiders = fetchedRiders.map((r, i) => {
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lngOffset = (Math.random() - 0.5) * 0.01;
        return {
          ...r,
          lat: centerLat + latOffset,
          lng: centerLng + lngOffset
        };
      });

      setRiders(scatteredRiders);
    } catch (err) {
      console.error("Error fetching regional riders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreaRiders();
  }, [city, area]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rider?')) return;
    try {
      await axios.delete(`http://localhost:8000/api/admin/raiders/${id}`);
      fetchAreaRiders();
    } catch (e) {
      console.error('Failed to delete rider', e);
    }
  };

  const handleUpdate = async (id) => {
    try {
      await axios.put(`http://localhost:8000/api/admin/raiders/${id}?name=${editingRider.name}&phone=${editingRider.phone}&platform=${editingRider.platform}&city=${city}&area=${area}`);
      setEditingRider(null);
      fetchAreaRiders();
    } catch (e) {
      console.error('Failed to update rider', e);
    }
  };

  const handleAdd = async () => {
    if (!newRider.name || !newRider.phone) return alert('Name and phone required');
    try {
      await axios.post(`http://localhost:8000/api/admin/raiders?name=${newRider.name}&phone=${newRider.phone}&platform=${newRider.platform}&city=${city}&area=${area}`);
      setNewRider({ name: '', phone: '', platform: 'swiggy' });
      setShowAddRider(false);
      fetchAreaRiders();
    } catch (e) {
      console.error('Failed to add rider', e);
      alert(e.response?.data?.detail || 'Failed to add rider');
    }
  };

  // Transform data for chart if any
  const platformData = [
    { name: 'Swiggy', count: riders.filter(r => r.platform?.toLowerCase() === 'swiggy').length },
    { name: 'Zomato', count: riders.filter(r => r.platform?.toLowerCase() === 'zomato').length },
    { name: 'Zepto', count: riders.filter(r => r.platform?.toLowerCase() === 'zepto').length },
    { name: 'Other', count: riders.filter(r => !['swiggy', 'zomato', 'zepto'].includes(r.platform?.toLowerCase())).length }
  ].filter(p => p.count > 0);

  return (
    <div style={{ background: '#0a1a0a', padding: '24px', borderRadius: '12px', border: '1px solid #22262e', marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', margin: 0 }}>Regional Fleet</h3>
            <button 
              onClick={startStormSimulation}
              disabled={isSimulating}
              style={{ background: isSimulating ? '#5a6070' : '#b388ff', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: isSimulating ? 'not-allowed' : 'pointer', fontSize: '12px', boxShadow: isSimulating ? 'none' : '0 0 10px #b388ff40' }}
            >
              {isSimulating ? 'Simulating Storm...' : 'Simulate Storm'}
            </button>
          </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            style={{ padding: '8px 12px', borderRadius: '6px', background: '#0f1117', border: '1px solid #22262e', color: '#e8eaf0', outline: 'none' }}
            value={city} 
            onChange={(e) => {
              setCity(e.target.value);
              setArea(CITY_AREAS[e.target.value][0]); // Reset to first area of selected city
            }}
          >
            {Object.keys(CITY_AREAS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            style={{ padding: '8px 12px', borderRadius: '6px', background: '#0f1117', border: '1px solid #22262e', color: '#e8eaf0', outline: 'none' }}
            value={area} 
            onChange={(e) => setArea(e.target.value)}
          >
            {CITY_AREAS[city].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        
        {/* The Live Map (Main Content) */}
          <div style={{ flex: 1, borderRadius: '10px', overflow: 'hidden', border: '1px solid #22262e', minHeight: '550px', position: 'relative' }}>
          
          {simActive && (
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000, background: '#0a1a0a', padding: '16px', borderRadius: '12px', border: '1px solid #332244', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '220px' }}>
              <div style={{ color: '#adb5bd', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Simulated Time</span>
                <span className="blinking-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5252', display: 'inline-block' }}></span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>{simTime}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ color: '#5a6070', fontSize: '13px' }}>Zone Score:</div>
                <div style={{ color: simScore > 80 ? '#b388ff' : simScore > 60 ? '#ff5252' : '#ffb300', fontWeight: 'bold' }}>{simScore} / 100</div>
              </div>
              <div style={{ background: '#0f1117', padding: '12px', borderRadius: '8px' }}>
                <div style={{ color: '#adb5bd', fontSize: '11px', marginBottom: '4px' }}>Weather Payouts</div>
                <div style={{ fontSize: '20px', color: '#00e676', fontWeight: 'bold' }}>{simPayouts.toLocaleString()} <span style={{fontSize: '12px', color: '#5a6070', fontWeight: 'normal'}}>Processed</span></div>
              </div>
            </div>
          )}

           <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
             <TileLayer
               attribution='&copy; OpenStreetMap'
               url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
             />
             <MapUpdater center={mapCenter} />
               {simActive && (
                 <Circle
                   center={mapCenter}
                   radius={3000}
                   pathOptions={{
                     color: simScore > 60 ? (simScore > 80 ? '#b388ff' : '#ff5252') : '#ffb300',
                     fillColor: simScore > 60 ? (simScore > 80 ? '#b388ff' : '#ff5252') : '#ffb300',
                     fillOpacity: 0.4
                   }}
                 />
               )}
             {riders.map((r, idx) => (
               <Marker key={idx} position={[r.lat, r.lng]}>
                 <Popup>
                   <div style={{color: '#000'}}>
                     <strong>{r.name}</strong><br/>
                     Platform: {r.platform}<br/>
                     Phone: {r.phone}
                   </div>
                 </Popup>
               </Marker>
             ))}
           </MapContainer>
        </div>

        {/* Sidebar container */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Top: Summary Panel */}
          <div style={{ background: '#0f1117', padding: '20px', borderRadius: '10px', border: '1px solid #22262e' }}>
          <div style={{ color: '#5a6070', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Active Riders in Area</div>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00e676', lineHeight: 1 }}>{loading ? '...' : riders.length}</div>
          
          {platformData.length > 0 && (
            <div style={{ marginTop: '30px', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#5a6070" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5a6070" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#22262e' }} 
                    contentStyle={{ background: '#0a1a0a', border: '1px solid #22262e', color: '#fff', borderRadius: '8px' }} 
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                    {platformData.map((entry, index) => {
                      const colors = { Swiggy: '#ffb300', Zomato: '#ff5252', Zepto: '#b388ff', Other: '#00e676' };
                      return <Cell key={`cell-${index}`} fill={colors[entry.name] || '#00e676'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        </div>{/* End Sidebar container width 380px */}
      </div>{/* End the Flex row that held the Map and the Sidebar */}

      {/* ----------------- Detailed Roster List Moved to Bottom ----------------- */}
      <div style={{ background: '#0f1117', padding: '20px', borderRadius: '10px', border: '1px solid #22262e', marginTop: '20px', display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ color: '#5a6070', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Detailed Roster</div>
              <button 
                onClick={() => setShowAddRider(!showAddRider)}
                style={{ background: '#00e676', color: '#0a1a0a', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                + ADD
              </button>
            </div>
            
            {showAddRider && (
              <div style={{ background: '#0a1a0a', padding: '12px', borderRadius: '8px', border: '1px solid #22262e', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="text" placeholder="Name" value={newRider.name} onChange={e => setNewRider({...newRider, name: e.target.value})} style={{ padding: '6px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', borderRadius: '4px' }} />
                <input type="text" placeholder="Phone" value={newRider.phone} onChange={e => setNewRider({...newRider, phone: e.target.value})} style={{ padding: '6px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', borderRadius: '4px' }} />
                <select value={newRider.platform} onChange={e => setNewRider({...newRider, platform: e.target.value})} style={{ padding: '6px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', borderRadius: '4px' }}>
                  <option value="swiggy">Swiggy</option>
                  <option value="zomato">Zomato</option>
                  <option value="zepto">Zepto</option>
                </select>
                <button onClick={handleAdd} style={{ background: '#00e676', color: '#0a1a0a', border: 'none', borderRadius: '4px', padding: '6px', fontWeight: 'bold', cursor: 'pointer' }}>SAVE</button>
              </div>
            )}

            {loading ? (
              <div style={{ color: '#adb5bd', fontSize: '14px' }}>Loading riders...</div>
            ) : riders.length === 0 ? (
              <div style={{ color: '#5a6070', fontSize: '14px', paddingTop: '20px', textAlign: 'center' }}>No riders registered for {area}, {city} yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {riders.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#0a1a0a', borderRadius: '8px', border: '1px solid #22262e' }}>
                    {editingRider?.id === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <input type="text" value={editingRider.name} onChange={e => setEditingRider({...editingRider, name: e.target.value})} style={{ padding: '4px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', fontSize: '12px' }} />
                        <input type="text" value={editingRider.phone} onChange={e => setEditingRider({...editingRider, phone: e.target.value})} style={{ padding: '4px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', fontSize: '12px' }} />
                        <select value={editingRider.platform} onChange={e => setEditingRider({...editingRider, platform: e.target.value})} style={{ padding: '4px', background: '#0f1117', border: '1px solid #22262e', color: '#fff', fontSize: '12px' }}>
                          <option value="swiggy">Swiggy</option>
                          <option value="zomato">Zomato</option>
                          <option value="zepto">Zepto</option>
                        </select>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button onClick={() => handleUpdate(r.id)} style={{ background: '#00e676', border: 'none', borderRadius: '2px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', color: '#0a1a0a' }}></button>
                          <button onClick={() => setEditingRider(null)} style={{ background: '#ff5252', border: 'none', borderRadius: '2px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer', color: '#0a1a0a' }}></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{r.name || 'Unnamed Rider'}</div>
                          <div style={{ color: '#5a6070', fontSize: '12px' }}>{r.phone}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                          <div style={{ padding: '4px 8px', borderRadius: '4px', background: r.platform?.toLowerCase() === 'swiggy' ? '#ffa00020' : r.platform?.toLowerCase() === 'zomato' ? '#ff525220' : '#b388ff20', color: r.platform?.toLowerCase() === 'swiggy' ? '#ffb300' : r.platform?.toLowerCase() === 'zomato' ? '#ff5252' : '#b388ff', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {r.platform || 'Unknown'}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span onClick={() => setEditingRider(r)} style={{ color: '#00e676', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Edit</span>
                            <span onClick={() => handleDelete(r.id)} style={{ color: '#ff5252', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Delete</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

    </div>
  );
}




