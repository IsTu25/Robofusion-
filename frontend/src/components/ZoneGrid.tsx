"use client";

import React, { useEffect, useState } from 'react';
import { ZoneCard, Zone } from './ZoneCard';
import { fetchApi } from '@/lib/api';
import { DashboardWebSocket } from '@/lib/ws';
import { useAuth } from '@/context/AuthContext';

export function ZoneGrid() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    // 1. Initial Fetch
    const loadInitialZones = async () => {
      try {
        const data = await fetchApi('/api/zones/');
        setZones(data.zones);
      } catch (err: any) {
        setError(err.message || 'Failed to load zones');
      } finally {
        setLoading(false);
      }
    };

    loadInitialZones();
  }, []);

  useEffect(() => {
    if (!token) return;

    // 2. Setup WebSocket
    const ws = new DashboardWebSocket(token);
    
    const unsubscribe = ws.subscribe((message) => {
      if (message.type === 'READING_PROCESSED') {
        setZones(prev => prev.map(z => 
          z.id === message.zone_id 
            ? { 
                ...z, 
                fire_raw: message.fire_raw, 
                gas_raw: message.gas_raw, 
                water_raw: message.water_raw, 
                pir_raw: message.pir_raw,
                risk_score: message.risk_score,
                status: message.status
              }
            : z
        ));
      } else if (message.type === 'ZONE_STATUS_CHANGED') {
        setZones(prev => prev.map(z => 
          z.id === message.zone_id 
            ? { ...z, status: message.new_status, risk_score: message.risk_score }
            : z
        ));
      } else if (message.type === 'ML_PREDICTION') {
        setZones(prev => prev.map(z => 
          z.id === message.zone_id 
            ? { ...z, ml_prob: message.critical_probability }
            : z
        ));
      }
    });

    ws.connect();

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, [token]);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading grid...</div>;
  if (error) return <div style={{ color: 'var(--color-critical)' }}>Error: {error}</div>;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '24px'
    }}>
      {zones.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)' }}>No zones found.</div>
      ) : (
        zones.map(zone => (
          <ZoneCard key={zone.id} zone={zone} />
        ))
      )}
    </div>
  );
}
