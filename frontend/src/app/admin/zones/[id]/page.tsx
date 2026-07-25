"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { fetchApi } from "@/lib/api";

export default function ZoneSettingsPage({ params }: { params: { id: string } }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  
  const [zoneName, setZoneName] = useState('');
  const [thresholdGas, setThresholdGas] = useState<number>(300.0);
  const [thresholdFire, setThresholdFire] = useState<number>(0.5);
  const [thresholdWater, setThresholdWater] = useState<number>(300.0);
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || role !== 'admin')) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, role, router]);

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      const loadZone = async () => {
        try {
          const data = await fetchApi(`/api/zones/${params.id}`);
          setZoneName(data.name);
          setThresholdGas(data.threshold_gas);
          setThresholdFire(data.threshold_fire);
          setThresholdWater(data.threshold_water);
        } catch (err: any) {
          setError(err.message || 'Failed to load zone');
        } finally {
          setLoadingData(false);
        }
      };
      loadZone();
    }
  }, [isAuthenticated, role, params.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      await fetchApi(`/api/zones/${params.id}/thresholds`, {
        method: 'PUT',
        body: JSON.stringify({
          threshold_gas: thresholdGas,
          threshold_fire: thresholdFire,
          threshold_water: thresholdWater
        })
      });
      alert('Thresholds updated successfully! The Risk Engine will use these new values immediately.');
      router.push('/admin/zones');
    } catch (err: any) {
      setError(err.message || 'Failed to update thresholds');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !isAuthenticated || role !== 'admin') {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1>Settings: {zoneName || `Zone ${params.id}`}</h1>
          <button onClick={() => router.push('/admin/zones')} className="glass-button">Back</button>
        </header>

        <div className="glass-panel" style={{ padding: '32px', maxWidth: '600px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Sensor Thresholds</h3>
          
          {error && <div style={{ color: 'var(--color-critical)', marginBottom: '16px' }}>{error}</div>}
          
          {loadingData ? (
            <div style={{ color: 'var(--text-secondary)' }}>Loading zone settings...</div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Gas Warning Threshold (Raw Value)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  className="glass-input" 
                  value={thresholdGas}
                  onChange={(e) => setThresholdGas(parseFloat(e.target.value))}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Default: 300.0</div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Fire Probability Threshold (0.0 to 1.0)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  max="1"
                  className="glass-input" 
                  value={thresholdFire}
                  onChange={(e) => setThresholdFire(parseFloat(e.target.value))}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Default: 0.5</div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Water Level Warning Threshold (Raw Value)
                </label>
                <input 
                  type="number" 
                  step="0.1"
                  className="glass-input" 
                  value={thresholdWater}
                  onChange={(e) => setThresholdWater(parseFloat(e.target.value))}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Default: 300.0</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="submit" className="glass-button primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Thresholds'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
