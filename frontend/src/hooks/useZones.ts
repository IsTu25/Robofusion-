import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DashboardWebSocket } from '@/lib/ws';
import { useAuth } from '@/context/AuthContext';

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

export function useZones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    let mounted = true;
    
    // 1. Initial Fetch
    const loadInitialZones = async () => {
      try {
        const data = await fetchApi('/api/zones/');
        if (mounted) setZones(data.zones);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load zones');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialZones();
    
    return () => {
      mounted = false;
    }
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

  return { zones, loading, error };
}
