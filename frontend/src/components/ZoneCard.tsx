import React, { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { TrendIndicator } from './TrendIndicator';
import { MLPanel } from './MLPanel';
export interface Zone {
  id: number;
  name: string;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  is_active: boolean;
  fire_raw?: number;
  gas_raw?: number;
  water_raw?: number;
  pir_raw?: boolean;
  risk_score?: number;
  trend?: 'INSUFFICIENT_DATA' | 'TRENDING_UP' | 'TRENDING_DOWN' | 'STABLE';
  ml_prob?: number;
}

export function ZoneCard({ zone }: { zone: Zone }) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isCritical = zone.status === 'CRITICAL';
  
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
      // The WS will automatically push the state change to us!
    } catch (err) {
      console.error("Failed to override zone", err);
      alert("Override failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-panel ${isCritical ? 'animate-pulse-red' : ''}`} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{zone.name}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className={`status-indicator status-${zone.status.toLowerCase()}`}>
            <div className="status-dot"></div>
            {zone.status}
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              disabled={loading}
            >
              ⚙️
            </button>
            
            {showMenu && (
              <div className="glass-panel" style={{ 
                position: 'absolute', 
                right: 0, 
                top: '100%', 
                zIndex: 10, 
                minWidth: '200px', 
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <div>🔥 Fire: {zone.fire_raw !== undefined ? zone.fire_raw.toFixed(1) : '-'}</div>
        <div>💨 Gas: {zone.gas_raw !== undefined ? zone.gas_raw.toFixed(1) : '-'}</div>
        <div>💧 Water: {zone.water_raw !== undefined ? zone.water_raw.toFixed(1) : '-'}</div>
        <div>🏃 PIR: {zone.pir_raw !== undefined ? (zone.pir_raw ? 'YES' : 'NO') : '-'}</div>
      </div>
      
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Risk Score</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <TrendIndicator trend={zone.trend} />
          <span style={{ fontWeight: 'bold', color: isCritical ? 'var(--color-critical)' : 'inherit' }}>
            {zone.risk_score !== undefined ? zone.risk_score.toFixed(1) : '-'}
          </span>
        </div>
      </div>
      
      <MLPanel prob={zone.ml_prob} />
    </div>
  );
}
