import React from 'react';
import { Zone } from './ZoneGrid'; // Will export Zone from ZoneGrid

export function ZoneCard({ zone, onClick }: { zone: Zone, onClick: (zone: Zone) => void }) {
  const isCritical = zone.status === 'CRITICAL';
  
  // Function to map zone name to image
  const getZoneImage = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('iot')) return '/iot_lab.png';
    if (lower.includes('server')) return '/server_room.png';
    if (lower.includes('data')) return '/data_science_lab.png';
    return '/iot_lab.png'; // Fallback
  };

  return (
    <div 
      className={`image-card ${isCritical ? 'animate-pulse-red' : ''}`} 
      onClick={() => onClick(zone)}
      style={{
        backgroundImage: `url(${getZoneImage(zone.name)})`,
      }}
    >
      <div className="image-card-footer">
        <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
          {zone.name}
        </h3>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className={`status-indicator status-${zone.status.toLowerCase()}`} style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '20px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="status-dot"></div>
            {zone.status}
          </div>
        </div>
      </div>
    </div>
  );
}
