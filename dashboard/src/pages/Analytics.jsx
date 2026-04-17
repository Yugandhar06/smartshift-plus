import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SS } from '../utils/shared';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/analytics/', {
          headers: {
            'Authorization': `Bearer ${SS.get('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Analytics fetch failed');
        }
        
        const responseData = await response.json();
        if (responseData && responseData.chart_data) {
          setData(responseData.chart_data);
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={{ padding: '30px', color: '#e8eaf0' }}>Loading real-time analytics...</div>;

  return (
    <div style={{ padding: '30px', color: '#e8eaf0' }}>
      <h1 style={{ margin: 0, color: '#fff', fontSize: '24px', marginBottom: '24px' }}> Analytics Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        <div style={{ padding: '24px', background: '#0f1117', border: '1px solid #22262e', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0, color: '#adb5bd', fontSize: '16px', fontWeight: '500', marginBottom: '20px' }}>Weekly Revenue vs Payouts</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22262e" />
                <XAxis dataKey="name" stroke="#5a6070" tick={{ fill: '#adb5bd' }} />
                <YAxis stroke="#5a6070" tick={{ fill: '#adb5bd' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#22262e', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line type="monotone" dataKey="revenue" name="Total Revenue" stroke="#8884d8" strokeWidth={3} dot={{ r: 4, fill: '#8884d8' }} activeDot={{ r: 8 }} />     
                <Line type="monotone" dataKey="payouts" name="Total Payouts" stroke="#00e676" strokeWidth={3} dot={{ r: 4, fill: '#00e676' }} activeDot={{ r: 8 }} />     
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ padding: '24px', background: '#0f1117', border: '1px solid #22262e', borderRadius: '10px' }}>
          <h3 style={{ marginTop: 0, color: '#adb5bd', fontSize: '16px', fontWeight: '500', marginBottom: '20px' }}>Plan Distribution Chart</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22262e" />
                <XAxis dataKey="name" stroke="#5a6070" tick={{ fill: '#adb5bd' }} />
                <YAxis stroke="#5a6070" tick={{ fill: '#adb5bd' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#22262e', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} cursor={{ fill: '#22262e', opacity: 0.4 }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Revenue Volume" fill="#8884d8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payouts" name="Payout Volume" fill="#00e676" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
