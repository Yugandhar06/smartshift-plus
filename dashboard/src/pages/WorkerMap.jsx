import React from 'react';
import WorkerWeatherWidget from '../components/WorkerWeatherWidget';
import './WorkerApp.css';

export default function WorkerMap() {
  return (
    <div className="worker-app-wrapper" style={{ padding: '24px' }}>
      <div className="greeting" style={{ marginBottom: '24px' }}>
        <h2>Regional Environment & Maps</h2>
        <p>Live weather and routing updates for your selected area.</p>
      </div>
      <WorkerWeatherWidget />
    </div>
  );
}
