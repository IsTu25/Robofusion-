"use client";

import React, { useEffect, useState } from 'react';
import { ZoneCard } from './ZoneCard';
import { ZoneModal } from './ZoneModal';
import { fetchApi } from '@/lib/api';

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
import { useZones } from '@/hooks/useZones';

export function ZoneGrid() {
  const { zones, loading, error } = useZones();
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  if (loading) return <div style={{ color: 'var(--text-secondary)' }}>Loading grid...</div>;
  if (error) return <div style={{ color: 'var(--color-critical)' }}>Error: {error}</div>;

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '32px'
      }}>
        {zones.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)' }}>No zones found.</div>
        ) : (
          zones.map(zone => (
            <ZoneCard 
              key={zone.id} 
              zone={zone} 
              onClick={(z) => setSelectedZoneId(z.id)} 
            />
          ))
        )}
      </div>

      {selectedZoneId && (
        <ZoneModal 
          zone={zones.find(z => z.id === selectedZoneId)!} 
          onClose={() => setSelectedZoneId(null)} 
        />
      )}
    </>
  );
}
