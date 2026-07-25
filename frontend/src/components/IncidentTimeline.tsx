"use client";

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

interface Incident {
  id: number;
  zone_id: number;
  zone_name: string;
  severity: 'WARNING' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  hazard_types: string[];
  risk_score_at_trigger: number;
  triggered_at: string;
  resolved_at: string | null;
}

export function IncidentTimeline() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const LIMIT = 20;

  const loadIncidents = async (currentOffset: number, append: boolean = false) => {
    try {
      const data = await fetchApi(`/api/incidents?limit=${LIMIT}&offset=${currentOffset}`);
      if (append) {
        setIncidents(prev => [...prev, ...data.incidents]);
      } else {
        setIncidents(data.incidents);
      }
      setHasMore(data.has_more);
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents(0);
  }, []);

  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);
    loadIncidents(nextOffset, true);
  };

  if (loading && incidents.length === 0) return <div style={{ color: 'var(--text-secondary)' }}>Loading history...</div>;
  if (error) return <div style={{ color: 'var(--color-critical)' }}>Error: {error}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {incidents.map(inc => (
        <div key={inc.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div className={`status-indicator status-${inc.severity.toLowerCase()}`}>
                <div className="status-dot"></div>
                {inc.severity}
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {new Date(inc.triggered_at).toLocaleString()}
              </span>
            </div>
            
            <h4 style={{ margin: '0 0 4px 0' }}>{inc.zone_name}</h4>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Hazards: {inc.hazard_types.join(', ')} | Peak Risk: {inc.risk_score_at_trigger.toFixed(1)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '0.75rem', 
              fontWeight: 'bold',
              background: inc.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: inc.status === 'RESOLVED' ? 'var(--color-safe)' : 'var(--color-warning)'
            }}>
              {inc.status}
            </div>
            {inc.resolved_at && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Resolved: {new Date(inc.resolved_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
      
      {hasMore && (
        <button 
          onClick={handleLoadMore} 
          className="glass-button" 
          style={{ alignSelf: 'center', marginTop: '16px' }}
        >
          Load More
        </button>
      )}
    </div>
  );
}
