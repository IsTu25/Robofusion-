import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { TrendIndicator } from './TrendIndicator';
import { MLPanel } from './MLPanel';
import { Zone } from './ZoneCard';

export function ZoneModal({ zone, onClose }: { zone: Zone, onClose: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isCritical = zone.status === 'CRITICAL';

  // Function to map zone name to image
  const getZoneImage = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('iot')) return '/iot_lab.png';
    if (lower.includes('server')) return '/server_room.png';
    if (lower.includes('data')) return '/data_science_lab.png';
    return '/iot_lab.png'; // Fallback
  };
  
  const handleOverride = async (duration: number) => {
    setLoading(true);
    setShowMenu(false);
    try {
      await fetchApi(`/api/zones/${zone.id}/override`, {
        method: 'POST',
        body: JSON.stringify({
          duration_minutes: duration,
          target_status: 'SAFE'
        })
      });
    } catch (err) {
      console.error("Failed to override zone", err);
      alert("Override failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${isCritical ? 'animate-pulse-red' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Image */}
        <div style={{
          height: '260px',
          backgroundImage: `url(${getZoneImage(zone.name)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          boxShadow: 'inset 0 -50px 50px -20px rgba(10,14,23,1)'
        }}>
          <button 
            onClick={onClose}
            className="glass-button"
            style={{
              position: 'absolute', top: '24px', right: '24px',
              padding: '0', width: '40px', height: '40px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', backdropFilter: 'blur(10px)', zIndex: 20
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{zone.name}</h2>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div className={`status-indicator status-${zone.status.toLowerCase()}`}>
                <div className="status-dot" style={{ width: '12px', height: '12px' }}></div>
                <span style={{ fontSize: '1.1rem' }}>{zone.status}</span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', fontSize: '1.4rem' }}
                  disabled={loading}
                  title="Override Actions"
                >
                  ⚙️
                </button>
                
                {showMenu && (
                  <div className="glass-panel" style={{ 
                    position: 'absolute', right: 0, top: '100%', zIndex: 10, minWidth: '200px', 
                    padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px' }}>Manual Override</div>
                    <button className="glass-button" onClick={() => handleOverride(15)} style={{ textAlign: 'left', fontSize: '0.85rem', padding: '6px 8px' }}>
                      Force SAFE (15m)
                    </button>
                    <button className="glass-button" onClick={() => handleOverride(60)} style={{ textAlign: 'left', fontSize: '0.85rem', padding: '6px 8px' }}>
                      Force SAFE (60m)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Sensor Grid */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', 
            background: 'rgba(255,255,255,0.02)', padding: '24px', 
            borderRadius: '16px', border: '1px solid var(--border-color)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Fire Signal</span>
              <span style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '600' }}>{zone.fire_raw != null ? zone.fire_raw.toFixed(1) : '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💨 Gas Conc.</span>
              <span style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '600' }}>{zone.gas_raw != null ? zone.gas_raw.toFixed(1) : '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💧 Water Lvl</span>
              <span style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '600' }}>{zone.water_raw != null ? zone.water_raw.toFixed(1) : '-'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏃 Occupancy</span>
              <span style={{ fontSize: '1.5rem', color: zone.pir_raw ? 'var(--color-critical)' : '#fff', fontWeight: '600' }}>{zone.pir_raw != null ? (zone.pir_raw ? 'DETECTED' : 'CLEAR') : '-'}</span>
            </div>
          </div>
          
          {/* Risk Score Row */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.3rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Comprehensive Risk Score</span>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <TrendIndicator trend={zone.trend} />
              <span style={{ fontWeight: 'bold', fontSize: '1.8rem', color: isCritical ? 'var(--color-critical)' : 'inherit' }}>
                {zone.risk_score != null ? zone.risk_score.toFixed(1) : '-'}
              </span>
            </div>
          </div>
          
          <MLPanel prob={zone.ml_prob} />
        </div>
      </div>
    </div>
  );
}
