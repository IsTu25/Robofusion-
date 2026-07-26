import { useEffect, useState, useCallback, useRef } from 'react';
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
  const wsConnected = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reusable fetch function
  const refreshZones = useCallback(async () => {
    try {
      const data = await fetchApi('/api/zones/');
      if (data?.zones) {
        setZones(data.zones);
      }
    } catch (err: any) {
      console.warn('Zone poll failed:', err.message);
    }
  }, []);

  // 1. Initial Fetch + Polling fallback
  useEffect(() => {
    let mounted = true;

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

    // Always poll every 3 seconds as a safety net.
    // This guarantees the dashboard stays fresh even if WS is dead.
    pollTimer.current = setInterval(() => {
      if (mounted) {
        refreshZones();
      }
    }, 3000);

    return () => {
      mounted = false;
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [refreshZones]);

  // 2. WebSocket for instant updates (supplements polling)
  useEffect(() => {
    if (!token) return;

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
