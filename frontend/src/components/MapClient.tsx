"use client";

import React, { useState } from 'react';
import { useZones } from '@/hooks/useZones';
import { ZoneModal } from './ZoneModal';

export function MapClient() {
  const { zones, loading, error } = useZones();
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading map...</div>;
  if (error) return <div style={{ color: 'var(--color-critical)' }}>Error: {error}</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SAFE': return 'rgba(16, 185, 129, 0.2)';
      case 'WARNING': return 'rgba(245, 158, 11, 0.3)';
      case 'CRITICAL': return 'rgba(239, 68, 68, 0.4)';
      default: return 'rgba(100, 116, 139, 0.1)';
    }
  };

  const getStatusStroke = (status: string) => {
    switch (status) {
      case 'SAFE': return 'rgba(16, 185, 129, 0.8)';
      case 'WARNING': return 'rgba(245, 158, 11, 0.8)';
      case 'CRITICAL': return 'rgba(239, 68, 68, 1)';
      default: return 'rgba(100, 116, 139, 0.5)';
    }
  };

  const getZone = (id: number) => zones.find(z => z.id === id);

  return (
    <div className="glass-panel" style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '600px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
      
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Campus Blueprint</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Live interactive 2D map. Click any room for detailed telemetry.</p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
          {/* Background outline */}
          <rect x="50" y="50" width="700" height="400" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" rx="8" />
          
          {/* Corridor lines */}
          <line x1="350" y1="50" x2="350" y2="450" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
          <line x1="50" y1="250" x2="350" y2="250" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />

          {/* Zone 1: IoT Lab */}
          {(() => {
            const z = getZone(1);
            const status = z?.status || 'OFFLINE';
            const color = getStatusColor(status);
            const stroke = getStatusStroke(status);
            const isCrit = status === 'CRITICAL';
            return (
              <g onClick={() => setSelectedZoneId(1)} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} className={isCrit ? 'animate-pulse-red' : ''}>
                <rect x="52" y="52" width="296" height="196" fill={color} stroke={stroke} strokeWidth="2" rx="4" />
                <text x="200" y="140" fill="white" fontSize="22" fontWeight="600" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{z?.name || 'IoT Lab'}</text>
                <text x="200" y="165" fill={stroke} fontSize="14" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{status}</text>
              </g>
            );
          })()}

          {/* Zone 3: Data Science Lab */}
          {(() => {
            const z = getZone(3);
            const status = z?.status || 'OFFLINE';
            const color = getStatusColor(status);
            const stroke = getStatusStroke(status);
            const isCrit = status === 'CRITICAL';
            return (
              <g onClick={() => setSelectedZoneId(3)} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} className={isCrit ? 'animate-pulse-red' : ''}>
                <rect x="52" y="252" width="296" height="196" fill={color} stroke={stroke} strokeWidth="2" rx="4" />
                <text x="200" y="340" fill="white" fontSize="22" fontWeight="600" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{z?.name || 'Data Science Lab'}</text>
                <text x="200" y="365" fill={stroke} fontSize="14" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{status}</text>
              </g>
            );
          })()}

          {/* Zone 2: Server Room */}
          {(() => {
            const z = getZone(2);
            const status = z?.status || 'OFFLINE';
            const color = getStatusColor(status);
            const stroke = getStatusStroke(status);
            const isCrit = status === 'CRITICAL';
            return (
              <g onClick={() => setSelectedZoneId(2)} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} className={isCrit ? 'animate-pulse-red' : ''}>
                <rect x="352" y="52" width="396" height="396" fill={color} stroke={stroke} strokeWidth="2" rx="4" />
                <text x="550" y="240" fill="white" fontSize="26" fontWeight="600" textAnchor="middle" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{z?.name || 'Server Room'}</text>
                <text x="550" y="270" fill={stroke} fontSize="16" fontWeight="bold" textAnchor="middle" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{status}</text>
              </g>
            );
          })()}
        </svg>
      </div>

      {selectedZoneId && getZone(selectedZoneId) && (
        <ZoneModal 
          zone={getZone(selectedZoneId)!} 
          onClose={() => setSelectedZoneId(null)} 
        />
      )}
    </div>
  );
}
