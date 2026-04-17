import React, { useState, useEffect } from 'react';
import { SS } from '../utils/shared';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet marker icon issue in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13);
  }, [center, map]);
  return null;
}

export default function WorkerWeatherWidget() {
  const [weatherData, setWeatherData] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);

  const city = SS.get('city') || 'Bangalore';
  const area = SS.get('area') || 'Koramangala';

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        let lat = 12.9716;
        let lng = 77.5946;

        // 1. Get Lat/Lng for the real area via OpenStreetMap Geocoding
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(area + ', ' + city + ', India')}&limit=1`);
        const geoData = await geoRes.json();

        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
          setMapCenter([lat, lng]);
        }

        // 2. Fetch current weather and hourly forecast using OpenWeather API
        // For production, the API Key should be securely managed or injected via process.env.REACT_APP_OPENWEATHER_API_KEY
        // Using mock data directly to prevent 401 Unauthorized errors in console for demo.

        // Fallback to mock data for presentation
        setWeatherData({
          temp: 26,
          windspeed: 12.5,
          condition: "Clouds",
          humidity: 65,
          desc: "broken clouds (Mocked API)"
        });

        // Generate realistic mock hourly data for the chart
        const mockForecast = [];
        for(let i=0; i<5; i++) {
           const dateObj = new Date();
           dateObj.setHours(dateObj.getHours() + i * 3);
           mockForecast.push({
             time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             temp: 26 + Math.round(Math.sin(i) * 3),
             rainPop: 15 + (i * 10)
           });
        }
        setHourlyForecast(mockForecast);

        // NOTE: we returned early to use mock data for demo since openweather will throw 401 error
        return;
      } catch (err) {
        console.error("Failed to fetch weather", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [city, area]);

  if (loading) {
    return <div style={{ background: '#0a1a0a', padding: '16px', borderRadius: '12px', border: '1px solid #113311', color: '#00e676', fontSize: '13px', marginBottom: '20px' }}>Loading real-time environment data for {area}, {city}...</div>; 
  }

  if (!weatherData) return null;

  return (
    <div style={{ background: '#0a1a0a', padding: '20px', borderRadius: '12px', border: '1px solid #113311', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(300px, 1.5fr)', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ color: '#00e676', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>Local Environment</div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>{area}, {city}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              {weatherData.temp}°C
            </div>
            <div style={{ color: '#00e676', fontSize: '13px', textTransform: 'capitalize', marginBottom: '2px' }}>
              {weatherData.desc}
            </div>
            <div style={{ color: '#adb5bd', fontSize: '12px' }}>
              Wind: {weatherData.windspeed} m/s • Hum: {weatherData.humidity}%
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '140px', marginTop: '10px' }}>       
          <div style={{ color: '#adb5bd', fontSize: '12px', marginBottom: '8px' }}>Temperature Forecast</div>
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <LineChart data={hourlyForecast} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
              <XAxis dataKey="time" stroke="#5a6070" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#5a6070" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#0f1117', border: '1px solid #22262e', borderRadius: '8px', color: '#fff' }} />
              <Line type="monotone" dataKey="temp" stroke="#00e676" strokeWidth={2} dot={{ r: 3, fill: '#0a1a0a', stroke: '#00e676', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* The Live Regional Map */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>Live Regional Map</div>
        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #113311', flex: 1, minHeight: '300px' }}>
           <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
             <TileLayer
               attribution='&copy; OpenStreetMap'
               url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
             />
             <MapUpdater center={mapCenter} />
             <Marker position={mapCenter}>
               <Popup>
                 <div style={{color: '#000'}}>
                   <strong>Your Zone: {area}</strong><br/>
                   {city}
                 </div>
               </Popup>
             </Marker>
           </MapContainer>
        </div>
      </div>
    </div>
  );
}
